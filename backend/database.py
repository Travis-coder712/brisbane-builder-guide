"""
SQLite database schema and connection management.

Schema design principles:
- Raw tables mirror NEMWeb CSV structure closely for auditability
- Derived/analytics tables are clearly prefixed with `analytics_`
- All settlement dates stored as ISO-8601 strings (NEMWeb format: YYYY/MM/DD HH:MM:SS)
"""

import sqlite3
import os
from pathlib import Path

DB_PATH = Path(__file__).parent / "nem_data.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA cache_size=-64000")  # 64 MB page cache
    return conn


def init_db():
    """Create all tables if they don't exist."""
    conn = get_connection()
    cur = conn.cursor()

    # ── Regional reference price (5-min dispatch price) ──────────────────────
    cur.executescript("""
    CREATE TABLE IF NOT EXISTS dispatch_price (
        settlement_date TEXT NOT NULL,
        region_id       TEXT NOT NULL,
        rrp             REAL,          -- Regional Reference Price $/MWh
        raise6sec_rrp   REAL,
        raise60sec_rrp  REAL,
        raise5min_rrp   REAL,
        lower6sec_rrp   REAL,
        lower60sec_rrp  REAL,
        lower5min_rrp   REAL,
        PRIMARY KEY (settlement_date, region_id)
    );
    CREATE INDEX IF NOT EXISTS idx_dp_date_region
        ON dispatch_price(settlement_date, region_id);

    -- ── Generator MW output (Dispatch_SCADA) ─────────────────────────────────
    CREATE TABLE IF NOT EXISTS dispatch_scada (
        settlement_date TEXT NOT NULL,
        duid            TEXT NOT NULL,
        scada_value     REAL,          -- MW output
        PRIMARY KEY (settlement_date, duid)
    );
    CREATE INDEX IF NOT EXISTS idx_scada_duid ON dispatch_scada(duid, settlement_date);

    -- ── Bid offers (Bidmove_Complete → BIDPEROFFER_D) ────────────────────────
    CREATE TABLE IF NOT EXISTS bid_offer (
        settlement_date TEXT NOT NULL,
        duid            TEXT NOT NULL,
        bid_type        TEXT NOT NULL, -- ENERGY, RAISE6SEC, etc.
        offer_datetime  TEXT NOT NULL, -- when the bid was submitted
        band_avail1     REAL, band_avail2  REAL, band_avail3  REAL,
        band_avail4     REAL, band_avail5  REAL, band_avail6  REAL,
        band_avail7     REAL, band_avail8  REAL, band_avail9  REAL,
        band_avail10    REAL,
        max_avail       REAL,
        pasaavailability REAL,
        PRIMARY KEY (settlement_date, duid, bid_type)
    );
    CREATE INDEX IF NOT EXISTS idx_bo_duid ON bid_offer(duid, settlement_date);

    -- ── Bid price bands (BIDDAYOFFER_D) ──────────────────────────────────────
    CREATE TABLE IF NOT EXISTS bid_price_band (
        settlement_date TEXT NOT NULL,
        duid            TEXT NOT NULL,
        bid_type        TEXT NOT NULL,
        offer_datetime  TEXT NOT NULL,
        price_band1     REAL, price_band2  REAL, price_band3  REAL,
        price_band4     REAL, price_band5  REAL, price_band6  REAL,
        price_band7     REAL, price_band8  REAL, price_band9  REAL,
        price_band10    REAL,
        minimum_load    REAL,
        t1 REAL, t2 REAL, t3 REAL, t4 REAL,  -- ramp rates MW/min
        PRIMARY KEY (settlement_date, duid, bid_type)
    );

    -- ── Dispatch unit solution (cleared MW, availability) ────────────────────
    CREATE TABLE IF NOT EXISTS dispatch_unit_solution (
        settlement_date TEXT NOT NULL,
        duid            TEXT NOT NULL,
        total_cleared   REAL,          -- dispatched MW
        availability    REAL,          -- offered availability MW
        initial_mw      REAL,          -- MW at start of interval
        ramp_down_rate  REAL,
        ramp_up_rate    REAL,
        marginal_value  REAL,          -- $ shadow price (from Daily_Reports DUNIT_MARGINALVALUE)
        PRIMARY KEY (settlement_date, duid)
    );
    CREATE INDEX IF NOT EXISTS idx_dus_duid ON dispatch_unit_solution(duid, settlement_date);

    -- ── Rebid log ─────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS rebid_event (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        settlement_date TEXT NOT NULL,  -- trading day
        duid            TEXT NOT NULL,
        bid_type        TEXT NOT NULL,
        rebid_at        TEXT NOT NULL,  -- datetime rebid submitted
        rebid_explanation TEXT,
        prior_max_avail REAL,
        new_max_avail   REAL,
        -- analysis fields populated by rebid analyzer
        rrp_at_rebid    REAL,
        rrp_5min_after  REAL,
        p5min_price_forecast REAL,      -- P5MIN price forecast when rebid occurred
        price_spike_flagged INTEGER DEFAULT 0,  -- 1 = suspicious timing
        classification  TEXT            -- 'strategic', 'operational', 'ambiguous'
    );
    CREATE INDEX IF NOT EXISTS idx_rebid_duid ON rebid_event(duid, settlement_date);

    -- ── P5MIN price forecasts ─────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS p5min_price (
        run_datetime    TEXT NOT NULL,  -- when P5MIN ran
        interval_datetime TEXT NOT NULL, -- forecast target interval
        region_id       TEXT NOT NULL,
        rrp             REAL,
        PRIMARY KEY (run_datetime, interval_datetime, region_id)
    );

    -- ── Settlement demand (30-min) ────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS settlement_demand (
        settlement_date TEXT NOT NULL,
        region_id       TEXT NOT NULL,
        demand_mw       REAL,
        PRIMARY KEY (settlement_date, region_id)
    );

    -- ── Analytics: per-unit daily summary ────────────────────────────────────
    CREATE TABLE IF NOT EXISTS analytics_unit_day (
        trading_date    TEXT NOT NULL,
        duid            TEXT NOT NULL,
        region_id       TEXT NOT NULL,
        total_energy_mwh        REAL DEFAULT 0,
        actual_revenue          REAL DEFAULT 0,   -- $ (cleared MW × RRP × 5/60)
        max_possible_revenue    REAL DEFAULT 0,   -- $ (availability × RRP × 5/60)
        revenue_efficiency_pct  REAL DEFAULT 0,   -- actual / max_possible * 100
        intervals_price_setter  INTEGER DEFAULT 0,
        intervals_dispatched    INTEGER DEFAULT 0,
        intervals_available     INTEGER DEFAULT 0,
        dispatch_rate_pct       REAL DEFAULT 0,
        avg_cleared_mw          REAL DEFAULT 0,
        avg_rrp                 REAL DEFAULT 0,
        rebid_count             INTEGER DEFAULT 0,
        strategic_rebid_count   INTEGER DEFAULT 0,
        PRIMARY KEY (trading_date, duid)
    );

    -- ── Data ingestion log ────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS ingest_log (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        report_type TEXT NOT NULL,
        filename    TEXT NOT NULL,
        ingested_at TEXT NOT NULL,
        rows_loaded INTEGER DEFAULT 0,
        status      TEXT DEFAULT 'ok'
    );
    """)

    conn.commit()
    conn.close()
    print(f"[DB] Initialised at {DB_PATH}")


if __name__ == "__main__":
    init_db()
