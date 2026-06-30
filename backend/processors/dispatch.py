"""
Processor for Next_Day_Dispatch.

Contains DISPATCH_UNIT_SOLUTION — the official record of what each unit
cleared in each 5-min interval.  More authoritative than SCADA for
settlement calculations.

Key columns: SETTLEMENTDATE, DUID, TOTALCLEARED, AVAILABILITY,
             INITIALMW, RAMPDOWNRATE, RAMPUPRATE
"""

import csv
import io
import logging
from datetime import date

from database import get_connection
from downloader import get_latest_zips, get_zips_for_date, extract_csvs
from config import ALL_DUIDS

log = logging.getLogger(__name__)


def _parse_csv(csv_text: str) -> list[dict]:
    rows = []
    cols: dict[str, int] = {}
    reader = csv.reader(io.StringIO(csv_text))
    for row in reader:
        if not row:
            continue
        if row[0].upper() == "I" and len(row) > 2 and "UNIT_SOLUTION" in row[2].upper():
            cols = {name.strip().upper(): i for i, name in enumerate(row)}
            continue
        if row[0].upper() != "D" or "UNIT_SOLUTION" not in (row[2].upper() if len(row) > 2 else ""):
            continue
        if not cols:
            continue
        duid = row[cols.get("DUID", 5)].strip()
        if duid not in ALL_DUIDS:
            continue
        try:
            def _f(col: str) -> float | None:
                idx = cols.get(col)
                return float(row[idx]) if idx is not None and row[idx] else None

            rows.append({
                "settlement_date": row[cols.get("SETTLEMENTDATE", 4)].strip(),
                "duid":            duid,
                "total_cleared":   _f("TOTALCLEARED"),
                "availability":    _f("AVAILABILITY"),
                "initial_mw":      _f("INITIALMW"),
                "ramp_down_rate":  _f("RAMPDOWNRATE"),
                "ramp_up_rate":    _f("RAMPUPRATE"),
                "marginal_value":  _f("MARGINALVALUE") if "MARGINALVALUE" in cols else None,
            })
        except (ValueError, IndexError):
            continue
    return rows


def _upsert(rows: list[dict], conn) -> int:
    sql = """
    INSERT OR REPLACE INTO dispatch_unit_solution
        (settlement_date, duid, total_cleared, availability,
         initial_mw, ramp_down_rate, ramp_up_rate, marginal_value)
    VALUES
        (:settlement_date, :duid, :total_cleared, :availability,
         :initial_mw, :ramp_down_rate, :ramp_up_rate, :marginal_value)
    """
    conn.executemany(sql, rows)
    return len(rows)


def ingest_latest(n_files: int = 1) -> int:
    total = 0
    conn = get_connection()
    for fname, zip_bytes in get_latest_zips("NEXT_DAY_DISPATCH", n=n_files):
        for _, csv_text in extract_csvs(zip_bytes):
            rows = _parse_csv(csv_text)
            total += _upsert(rows, conn)
            conn.execute(
                "INSERT INTO ingest_log(report_type,filename,ingested_at,rows_loaded) VALUES(?,?,datetime('now'),?)",
                ("NEXT_DAY_DISPATCH", fname, len(rows)),
            )
    conn.commit()
    conn.close()
    log.info("Dispatch: ingested %d rows", total)
    return total


def ingest_date(target: date) -> int:
    total = 0
    conn = get_connection()
    for fname, zip_bytes in get_zips_for_date("NEXT_DAY_DISPATCH", target):
        for _, csv_text in extract_csvs(zip_bytes):
            rows = _parse_csv(csv_text)
            total += _upsert(rows, conn)
    conn.commit()
    conn.close()
    return total
