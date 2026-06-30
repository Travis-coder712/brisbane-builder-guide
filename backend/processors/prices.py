"""
Processor for Public_Prices (DISPATCHPRICE table).

NEMWeb CSV structure (DISPATCHPRICE):
  I,DISPATCH,PRICE,3,...  ← header row (ignored)
  D,DISPATCH,PRICE,3,<settlement_date>,<runno>,<regionid>,<dispatch_interval>,
    <intervention>,<rrp>,<eep>,<rrp_record_indicator>,<raise6secrrp>,
    <raise60secrrp>,<raise5minrrp>,<raiseregrrp>,<lower6secrrp>,
    <lower60secrrp>,<lower5minrrp>,<lowerregrrp>,<lastchanged>

We only persist columns we use.
"""

import csv
import io
import logging
from datetime import date, timedelta

from database import get_connection
from downloader import get_latest_zips, get_zips_for_date, extract_csvs
from config import TARGET_REGIONS

log = logging.getLogger(__name__)

# Column positions in the D-row (0-indexed after stripping the first 4 fixed cols)
# D, DISPATCH, PRICE, 3 | settlement_date | runno | regionid | interval | intervention | rrp | ...
COL_DATE    = 4
COL_REGION  = 6
COL_RRP     = 9
COL_R6      = 12
COL_R60     = 13
COL_R5      = 14
COL_L6      = 16
COL_L60     = 17
COL_L5      = 18


def _parse_csv(csv_text: str) -> list[dict]:
    rows = []
    reader = csv.reader(io.StringIO(csv_text))
    for row in reader:
        if not row or row[0] != "D":
            continue
        if len(row) < 19:
            continue
        region = row[COL_REGION].strip()
        if region not in TARGET_REGIONS:
            continue
        try:
            rows.append({
                "settlement_date": row[COL_DATE].strip(),
                "region_id":       region,
                "rrp":             float(row[COL_RRP]) if row[COL_RRP] else None,
                "raise6sec_rrp":   float(row[COL_R6])  if row[COL_R6]  else None,
                "raise60sec_rrp":  float(row[COL_R60]) if row[COL_R60] else None,
                "raise5min_rrp":   float(row[COL_R5])  if row[COL_R5]  else None,
                "lower6sec_rrp":   float(row[COL_L6])  if row[COL_L6]  else None,
                "lower60sec_rrp":  float(row[COL_L60]) if row[COL_L60] else None,
                "lower5min_rrp":   float(row[COL_L5])  if row[COL_L5]  else None,
            })
        except (ValueError, IndexError):
            continue
    return rows


def _upsert(rows: list[dict], conn) -> int:
    sql = """
    INSERT OR REPLACE INTO dispatch_price
        (settlement_date, region_id, rrp,
         raise6sec_rrp, raise60sec_rrp, raise5min_rrp,
         lower6sec_rrp, lower60sec_rrp, lower5min_rrp)
    VALUES
        (:settlement_date, :region_id, :rrp,
         :raise6sec_rrp, :raise60sec_rrp, :raise5min_rrp,
         :lower6sec_rrp, :lower60sec_rrp, :lower5min_rrp)
    """
    conn.executemany(sql, rows)
    return len(rows)


def ingest_latest(n_files: int = 2) -> int:
    """Download and ingest the n most-recent Public_Prices ZIPs."""
    total = 0
    conn = get_connection()
    for fname, zip_bytes in get_latest_zips("PUBLIC_PRICES", n=n_files):
        for csv_name, csv_text in extract_csvs(zip_bytes):
            rows = _parse_csv(csv_text)
            total += _upsert(rows, conn)
            conn.execute(
                "INSERT INTO ingest_log(report_type,filename,ingested_at,rows_loaded) VALUES(?,?,datetime('now'),?)",
                ("PUBLIC_PRICES", fname, len(rows)),
            )
    conn.commit()
    conn.close()
    log.info("Prices: ingested %d rows", total)
    return total


def ingest_date(target: date) -> int:
    """Ingest prices for a specific trading day."""
    from downloader import get_zips_for_date
    total = 0
    conn = get_connection()
    for fname, zip_bytes in get_zips_for_date("PUBLIC_PRICES", target):
        for _, csv_text in extract_csvs(zip_bytes):
            rows = _parse_csv(csv_text)
            total += _upsert(rows, conn)
    conn.commit()
    conn.close()
    return total
