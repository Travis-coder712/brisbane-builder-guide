"""
Static data builder for GitHub Pages deployment.

Run by GitHub Actions daily to:
  1. Download yesterday's NEMWeb data
  2. Run the analysis pipeline
  3. Export everything as JSON into public/data/

The React frontend reads these JSON files on GitHub Pages instead of
calling the local FastAPI backend.
"""

import json
import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from database import init_db, get_connection
from config import GENERATORS, DUID_MAP, ALL_DUIDS, FUEL_COLOURS, TARGET_REGIONS

OUT = ROOT / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)


def dump(filename: str, data):
    path = OUT / filename
    path.write_text(json.dumps(data, default=str), encoding="utf-8")
    print(f"  wrote {filename} ({path.stat().st_size // 1024}KB)")


def run():
    print("=== NEM Static Data Builder ===")
    init_db()

    today = date.today()
    yesterday = today - timedelta(days=1)

    # ── 1. Download & ingest ──────────────────────────────────────────────────
    print(f"\n[1/3] Downloading NEMWeb data for {yesterday} …")
    from processors import prices, bids, dispatch, scada
    from analyzers import rebid, bid_success

    try:
        prices.ingest_date(yesterday)
        print("  prices OK")
    except Exception as e:
        print(f"  prices FAILED: {e}")

    try:
        bids.ingest_date(yesterday)
        print("  bids OK")
    except Exception as e:
        print(f"  bids FAILED: {e}")

    try:
        dispatch.ingest_date(yesterday)
        print("  dispatch OK")
    except Exception as e:
        print(f"  dispatch FAILED: {e}")

    try:
        scada.ingest_date(yesterday)
        print("  scada OK")
    except Exception as e:
        print(f"  scada FAILED: {e}")

    # ── 2. Run analysers ──────────────────────────────────────────────────────
    print(f"\n[2/3] Running analysers …")
    try:
        rebid.analyse_day(yesterday)
        print("  rebid analysis OK")
    except Exception as e:
        print(f"  rebid FAILED: {e}")

    n = bid_success.compute_all_units(yesterday)
    print(f"  bid_success OK — {n} unit-day rows")

    # ── 3. Export JSON ────────────────────────────────────────────────────────
    print(f"\n[3/3] Exporting JSON to public/data/ …")
    conn = get_connection()

    date_str = yesterday.isoformat()

    # Generators list
    generators = []
    for station, meta in GENERATORS.items():
        generators.append({
            "station":     station,
            "participant": meta["participant"],
            "region":      meta["region"],
            "fuel":        meta["fuel"],
            "technology":  meta["technology"],
            "capacity_mw": meta["registered_capacity_mw"],
            "duids":       meta["duids"],
            "colour":      FUEL_COLOURS.get(meta["fuel"], "#6B7280"),
        })
    dump("generators.json", generators)

    # Prices — yesterday for each region
    for region in TARGET_REGIONS:
        rows = conn.execute("""
            SELECT settlement_date, rrp, raise6sec_rrp, raise60sec_rrp, raise5min_rrp
            FROM dispatch_price
            WHERE region_id = ? AND substr(settlement_date,1,10) = ?
            ORDER BY settlement_date
        """, (region, date_str)).fetchall()
        dump(f"prices-{region}.json", [dict(r) for r in rows])

    # Price summary — last 7 days
    for region in TARGET_REGIONS:
        rows = conn.execute("""
            SELECT
                substr(settlement_date,1,10) as trading_date,
                MIN(rrp) as min_rrp,
                MAX(rrp) as max_rrp,
                ROUND(AVG(rrp),2) as avg_rrp,
                COUNT(CASE WHEN rrp > 300 THEN 1 END) as spike_intervals,
                COUNT(CASE WHEN rrp = -1000 THEN 1 END) as floor_intervals
            FROM dispatch_price
            WHERE region_id = ?
              AND substr(settlement_date,1,10) BETWEEN ? AND ?
            GROUP BY trading_date
            ORDER BY trading_date
        """, (region, (yesterday - timedelta(days=6)).isoformat(), date_str)).fetchall()
        dump(f"prices-summary-{region}.json", [dict(r) for r in rows])

    # Leaderboard — yesterday all regions
    rows = conn.execute("""
        SELECT * FROM analytics_unit_day
        WHERE trading_date = ?
        ORDER BY actual_revenue DESC
    """, (date_str,)).fetchall()
    lb = []
    for rank, r in enumerate([dict(x) for x in rows], 1):
        meta = DUID_MAP.get(r["duid"], {})
        lb.append({
            "rank": rank, **r,
            "station":     meta.get("station", r["duid"]),
            "participant": meta.get("participant", ""),
            "fuel":        meta.get("fuel", ""),
        })
    dump("leaderboard.json", lb)

    # Rebids — yesterday
    rows = conn.execute("""
        SELECT * FROM rebid_event
        WHERE date(settlement_date) = ?
        ORDER BY rebid_at
    """, (date_str,)).fetchall()
    enriched = []
    for r in [dict(x) for x in rows]:
        meta = DUID_MAP.get(r["duid"], {})
        enriched.append({**r, "station": meta.get("station",""), "participant": meta.get("participant","")})
    dump("rebids.json", enriched)

    # Rebid summary — last 30 days
    rows = conn.execute("""
        SELECT duid,
               COUNT(*) as total_rebids,
               SUM(CASE WHEN classification='strategic' THEN 1 ELSE 0 END) as strategic,
               SUM(CASE WHEN classification='operational' THEN 1 ELSE 0 END) as operational,
               SUM(CASE WHEN classification='ambiguous' THEN 1 ELSE 0 END) as ambiguous,
               AVG(rrp_5min_after) as avg_rrp_after_rebid
        FROM rebid_event
        WHERE date(settlement_date) BETWEEN ? AND ?
        GROUP BY duid ORDER BY total_rebids DESC
    """, ((yesterday - timedelta(days=29)).isoformat(), date_str)).fetchall()
    rs = []
    for r in [dict(x) for x in rows]:
        meta = DUID_MAP.get(r["duid"], {})
        rs.append({**r, "station": meta.get("station",""), "participant": meta.get("participant","")})
    dump("rebids-summary.json", rs)

    # Per-DUID: timeline, bids, trends
    from analyzers.bid_success import get_unit_timeline

    for duid in ALL_DUIDS:
        # Timeline
        try:
            timeline = get_unit_timeline(duid, date_str)
            if timeline:
                dump(f"timeline-{duid}.json", timeline)
        except Exception as e:
            print(f"  timeline {duid} FAILED: {e}")

        # Bid stack
        price_band = conn.execute("""
            SELECT * FROM bid_price_band
            WHERE duid = ? AND bid_type = 'ENERGY'
              AND substr(settlement_date,1,10) = ?
            ORDER BY offer_datetime DESC LIMIT 1
        """, (duid, date_str)).fetchone()

        avail_history = conn.execute("""
            SELECT offer_datetime, max_avail,
                   band_avail1,band_avail2,band_avail3,band_avail4,band_avail5,
                   band_avail6,band_avail7,band_avail8,band_avail9,band_avail10
            FROM bid_offer
            WHERE duid = ? AND bid_type = 'ENERGY'
              AND substr(settlement_date,1,10) = ?
            ORDER BY offer_datetime
        """, (duid, date_str)).fetchall()

        if price_band or avail_history:
            bands = []
            if price_band:
                pb = dict(price_band)
                ah = dict(avail_history[-1]) if avail_history else {}
                for i in range(1, 11):
                    price = pb.get(f"price_band{i}")
                    avail = ah.get(f"band_avail{i}", 0)
                    if price is not None:
                        bands.append({"band": i, "price": price, "mw": avail or 0})
            dump(f"bids-{duid}.json", {
                "duid": duid,
                "date": date_str,
                "offer_datetime": dict(price_band)["offer_datetime"] if price_band else None,
                "bid_stack": bands,
                "availability_history": [dict(r) for r in avail_history],
            })

        # Trend (7 days)
        rows = conn.execute("""
            SELECT * FROM analytics_unit_day
            WHERE duid = ? AND trading_date BETWEEN ? AND ?
            ORDER BY trading_date
        """, (duid, (yesterday - timedelta(days=6)).isoformat(), date_str)).fetchall()
        if rows:
            dump(f"trends-{duid}.json", [dict(r) for r in rows])

    conn.close()

    # Snapshot metadata (used by frontend status page)
    dump("snapshot.json", {
        "last_updated": today.isoformat(),
        "latest_date":  date_str,
        "duid_count":   len(ALL_DUIDS),
        "mode":         "static",
    })

    print(f"\n=== Done — all data for {date_str} written to public/data/ ===")


if __name__ == "__main__":
    run()
