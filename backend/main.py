"""
NEM Bid Analyser — FastAPI backend.

All endpoints return JSON.  The React frontend calls these from localhost:8000.
CORS is open to localhost:5173 (Vite dev server).

Startup sequence:
  1. Initialise SQLite database
  2. Trigger background data sync for last 2 days
  3. Schedule nightly sync at 06:00 AEST (previous day's data is published ~05:00)
"""

import logging
import os
import sys
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure backend directory is on path for relative imports
sys.path.insert(0, str(Path(__file__).parent))

from database import init_db, get_connection
from config import GENERATORS, DUID_MAP, ALL_DUIDS, TARGET_REGIONS, FUEL_COLOURS

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger(__name__)


# ── Startup / shutdown ────────────────────────────────────────────────────────

def _background_sync(days_back: int = 2):
    """Download and process the last `days_back` trading days of data."""
    from processors import prices, bids, scada, dispatch
    from analyzers import rebid, bid_success

    today = date.today()
    for i in range(days_back, 0, -1):
        target = today - timedelta(days=i)
        log.info("Syncing data for %s", target)
        try:
            prices.ingest_date(target)
            bids.ingest_date(target)
            scada.ingest_date(target)
            dispatch.ingest_date(target)
            rebid.analyse_day(target)
            bid_success.compute_all_units(target)
        except Exception as e:
            log.error("Sync failed for %s: %s", target, e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # Fire-and-forget initial sync in background thread
    import threading
    t = threading.Thread(target=_background_sync, args=(2,), daemon=True)
    t.start()
    yield


app = FastAPI(
    title="NEM Bid Analyser",
    description="Australian National Electricity Market bid analysis platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helper ────────────────────────────────────────────────────────────────────

def _parse_date(date_str: Optional[str]) -> date:
    if not date_str:
        return date.today() - timedelta(days=1)
    try:
        return date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(400, f"Invalid date format: {date_str}. Use YYYY-MM-DD.")


def _rows_to_dicts(rows) -> list[dict]:
    return [dict(r) for r in rows]


# ── Reference / metadata endpoints ───────────────────────────────────────────

@app.get("/api/generators")
def list_generators():
    """Return all tracked generators with metadata."""
    result = []
    for station, meta in GENERATORS.items():
        result.append({
            "station":    station,
            "participant": meta["participant"],
            "region":     meta["region"],
            "fuel":       meta["fuel"],
            "technology": meta["technology"],
            "capacity_mw": meta["registered_capacity_mw"],
            "duids":      meta["duids"],
            "colour":     FUEL_COLOURS.get(meta["fuel"], "#6B7280"),
        })
    return result


@app.get("/api/generators/{duid}")
def get_generator(duid: str):
    """Return metadata for a single DUID."""
    meta = DUID_MAP.get(duid.upper())
    if not meta:
        raise HTTPException(404, f"DUID {duid} not tracked")
    return {"duid": duid.upper(), **meta}


# ── Price endpoints ───────────────────────────────────────────────────────────

@app.get("/api/prices")
def get_prices(
    region: str = Query("NSW1", enum=TARGET_REGIONS),
    date: Optional[str] = Query(None, description="YYYY-MM-DD, defaults to yesterday"),
):
    """5-min dispatch prices for a region on a trading day."""
    d = _parse_date(date)
    conn = get_connection()
    rows = conn.execute("""
        SELECT settlement_date, rrp, raise6sec_rrp, raise60sec_rrp, raise5min_rrp
        FROM dispatch_price
        WHERE region_id = ?
          AND substr(settlement_date,1,10) LIKE ?
        ORDER BY settlement_date
    """, (region, d.strftime("%Y-%m-%d") + "%")).fetchall()
    conn.close()
    return _rows_to_dicts(rows)


@app.get("/api/prices/summary")
def get_price_summary(
    region: str = Query("NSW1"),
    days: int = Query(7, ge=1, le=90),
):
    """Daily RRP summary (min/max/avg/spikes) for a region over last N days."""
    end = date.today() - timedelta(days=1)
    start = end - timedelta(days=days - 1)
    conn = get_connection()
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
    """, (region, start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))).fetchall()
    conn.close()
    return _rows_to_dicts(rows)


# ── Generator performance endpoints ──────────────────────────────────────────

@app.get("/api/performance/daily")
def get_daily_performance(
    date: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    duid: Optional[str] = Query(None),
):
    """Analytics summary for all (or one) unit on a trading day."""
    d = _parse_date(date)
    conn = get_connection()
    filters = ["trading_date = ?"]
    params: list = [d.isoformat()]
    if region:
        filters.append("region_id = ?")
        params.append(region)
    if duid:
        filters.append("duid = ?")
        params.append(duid.upper())
    where = " AND ".join(filters)
    rows = conn.execute(f"SELECT * FROM analytics_unit_day WHERE {where} ORDER BY actual_revenue DESC", params).fetchall()
    conn.close()
    return _rows_to_dicts(rows)


@app.get("/api/performance/timeline/{duid}")
def get_unit_timeline(
    duid: str,
    date: Optional[str] = Query(None),
):
    """
    Interval-by-interval dispatch/bid/price data for one unit on one day.
    This is the data that powers the 'what could I have done better' chart.
    """
    d = _parse_date(date)
    duid = duid.upper()
    from analyzers.bid_success import get_unit_timeline
    timeline = get_unit_timeline(duid, d)
    if not timeline:
        raise HTTPException(404, f"No data for {duid} on {d.isoformat()}")
    return timeline


@app.get("/api/performance/trend/{duid}")
def get_unit_trend(
    duid: str,
    days: int = Query(30, ge=7, le=90),
):
    """Daily analytics trend for a unit over N days."""
    duid = duid.upper()
    end = date.today() - timedelta(days=1)
    start = end - timedelta(days=days - 1)
    conn = get_connection()
    rows = conn.execute("""
        SELECT * FROM analytics_unit_day
        WHERE duid = ?
          AND trading_date BETWEEN ? AND ?
        ORDER BY trading_date
    """, (duid, start.isoformat(), end.isoformat())).fetchall()
    conn.close()
    return _rows_to_dicts(rows)


# ── Bid stack endpoints ───────────────────────────────────────────────────────

@app.get("/api/bids/{duid}")
def get_bids(
    duid: str,
    date: Optional[str] = Query(None),
):
    """Return the bid price bands and availability for a unit on a trading day."""
    d = _parse_date(date)
    duid = duid.upper()
    conn = get_connection()

    price_bands = conn.execute("""
        SELECT * FROM bid_price_band
        WHERE duid = ? AND bid_type = 'ENERGY'
          AND substr(settlement_date,1,10) LIKE ?
        ORDER BY offer_datetime DESC
        LIMIT 1
    """, (duid, d.strftime("%Y-%m-%d") + "%")).fetchone()

    avail_history = conn.execute("""
        SELECT offer_datetime, max_avail,
               band_avail1, band_avail2, band_avail3, band_avail4, band_avail5,
               band_avail6, band_avail7, band_avail8, band_avail9, band_avail10
        FROM bid_offer
        WHERE duid = ? AND bid_type = 'ENERGY'
          AND substr(settlement_date,1,10) LIKE ?
        ORDER BY offer_datetime
    """, (duid, d.strftime("%Y-%m-%d") + "%")).fetchall()

    conn.close()

    if not price_bands and not avail_history:
        raise HTTPException(404, f"No bid data for {duid} on {d.isoformat()}")

    # Build structured bid stack
    bands = []
    if price_bands:
        for i in range(1, 11):
            price = price_bands[f"price_band{i}"]
            avail = avail_history[-1][f"band_avail{i}"] if avail_history else None
            if price is not None:
                bands.append({"band": i, "price": price, "mw": avail or 0})

    return {
        "duid": duid,
        "date": d.isoformat(),
        "offer_datetime": dict(price_bands)["offer_datetime"] if price_bands else None,
        "bid_stack": bands,
        "availability_history": _rows_to_dicts(avail_history),
    }


# ── Rebid endpoints ───────────────────────────────────────────────────────────

@app.get("/api/rebids")
def get_rebids(
    date: Optional[str] = Query(None),
    duid: Optional[str] = Query(None),
    classification: Optional[str] = Query(None),
):
    """Return rebid events with enriched analysis."""
    d = _parse_date(date)
    conn = get_connection()
    filters = ["date(settlement_date) = ?"]
    params: list = [d.isoformat()]
    if duid:
        filters.append("duid = ?")
        params.append(duid.upper())
    if classification:
        filters.append("classification = ?")
        params.append(classification.lower())
    where = " AND ".join(filters)
    rows = conn.execute(
        f"SELECT * FROM rebid_event WHERE {where} ORDER BY rebid_at", params
    ).fetchall()
    conn.close()

    enriched = []
    for r in _rows_to_dicts(rows):
        meta = DUID_MAP.get(r["duid"], {})
        enriched.append({**r, **{"station": meta.get("station",""), "participant": meta.get("participant","")}})
    return enriched


@app.get("/api/rebids/summary")
def get_rebid_summary(days: int = Query(30, ge=1, le=90)):
    """Rebid frequency and classification breakdown over N days."""
    end = date.today() - timedelta(days=1)
    start = end - timedelta(days=days - 1)
    conn = get_connection()
    rows = conn.execute("""
        SELECT
            duid,
            COUNT(*) as total_rebids,
            SUM(CASE WHEN classification='strategic' THEN 1 ELSE 0 END) as strategic,
            SUM(CASE WHEN classification='operational' THEN 1 ELSE 0 END) as operational,
            SUM(CASE WHEN classification='ambiguous' THEN 1 ELSE 0 END) as ambiguous,
            AVG(rrp_5min_after) as avg_rrp_after_rebid
        FROM rebid_event
        WHERE date(settlement_date) BETWEEN ? AND ?
        GROUP BY duid
        ORDER BY total_rebids DESC
    """, (start.isoformat(), end.isoformat())).fetchall()
    conn.close()

    result = []
    for r in _rows_to_dicts(rows):
        meta = DUID_MAP.get(r["duid"], {})
        result.append({**r, "station": meta.get("station",""), "participant": meta.get("participant","")})
    return result


# ── Narrative / AI analysis endpoint ─────────────────────────────────────────

@app.get("/api/narrative/{duid}")
def get_narrative(
    duid: str,
    date: Optional[str] = Query(None),
    focus: str = Query("all", enum=["all", "revenue", "rebids", "trends"]),
):
    """
    Generate a Claude narrative analysis for a unit on a trading day.
    This call hits the Claude API and may take 5-15 seconds.
    """
    d = _parse_date(date)
    duid = duid.upper()

    from analyzers.bid_success import get_unit_timeline
    from analyzers.narrative import generate_narrative

    timeline = get_unit_timeline(duid, d)
    narrative = generate_narrative(duid, d, timeline, focus=focus)

    return {
        "duid": duid,
        "date": d.isoformat(),
        "focus": focus,
        "narrative": narrative,
        "generated_at": datetime.now().isoformat(),
    }


# ── Data management endpoints ─────────────────────────────────────────────────

@app.post("/api/sync")
def trigger_sync(
    background_tasks: BackgroundTasks,
    days_back: int = Query(1, ge=1, le=7),
):
    """Manually trigger a data sync for the last N days."""
    background_tasks.add_task(_background_sync, days_back)
    return {"status": "sync started", "days_back": days_back}


@app.get("/api/status")
def get_status():
    """Return database status and last ingest times per report type."""
    conn = get_connection()
    counts = {}
    for table in ["dispatch_price", "dispatch_scada", "bid_offer", "bid_price_band",
                  "dispatch_unit_solution", "rebid_event", "analytics_unit_day"]:
        row = conn.execute(f"SELECT COUNT(*) as n FROM {table}").fetchone()
        counts[table] = row["n"]

    last_ingests = conn.execute("""
        SELECT report_type, MAX(ingested_at) as last_ingest, SUM(rows_loaded) as total_rows
        FROM ingest_log GROUP BY report_type
    """).fetchall()
    conn.close()

    return {
        "table_counts": counts,
        "last_ingests": _rows_to_dicts(last_ingests),
        "db_path": str(get_connection().execute("PRAGMA database_list").fetchone()[2]),
    }


@app.get("/api/leaderboard")
def get_leaderboard(
    date: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    metric: str = Query("actual_revenue", enum=[
        "actual_revenue", "revenue_efficiency_pct", "dispatch_rate_pct",
        "intervals_price_setter", "total_energy_mwh"
    ]),
):
    """Rankings of tracked generators by a performance metric for a trading day."""
    d = _parse_date(date)
    conn = get_connection()
    filters = ["trading_date = ?"]
    params: list = [d.isoformat()]
    if region:
        filters.append("region_id = ?")
        params.append(region)
    where = " AND ".join(filters)
    rows = conn.execute(
        f"SELECT * FROM analytics_unit_day WHERE {where} ORDER BY {metric} DESC",
        params
    ).fetchall()
    conn.close()

    result = []
    for rank, r in enumerate(_rows_to_dicts(rows), 1):
        meta = DUID_MAP.get(r["duid"], {})
        result.append({
            "rank": rank,
            **r,
            "station": meta.get("station", r["duid"]),
            "participant": meta.get("participant", ""),
            "fuel": meta.get("fuel", ""),
        })
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
