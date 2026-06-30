"""
Bid success analyser.

Three dimensions of success per NER framework:

1. REVENUE EFFICIENCY
   For each 5-min interval:
     actual_revenue   = total_cleared_MW × RRP × (5/60)
     max_possible_rev = availability_MW  × RRP × (5/60)   [if fully dispatched at RRP]
   Daily revenue_efficiency = sum(actual) / sum(max_possible) × 100

2. DISPATCH RATE
   dispatch_rate = intervals_with_cleared > 0 / intervals_with_availability > 0

3. PRICE SETTER FREQUENCY
   A unit is a price setter when its marginal_value > 0 in dispatch_unit_solution,
   or when the RRP matches any of its bid band prices within tolerance.

All results written to analytics_unit_day for fast dashboard queries.
"""

import logging
from datetime import date, timedelta

from database import get_connection
from config import DUID_MAP, ALL_DUIDS

log = logging.getLogger(__name__)

PRICE_SETTER_TOLERANCE = 0.01  # $/MWh rounding tolerance


def compute_unit_day(trading_date, duid: str) -> dict | None:
    """Compute all success metrics for one unit on one trading day."""
    if hasattr(trading_date, 'isoformat'):
        date_str = trading_date.isoformat()
    else:
        date_str = str(trading_date)
    conn = get_connection()

    meta = DUID_MAP.get(duid)
    if not meta:
        conn.close()
        return None

    region = meta["region"]

    # Pull dispatch solution joined with RRP for target region
    rows = conn.execute("""
        SELECT
            dus.settlement_date,
            dus.total_cleared,
            dus.availability,
            dus.marginal_value,
            dp.rrp
        FROM dispatch_unit_solution dus
        JOIN dispatch_price dp
          ON dp.settlement_date = dus.settlement_date
         AND dp.region_id = ?
        WHERE dus.duid = ?
          AND substr(dus.settlement_date, 1, 10) = ?
        ORDER BY dus.settlement_date
    """, (region, duid, date_str)).fetchall()

    # Also pull bid data for price-setter cross-check
    bid_row = conn.execute("""
        SELECT price_band1, price_band2, price_band3, price_band4, price_band5,
               price_band6, price_band7, price_band8, price_band9, price_band10
        FROM bid_price_band
        WHERE duid = ? AND bid_type = 'ENERGY'
          AND substr(settlement_date, 1, 10) = ?
        ORDER BY offer_datetime DESC
        LIMIT 1
    """, (duid, date_str)).fetchone()

    rebid_count = conn.execute(
        "SELECT COUNT(*) FROM rebid_event WHERE duid=? AND date(settlement_date)=?",
        (duid, date_str)
    ).fetchone()[0]

    strategic_rebid_count = conn.execute(
        "SELECT COUNT(*) FROM rebid_event WHERE duid=? AND date(settlement_date)=? AND classification='strategic'",
        (duid, date_str)
    ).fetchone()[0]

    conn.close()

    if not rows:
        return None

    bid_prices = []
    if bid_row:
        bid_prices = [bid_row[i] for i in range(10) if bid_row[i] is not None]

    total_energy_mwh = 0.0
    actual_revenue = 0.0
    max_possible_revenue = 0.0
    intervals_dispatched = 0
    intervals_available = 0
    intervals_price_setter = 0
    sum_cleared = 0.0
    sum_rrp = 0.0

    for r in rows:
        cleared   = r["total_cleared"] or 0.0
        avail     = r["availability"]  or 0.0
        rrp       = r["rrp"]           or 0.0
        marg_val  = r["marginal_value"]

        mwh = cleared * (5 / 60)
        total_energy_mwh      += mwh
        actual_revenue        += cleared * rrp * (5 / 60)
        max_possible_revenue  += avail   * rrp * (5 / 60) if avail > 0 else 0

        if cleared > 0:
            intervals_dispatched += 1
        if avail > 0:
            intervals_available += 1

        sum_cleared += cleared
        sum_rrp     += rrp

        # Price setter: marginal_value flag OR bid price matches RRP
        is_setter = False
        if marg_val is not None and marg_val > 0:
            is_setter = True
        elif bid_prices and rrp > 0:
            is_setter = any(abs(p - rrp) < PRICE_SETTER_TOLERANCE for p in bid_prices)
        if is_setter:
            intervals_price_setter += 1

    n = len(rows)
    revenue_efficiency_pct = (
        (actual_revenue / max_possible_revenue * 100) if max_possible_revenue > 0 else 0
    )
    dispatch_rate_pct = (
        (intervals_dispatched / intervals_available * 100) if intervals_available > 0 else 0
    )

    return {
        "trading_date":            date_str,
        "duid":                    duid,
        "region_id":               region,
        "total_energy_mwh":        round(total_energy_mwh, 2),
        "actual_revenue":          round(actual_revenue, 2),
        "max_possible_revenue":    round(max_possible_revenue, 2),
        "revenue_efficiency_pct":  round(revenue_efficiency_pct, 2),
        "intervals_price_setter":  intervals_price_setter,
        "intervals_dispatched":    intervals_dispatched,
        "intervals_available":     intervals_available,
        "dispatch_rate_pct":       round(dispatch_rate_pct, 2),
        "avg_cleared_mw":          round(sum_cleared / n, 2) if n else 0,
        "avg_rrp":                 round(sum_rrp / n, 2) if n else 0,
        "rebid_count":             rebid_count,
        "strategic_rebid_count":   strategic_rebid_count,
    }


def compute_all_units(trading_date: date) -> int:
    """Compute and persist analytics for all tracked DUIDs on a given day."""
    conn = get_connection()
    written = 0
    for duid in ALL_DUIDS:
        result = compute_unit_day(trading_date, duid)
        if not result:
            continue
        conn.execute("""
            INSERT OR REPLACE INTO analytics_unit_day
            (trading_date, duid, region_id,
             total_energy_mwh, actual_revenue, max_possible_revenue,
             revenue_efficiency_pct, intervals_price_setter,
             intervals_dispatched, intervals_available, dispatch_rate_pct,
             avg_cleared_mw, avg_rrp, rebid_count, strategic_rebid_count)
            VALUES
            (:trading_date, :duid, :region_id,
             :total_energy_mwh, :actual_revenue, :max_possible_revenue,
             :revenue_efficiency_pct, :intervals_price_setter,
             :intervals_dispatched, :intervals_available, :dispatch_rate_pct,
             :avg_cleared_mw, :avg_rrp, :rebid_count, :strategic_rebid_count)
        """, result)
        written += 1
    conn.commit()
    conn.close()
    log.info("Analytics: wrote %d unit-day rows for %s", written, trading_date)
    return written


def get_unit_timeline(duid: str, trading_date) -> list[dict]:
    """
    Return interval-by-interval data for a unit on a trading day.
    Used for the "what could I have done better" time-series chart.
    """
    date_str = trading_date.isoformat() if hasattr(trading_date, 'isoformat') else str(trading_date)
    region = DUID_MAP.get(duid, {}).get("region", "NSW1")
    conn = get_connection()
    rows = conn.execute("""
        SELECT
            dus.settlement_date,
            dus.total_cleared,
            dus.availability,
            dus.initial_mw,
            dus.marginal_value,
            dp.rrp,
            bo.max_avail,
            bo.band_avail1, bo.band_avail2, bo.band_avail3, bo.band_avail4,
            bo.band_avail5, bo.band_avail6, bo.band_avail7, bo.band_avail8,
            bo.band_avail9, bo.band_avail10,
            bpb.price_band1, bpb.price_band2, bpb.price_band3, bpb.price_band4,
            bpb.price_band5, bpb.price_band6, bpb.price_band7, bpb.price_band8,
            bpb.price_band9, bpb.price_band10
        FROM dispatch_unit_solution dus
        LEFT JOIN dispatch_price dp
            ON dp.settlement_date = dus.settlement_date
           AND dp.region_id = ?
        LEFT JOIN bid_offer bo
            ON bo.duid = dus.duid
           AND bo.settlement_date = dus.settlement_date
           AND bo.bid_type = 'ENERGY'
        LEFT JOIN bid_price_band bpb
            ON bpb.duid = dus.duid
           AND substr(bpb.settlement_date,1,10) = substr(dus.settlement_date,1,10)
           AND bpb.bid_type = 'ENERGY'
        WHERE dus.duid = ?
          AND substr(dus.settlement_date,1,10) = ?
        ORDER BY dus.settlement_date
    """, (region, duid, date_str)).fetchall()
    conn.close()

    result = []
    for r in rows:
        cleared  = r["total_cleared"] or 0.0
        avail    = r["availability"]  or 0.0
        rrp      = r["rrp"]           or 0.0
        forgone  = max(0, (avail - cleared) * rrp * (5 / 60))  # $ left on table

        # Reconstruct bid stack
        band_prices = [r[f"price_band{i}"] for i in range(1, 11)]
        band_avails = [r[f"band_avail{i}"] for i in range(1, 11)]
        bid_stack = [
            {"price": p, "mw": a}
            for p, a in zip(band_prices, band_avails)
            if p is not None and a is not None and a > 0
        ]

        result.append({
            "settlement_date":  r["settlement_date"],
            "total_cleared":    cleared,
            "availability":     avail,
            "initial_mw":       r["initial_mw"],
            "rrp":              rrp,
            "actual_revenue":   round(cleared * rrp * (5 / 60), 2),
            "max_revenue":      round(avail   * rrp * (5 / 60), 2),
            "forgone_revenue":  round(forgone, 2),
            "is_price_setter":  (r["marginal_value"] or 0) > 0,
            "bid_stack":        bid_stack,
        })
    return result
