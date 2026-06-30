"""
Processor for Dispatch_SCADA — actual MW output per unit, 5-min intervals.

NEMWeb table: DISPATCH_UNIT_SCADA
D-row columns: SETTLEMENTDATE, DUID, SCADAVALUE
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
        if row[0].upper() == "I" and len(row) > 2 and "SCADA" in row[2].upper():
            cols = {name.strip().upper(): i for i, name in enumerate(row)}
            continue
        if row[0].upper() != "D":
            continue
        if not cols:
            # Fallback: assume standard column order
            # D,DISPATCH,UNIT_SCADA,3,<date>,<duid>,<scadavalue>
            if len(row) < 7:
                continue
            duid = row[5].strip()
            if duid not in ALL_DUIDS:
                continue
            try:
                rows.append({
                    "settlement_date": row[4].strip(),
                    "duid":            duid,
                    "scada_value":     float(row[6]) if row[6] else None,
                })
            except (ValueError, IndexError):
                continue
        else:
            duid = row[cols.get("DUID", 5)].strip()
            if duid not in ALL_DUIDS:
                continue
            try:
                sv_idx = cols.get("SCADAVALUE", 6)
                rows.append({
                    "settlement_date": row[cols.get("SETTLEMENTDATE", 4)].strip(),
                    "duid":            duid,
                    "scada_value":     float(row[sv_idx]) if row[sv_idx] else None,
                })
            except (ValueError, IndexError):
                continue
    return rows


def _upsert(rows: list[dict], conn) -> int:
    conn.executemany(
        "INSERT OR REPLACE INTO dispatch_scada(settlement_date,duid,scada_value) VALUES(:settlement_date,:duid,:scada_value)",
        rows,
    )
    return len(rows)


def ingest_latest(n_files: int = 12) -> int:
    """Ingest last n_files SCADA files (each covers ~30 min)."""
    total = 0
    conn = get_connection()
    for fname, zip_bytes in get_latest_zips("DISPATCH_SCADA", n=n_files):
        for _, csv_text in extract_csvs(zip_bytes):
            rows = _parse_csv(csv_text)
            total += _upsert(rows, conn)
    conn.commit()
    conn.close()
    log.info("SCADA: ingested %d rows", total)
    return total


def ingest_date(target: date) -> int:
    total = 0
    conn = get_connection()
    for fname, zip_bytes in get_zips_for_date("DISPATCH_SCADA", target):
        for _, csv_text in extract_csvs(zip_bytes):
            rows = _parse_csv(csv_text)
            total += _upsert(rows, conn)
    conn.commit()
    conn.close()
    return total
