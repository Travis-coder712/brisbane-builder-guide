"""
Rebid analyser.

A "rebid" in NEM terms is when a participant resubmits their BIDDAYOFFER or
BIDPEROFFER after the initial submission deadline.  Under NER clause 3.8.22,
rebids must be accompanied by a reason that is NOT commercially motivated
(the "non-commercial" rebid rule).

AEMO defines a "late" rebid as one submitted within 15 minutes of real-time.

This analyser:
  1. Detects rebids by comparing successive BIDDAYOFFER records for the same
     DUID / trading day (offer_datetime changes = rebid occurred)
  2. Cross-references rebid timing against P5MIN price forecasts available
     at that moment (was a price spike already visible in P5MIN?)
  3. Cross-references against actual RRP outcome (did price spike after rebid?)
  4. Classifies:
       'strategic'   — rebid within 15 min of dispatch, P5MIN showed spike,
                       RRP outcome confirms spike, availability changed upward
       'operational' — availability changed downward (unit constraint / trip)
       'ambiguous'   — timing or price correlation unclear

NEM RULE CONTEXT:
  Clause 3.8.22(b): A scheduled generator must not submit a rebid for a
  commercial reason (to take advantage of price movements).  AEMO and the
  AER monitor rebids for potential rule breaches.  High price + late rebid
  + availability increase = red flag pattern.
"""

import logging
from datetime import date, datetime, timedelta

from database import get_connection
from config import DUID_MAP, ALL_DUIDS

log = logging.getLogger(__name__)

# Thresholds for classification
SPIKE_THRESHOLD_RRP = 300        # $/MWh — above this = price spike event
LATE_REBID_WINDOW_MIN = 15       # minutes before dispatch = "late" rebid
P5MIN_LEAD_THRESHOLD = 0.7       # P5MIN must show >$300 in ≥70% of forecasts to flag


def detect_rebids(trading_date: date) -> list[dict]:
    """
    Compare successive bid submissions for each DUID on a trading day.
    Returns list of detected rebid events.
    """
    conn = get_connection()
    rebids = []

    for duid in ALL_DUIDS:
        # Get all bid submissions for this duid/date, ordered by offer_datetime
        bids = conn.execute("""
            SELECT offer_datetime, max_avail, band_avail1, band_avail2,
                   band_avail3, band_avail4, band_avail5, band_avail6,
                   band_avail7, band_avail8, band_avail9, band_avail10,
                   settlement_date
            FROM bid_offer
            WHERE duid = ? AND bid_type = 'ENERGY'
              AND substr(settlement_date, 1, 10) LIKE ?
            ORDER BY offer_datetime
        """, (duid, trading_date.strftime("%Y/%m/%d") + "%")).fetchall()

        if len(bids) < 2:
            continue  # no rebid occurred

        for i in range(1, len(bids)):
            prev = bids[i - 1]
            curr = bids[i]
            if curr["offer_datetime"] == prev["offer_datetime"]:
                continue  # same offer time = not a rebid

            prior_avail = prev["max_avail"] or 0.0
            new_avail   = curr["max_avail"] or 0.0
            avail_delta = new_avail - prior_avail

            rebids.append({
                "settlement_date":   curr["settlement_date"],
                "duid":              duid,
                "bid_type":          "ENERGY",
                "rebid_at":          curr["offer_datetime"],
                "prior_max_avail":   prior_avail,
                "new_max_avail":     new_avail,
                "avail_delta":       round(avail_delta, 2),
            })

    conn.close()
    return rebids


def enrich_rebid(rebid: dict) -> dict:
    """
    Add RRP context and P5MIN forecast to a detected rebid, then classify it.
    """
    conn = get_connection()
    duid = rebid["duid"]
    region = DUID_MAP.get(duid, {}).get("region", "NSW1")

    rebid_dt_str = rebid["rebid_at"]
    try:
        rebid_dt = datetime.strptime(rebid_dt_str, "%Y/%m/%d %H:%M:%S")
    except ValueError:
        try:
            rebid_dt = datetime.strptime(rebid_dt_str, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            conn.close()
            return rebid

    # RRP at time of rebid
    rebid_row = conn.execute("""
        SELECT rrp FROM dispatch_price
        WHERE region_id = ?
          AND settlement_date >= ?
        ORDER BY settlement_date
        LIMIT 1
    """, (region, rebid_dt_str)).fetchone()
    rrp_at_rebid = rebid_row["rrp"] if rebid_row else None

    # RRP 5 min after rebid
    dt_plus5 = (rebid_dt + timedelta(minutes=5)).strftime("%Y/%m/%d %H:%M:%S")
    next_row = conn.execute("""
        SELECT rrp FROM dispatch_price
        WHERE region_id = ? AND settlement_date >= ?
        ORDER BY settlement_date LIMIT 1
    """, (region, dt_plus5)).fetchone()
    rrp_5min_after = next_row["rrp"] if next_row else None

    # P5MIN forecasts that were available when the rebid was made
    p5min_rows = conn.execute("""
        SELECT rrp FROM p5min_price
        WHERE region_id = ?
          AND run_datetime <= ?
          AND interval_datetime > ?
          AND interval_datetime <= ?
        ORDER BY run_datetime DESC, interval_datetime
        LIMIT 6
    """, (region, rebid_dt_str, rebid_dt_str,
          (rebid_dt + timedelta(minutes=30)).strftime("%Y/%m/%d %H:%M:%S"))
    ).fetchall()

    p5min_prices = [r["rrp"] for r in p5min_rows if r["rrp"] is not None]
    p5min_spike_share = (
        sum(1 for p in p5min_prices if p > SPIKE_THRESHOLD_RRP) / len(p5min_prices)
        if p5min_prices else 0
    )
    p5min_forecast = max(p5min_prices) if p5min_prices else None

    conn.close()

    # Classification logic
    avail_increased = (rebid.get("avail_delta", 0) or 0) > 0
    avail_decreased = (rebid.get("avail_delta", 0) or 0) < 0
    spike_confirmed = (rrp_5min_after or 0) > SPIKE_THRESHOLD_RRP
    p5min_signalled = p5min_spike_share >= P5MIN_LEAD_THRESHOLD

    if avail_decreased:
        classification = "operational"  # unit withdrew capacity — likely constraint/trip
    elif avail_increased and (p5min_signalled or spike_confirmed):
        classification = "strategic"    # pushed up availability ahead of known spike
    else:
        classification = "ambiguous"

    price_spike_flagged = 1 if classification == "strategic" else 0

    return {
        **rebid,
        "rrp_at_rebid":         rrp_at_rebid,
        "rrp_5min_after":       rrp_5min_after,
        "p5min_price_forecast": p5min_forecast,
        "price_spike_flagged":  price_spike_flagged,
        "classification":       classification,
    }


def analyse_day(trading_date: date) -> int:
    """Detect, enrich, and persist all rebid events for a trading day."""
    raw_rebids = detect_rebids(trading_date)
    if not raw_rebids:
        return 0

    conn = get_connection()
    # Clear existing rebids for this day so we can re-run idempotently
    conn.execute(
        "DELETE FROM rebid_event WHERE date(settlement_date) = ?",
        (trading_date.isoformat(),)
    )

    written = 0
    for rebid in raw_rebids:
        enriched = enrich_rebid(rebid)
        conn.execute("""
            INSERT INTO rebid_event
                (settlement_date, duid, bid_type, rebid_at,
                 prior_max_avail, new_max_avail,
                 rrp_at_rebid, rrp_5min_after, p5min_price_forecast,
                 price_spike_flagged, classification)
            VALUES
                (:settlement_date, :duid, :bid_type, :rebid_at,
                 :prior_max_avail, :new_max_avail,
                 :rrp_at_rebid, :rrp_5min_after, :p5min_price_forecast,
                 :price_spike_flagged, :classification)
        """, enriched)
        written += 1

    conn.commit()
    conn.close()
    log.info("Rebids: wrote %d events for %s", written, trading_date)
    return written
