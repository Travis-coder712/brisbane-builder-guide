"""
Processor for Bidmove_Complete.

This is the largest dataset (~216 MB/month compressed).  It contains two
table types we care about:

  BIDDAYOFFER_D  — price bands per DUID per trading day
                   (set once per day unless rebid changes them)

  BIDPEROFFER_D  — availability (quantity) bands per DUID per dispatch interval
                   Each row = what a unit offered for a specific 5-min interval

We load both into separate SQLite tables and cross-join them in queries to
reconstruct the full bid stack (price × quantity) at any moment.

NEMWeb column order for BIDDAYOFFER_D (D rows):
  0:D 1:BIDDAYOFFER 2:BIDDAYOFFER_D 3:3
  4:SETTLEMENTDATE 5:DUID 6:BIDTYPE 7:BIDSETTLEMENTDATE 8:OFFERDATE
  9:VERSIONNO 10:PARTICIPANTID 11:LASTCHANGED
  12:T1 13:T2 14:T3 15:T4
  16:MINIMUMLOAD
  17:BANDAVAIL1..26:BANDAVAIL10
  (price bands)
  27:PRICEBAND1..36:PRICEBAND10

NEMWeb column order for BIDPEROFFER_D (D rows):
  0:D 1:BIDPEROFFER 2:BIDPEROFFER_D 3:3 (or 4)
  4:SETTLEMENTDATE 5:DUID 6:BIDTYPE 7:BIDSETTLEMENTDATE 8:PERIODID
  9:OFFERDATE 10:VERSIONNO 11:LASTCHANGED
  12:MAXAVAIL
  13:FIXEDLOAD 14:ROCUP 15:ROCDOWN
  16:BANDAVAIL1..25:BANDAVAIL10
  26:PASAAVAILABILITY

Note: Column positions can vary between file versions.  We detect columns by
scanning the I (header) row for column names.
"""

import csv
import io
import logging
from datetime import date

from database import get_connection
from downloader import get_latest_zips, get_zips_for_date, extract_csvs
from config import ALL_DUIDS

log = logging.getLogger(__name__)


def _col_map(header_row: list[str]) -> dict[str, int]:
    """Build name→index map from a NEMWeb I-row (skipping first 4 fixed cols)."""
    return {name.strip().upper(): i for i, name in enumerate(header_row)}


def _parse_csv(csv_text: str) -> tuple[list[dict], list[dict]]:
    """Returns (biddayoffer_rows, bidperoffer_rows)."""
    day_offers: list[dict] = []
    per_offers: list[dict] = []

    day_cols: dict[str, int] = {}
    per_cols: dict[str, int] = {}

    reader = csv.reader(io.StringIO(csv_text))
    for row in reader:
        if not row:
            continue
        row_type = row[0].upper()

        if row_type == "I":
            table = row[2].upper() if len(row) > 2 else ""
            if "BIDDAYOFFER" in table:
                day_cols = _col_map(row)
            elif "BIDPEROFFER" in table:
                per_cols = _col_map(row)
            continue

        if row_type != "D":
            continue

        table = row[2].upper() if len(row) > 2 else ""

        if "BIDDAYOFFER" in table and day_cols:
            duid = row[day_cols.get("DUID", 5)].strip()
            if duid not in ALL_DUIDS:
                continue
            try:
                def _f(col: str) -> float | None:
                    idx = day_cols.get(col)
                    return float(row[idx]) if idx is not None and row[idx] else None

                day_offers.append({
                    "settlement_date": row[day_cols.get("SETTLEMENTDATE", 4)].strip(),
                    "duid":            duid,
                    "bid_type":        row[day_cols.get("BIDTYPE", 6)].strip(),
                    "offer_datetime":  row[day_cols.get("OFFERDATE", 8)].strip(),
                    "price_band1":     _f("PRICEBAND1"),
                    "price_band2":     _f("PRICEBAND2"),
                    "price_band3":     _f("PRICEBAND3"),
                    "price_band4":     _f("PRICEBAND4"),
                    "price_band5":     _f("PRICEBAND5"),
                    "price_band6":     _f("PRICEBAND6"),
                    "price_band7":     _f("PRICEBAND7"),
                    "price_band8":     _f("PRICEBAND8"),
                    "price_band9":     _f("PRICEBAND9"),
                    "price_band10":    _f("PRICEBAND10"),
                    "minimum_load":    _f("MINIMUMLOAD"),
                    "t1": _f("T1"), "t2": _f("T2"),
                    "t3": _f("T3"), "t4": _f("T4"),
                })
            except (ValueError, IndexError, KeyError):
                continue

        elif "BIDPEROFFER" in table and per_cols:
            duid = row[per_cols.get("DUID", 5)].strip()
            if duid not in ALL_DUIDS:
                continue
            bid_type = row[per_cols.get("BIDTYPE", 6)].strip()
            if bid_type != "ENERGY":
                continue  # focus on energy bids first; FCAS handled separately
            try:
                def _f(col: str) -> float | None:
                    idx = per_cols.get(col)
                    return float(row[idx]) if idx is not None and row[idx] else None

                per_offers.append({
                    "settlement_date": row[per_cols.get("SETTLEMENTDATE", 4)].strip(),
                    "duid":            duid,
                    "bid_type":        bid_type,
                    "offer_datetime":  row[per_cols.get("OFFERDATE", 9)].strip(),
                    "band_avail1":     _f("BANDAVAIL1"),
                    "band_avail2":     _f("BANDAVAIL2"),
                    "band_avail3":     _f("BANDAVAIL3"),
                    "band_avail4":     _f("BANDAVAIL4"),
                    "band_avail5":     _f("BANDAVAIL5"),
                    "band_avail6":     _f("BANDAVAIL6"),
                    "band_avail7":     _f("BANDAVAIL7"),
                    "band_avail8":     _f("BANDAVAIL8"),
                    "band_avail9":     _f("BANDAVAIL9"),
                    "band_avail10":    _f("BANDAVAIL10"),
                    "max_avail":       _f("MAXAVAIL"),
                    "pasaavailability": _f("PASAAVAILABILITY"),
                })
            except (ValueError, IndexError, KeyError):
                continue

    return day_offers, per_offers


def _upsert_day(rows: list[dict], conn):
    sql = """
    INSERT OR REPLACE INTO bid_price_band
        (settlement_date, duid, bid_type, offer_datetime,
         price_band1, price_band2, price_band3, price_band4, price_band5,
         price_band6, price_band7, price_band8, price_band9, price_band10,
         minimum_load, t1, t2, t3, t4)
    VALUES
        (:settlement_date, :duid, :bid_type, :offer_datetime,
         :price_band1, :price_band2, :price_band3, :price_band4, :price_band5,
         :price_band6, :price_band7, :price_band8, :price_band9, :price_band10,
         :minimum_load, :t1, :t2, :t3, :t4)
    """
    conn.executemany(sql, rows)


def _upsert_per(rows: list[dict], conn):
    sql = """
    INSERT OR REPLACE INTO bid_offer
        (settlement_date, duid, bid_type, offer_datetime,
         band_avail1, band_avail2, band_avail3, band_avail4, band_avail5,
         band_avail6, band_avail7, band_avail8, band_avail9, band_avail10,
         max_avail, pasaavailability)
    VALUES
        (:settlement_date, :duid, :bid_type, :offer_datetime,
         :band_avail1, :band_avail2, :band_avail3, :band_avail4, :band_avail5,
         :band_avail6, :band_avail7, :band_avail8, :band_avail9, :band_avail10,
         :max_avail, :pasaavailability)
    """
    conn.executemany(sql, rows)


def ingest_latest(n_files: int = 1) -> int:
    total = 0
    conn = get_connection()
    for fname, zip_bytes in get_latest_zips("BIDMOVE_COMPLETE", n=n_files):
        for _, csv_text in extract_csvs(zip_bytes):
            day_rows, per_rows = _parse_csv(csv_text)
            _upsert_day(day_rows, conn)
            _upsert_per(per_rows, conn)
            total += len(day_rows) + len(per_rows)
            conn.execute(
                "INSERT INTO ingest_log(report_type,filename,ingested_at,rows_loaded) VALUES(?,?,datetime('now'),?)",
                ("BIDMOVE_COMPLETE", fname, total),
            )
    conn.commit()
    conn.close()
    log.info("Bids: ingested %d rows", total)
    return total


def ingest_date(target: date) -> int:
    total = 0
    conn = get_connection()
    for fname, zip_bytes in get_zips_for_date("BIDMOVE_COMPLETE", target):
        for _, csv_text in extract_csvs(zip_bytes):
            day_rows, per_rows = _parse_csv(csv_text)
            _upsert_day(day_rows, conn)
            _upsert_per(per_rows, conn)
            total += len(day_rows) + len(per_rows)
    conn.commit()
    conn.close()
    return total
