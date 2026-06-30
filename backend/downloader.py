"""
NEMWeb data downloader.

NEMWeb serves ZIP files from directory-listing pages.  This module:
  1. Fetches the HTML index for a report directory
  2. Parses href links to find the latest (or date-range) ZIP files
  3. Downloads and extracts CSV content in memory
  4. Returns raw CSV text for the processors to parse
"""

import re
import io
import zipfile
import logging
from datetime import date, timedelta
from typing import Generator

import requests

from config import NEMWEB_CURRENT, NEMWEB_ARCHIVE, REPORTS

log = logging.getLogger(__name__)

SESSION = requests.Session()
SESSION.headers["User-Agent"] = "NEM-Bid-Analyser/1.0 (research use)"

TIMEOUT = 60  # seconds


def _index_url(report_key: str, archive: bool = False) -> str:
    base = NEMWEB_ARCHIVE if archive else NEMWEB_CURRENT
    return f"{base}/{REPORTS[report_key]}/"


def _list_zips(report_key: str, archive: bool = False) -> list[str]:
    """Return all ZIP filenames listed in the NEMWeb directory index."""
    url = _index_url(report_key, archive)
    try:
        resp = SESSION.get(url, timeout=TIMEOUT)
        resp.raise_for_status()
    except requests.RequestException as e:
        log.error("Failed to fetch index %s: %s", url, e)
        return []

    # NEMWeb directory pages use simple href links
    zips = re.findall(r'href="([^"]+\.zip)"', resp.text, re.IGNORECASE)
    # Normalise: strip any path prefix, keep just the filename
    return [z.split("/")[-1] for z in zips]


def _download_zip(report_key: str, filename: str, archive: bool = False) -> bytes | None:
    base = NEMWEB_ARCHIVE if archive else NEMWEB_CURRENT
    url = f"{base}/{REPORTS[report_key]}/{filename}"
    try:
        resp = SESSION.get(url, timeout=TIMEOUT * 2)
        resp.raise_for_status()
        return resp.content
    except requests.RequestException as e:
        log.error("Download failed %s: %s", url, e)
        return None


def extract_csvs(zip_bytes: bytes) -> Generator[tuple[str, str], None, None]:
    """Yield (csv_filename, csv_text) pairs from a ZIP's contents."""
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        for name in zf.namelist():
            if name.upper().endswith(".CSV"):
                with zf.open(name) as f:
                    yield name, f.read().decode("utf-8", errors="replace")


def get_latest_zips(report_key: str, n: int = 1) -> list[tuple[str, bytes]]:
    """
    Return the n most-recent ZIP files for a report as (filename, bytes) pairs.
    Falls through to the archive directory if the current directory is empty.
    """
    zips = _list_zips(report_key, archive=False)
    if not zips:
        zips = _list_zips(report_key, archive=True)
        archive = True
    else:
        archive = False

    # NEMWeb filenames embed datetime — sort lexicographically for recency
    zips = sorted(set(zips))[-n:]

    results = []
    for fname in zips:
        data = _download_zip(report_key, fname, archive=archive)
        if data:
            results.append((fname, data))
    return results


def get_zips_for_date(report_key: str, target: date) -> list[tuple[str, bytes]]:
    """
    Return all ZIP files whose filename contains the target date string
    (YYYYMMDD pattern common on NEMWeb).
    """
    date_str = target.strftime("%Y%m%d")

    for archive in (False, True):
        zips = [z for z in _list_zips(report_key, archive) if date_str in z]
        if zips:
            results = []
            for fname in sorted(zips):
                data = _download_zip(report_key, fname, archive=archive)
                if data:
                    results.append((fname, data))
            return results

    return []


def get_zips_for_date_range(
    report_key: str, start: date, end: date
) -> list[tuple[str, bytes]]:
    """Return all ZIP files covering [start, end] inclusive."""
    results = []
    d = start
    while d <= end:
        results.extend(get_zips_for_date(report_key, d))
        d += timedelta(days=1)
    return results
