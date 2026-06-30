# NEM Bid Analyser — Project Handover

**Prepared:** June 2026  
**From:** Travis  
**To:** David  
**Repository:** https://github.com/Travis-coder712/brisbane-builder-guide

---

## Hi David — read this first

This document gives you everything you need to pick up this project, understand what's been built, and decide where to take it next. It's written assuming you have a working knowledge of Python and the NEM, but may be new to the specific codebase.

Before diving into the code, please answer the questions at the bottom of this document — they'll determine which parts of the roadmap matter most for your use case.

---

## What has been built

### The core idea

A local web application that pulls real data from AEMO's NEMWeb portal and answers the question: **"For any large NSW or VIC generator, on any past trading day — what happened, and what could have been done better?"**

The app is built for people who understand NEM dispatch mechanics and want to do serious bid analysis without manually parsing gigabytes of CSVs.

### What's working right now

**Data pipeline:**
- Downloads and parses ZIP files from NEMWeb's Public_Prices, Bidmove_Complete, Next_Day_Dispatch, and Dispatch_SCADA directories
- Filters for ~14 tracked DUIDs across NSW1 and VIC1 (all large coal, gas, hydro)
- Stores everything in a local SQLite database (`backend/nem_data.db`)
- On startup, automatically syncs the last 2 days of data

**Analysis engine:**
- Revenue efficiency: actual revenue vs maximum possible (availability × RRP × 5/60h)
- Dispatch rate: intervals cleared / intervals available
- Price setter detection: cross-references marginal_value flag and bid band prices against RRP
- Forgone revenue: quantified per 5-minute interval
- Rebid detection: compares successive bid submissions for the same DUID/day
- Rebid classification: cross-references rebid timing against P5MIN forecasts, labels each rebid as `strategic`, `operational`, or `ambiguous` using NER clause 3.8.22 logic

**AI narrative (requires Anthropic API key):**
- Sends a structured context payload (bid data, dispatch outcomes, rebid log, regional RRP) to Claude
- Returns a natural-language analysis with 4 focus modes: full analysis, revenue deep-dive, rebid behaviour, trend context
- The system prompt is written as a senior NEM analyst — the output reads like a proper market review

**Frontend pages:**
1. **Dashboard** — RRP sparklines (NSW1 + VIC1), revenue leaderboard, rebid table
2. **Generator Analysis** — the main page; interval chart + forgone revenue + AI narrative
3. **Bid Stack** — 10-band price/quantity structure, supply curve, rebid history
4. **Rebid Tracker** — full rebid log with NER 3.8.22 compliance flags
5. **Trends** — multi-unit metric comparison over 7–90 days
6. **Data Status** — database row counts, ingest log, manual sync trigger

### What is NOT yet built (but designed for)

See the Roadmap section below.

---

## How to run it

### First time setup

1. Install [Python 3.11+](https://www.python.org/downloads/) — check "Add Python to PATH"
2. Install [Node.js 20+](https://nodejs.org/)
3. Clone the repository: `git clone https://github.com/Travis-coder712/brisbane-builder-guide.git`
4. Copy `backend\.env.example` → `backend\.env`
5. Add your Anthropic API key to `backend\.env` (get one at console.anthropic.com)
6. Double-click `start.bat`
7. Open `http://localhost:5173` in your browser

### Day-to-day

Just run `start.bat`. The backend will check for new data automatically.
To manually pull more history, go to **Data Status → Sync 7 Days**.

### Viewing on mobile

Run `start.bat` on your PC, then find your PC's local IP address (run `ipconfig` in Command Prompt, look for IPv4 Address). Open `http://192.168.x.x:5173` on your phone while on the same WiFi network.

---

## Codebase tour

### Backend key files

**`backend/config.py`** — Start here. Contains:
- `MARKET_PRICE_CAP`, `MARKET_FLOOR_PRICE`, `CUMULATIVE_PRICE_THRESHOLD` (NEM constants)
- `GENERATORS` dict — the master registry of all tracked stations and their DUIDs
- `DUID_MAP` — flat lookup from DUID string to station metadata
- `ALL_DUIDS` — list used to filter NEMWeb CSV rows

To add a new generator, add an entry to `GENERATORS` in this file. Everything else picks it up automatically.

**`backend/downloader.py`** — Handles all NEMWeb HTTP traffic. Key functions:
- `get_latest_zips(report_key, n)` — grabs the n most recent files
- `get_zips_for_date(report_key, date)` — date-targeted fetch
- `extract_csvs(zip_bytes)` — yields (filename, csv_text) from a ZIP

**`backend/processors/`** — One file per NEMWeb report type. Each follows the same pattern: parse CSV → upsert to SQLite. The column detection logic handles the fact that NEMWeb sometimes changes column order between file versions.

**`backend/analyzers/bid_success.py`** — The core analytics. `get_unit_timeline()` is the most important function — it's what powers the "what could I have done better" chart by joining dispatch outcomes with bid data and RRP.

**`backend/analyzers/rebid.py`** — Rebid classification. The `enrich_rebid()` function is where the NER 3.8.22 logic lives. Classification thresholds (spike threshold, late rebid window, P5MIN lead threshold) are constants at the top of the file — easy to tune.

**`backend/analyzers/narrative.py`** — Claude API integration. The `SYSTEM_PROMPT` constant defines the analyst persona. The `build_context_payload()` function constructs what gets sent to Claude. If you want to change the style or depth of the narrative, this is where to do it.

**`backend/main.py`** — FastAPI routes. All endpoints are straightforward REST — browse them at `http://localhost:8000/docs` when the backend is running (FastAPI auto-generates Swagger UI).

### Frontend key files

**`src/types/nem.ts`** — All TypeScript interfaces. If the backend changes a response shape, update this file first.

**`src/api/client.ts`** — Single typed wrapper for all API calls. All fetch logic lives here — pages don't call `fetch()` directly.

**`src/pages/GeneratorAnalysis.tsx`** — The most complex page. The interval chart (ComposedChart with Bar + Line), forgone revenue chart, and AI narrative panel all live here.

---

## NEM rules context

For anyone new to the NEM who will work on this codebase:

**Dispatch basics:**
- AEMO runs dispatch every 5 minutes (288 intervals/day)
- Generators submit 10 price-quantity "bands" (from $-1,000 to $17,500/MWh cap)
- AEMO stacks all offers cheapest-first (merit order) and dispatches up the stack to meet demand
- The price of the most expensive unit needed to meet demand becomes the RRP for that interval
- 6 consecutive 5-min prices are averaged for the 30-min settlement price

**Bid bands:**
- Band 1 is typically the cheapest (sometimes negative — generators pay to dispatch to avoid cycling costs)
- Bands 6–10 are typically high-price "strategic" bands used to influence price
- The split between low/high bands is the core bidding strategy

**Rebids:**
- A generator can change its bid after initial submission, right up until ~15 minutes before the dispatch interval
- Under NER clause 3.8.22(b), rebids must NOT be for commercial reasons (can't rebid just because you see a spike coming in P5MIN)
- In practice, AEMO and the AER monitor this but it's hard to prove intent
- This app's classification is analytical, not a legal finding

**Key data fields:**
- `TOTALCLEARED` — how many MW were actually dispatched
- `AVAILABILITY` — how many MW the unit offered to the market
- `MARGINALVALUE` — shadow price; positive = this unit was the price setter
- `RRP` — Regional Reference Price (what settlement is calculated on)

---

## Roadmap

This is where the project should go next, roughly in priority order.

### High priority — completes the core feature set

**1. P5MIN processor**  
The rebid classifier already has the P5MIN lookup query written (`analyzers/rebid.py` line ~85), but the `p5min_price` table is never populated because the P5MIN processor hasn't been built yet. This is the most important missing piece for the rebid analysis to work properly.  
Work required: add `backend/processors/p5min.py` following the same pattern as `prices.py`. The NEMWeb report key is `P5MIN` (already in `config.py`).

**2. Daily_Reports processor**  
The `DUNIT MARGINALVALUE` table in Daily_Reports gives the definitive record of which unit set the price in each interval. Currently the app tries to infer this from bid band prices, which is approximate. Getting the real data would make the price setter count accurate.  
Work required: add `backend/processors/daily_reports.py`. The relevant table inside the ZIP is `DISPATCH_UNIT_SOLUTION` from the `DUNIT_MARGINALVALUE` sub-report.

**3. Nightly auto-sync**  
Currently data only syncs on startup or when you click "Sync" in the UI. Previous day's data is published by AEMO around 05:00–06:00 AEST. APScheduler is already installed — just needs a cron job wired into `main.py`'s lifespan.  
Work required: ~15 lines in `backend/main.py`.

### Medium priority — significant feature additions

**4. SA and QLD regions**  
The architecture already supports multiple regions — `TARGET_REGIONS` in `config.py` is just a list. Add SA1 and QLD1, and add the relevant generators (AGL Torrens, CS Energy Callide/Stanwell, etc.) to the `GENERATORS` dict.

**5. FCAS market analysis**  
The bid processor already has logic to handle non-ENERGY bid types but currently filters them out. FCAS (Frequency Control Ancillary Services) revenue can be significant for fast-start units. Work required: remove the `if bid_type != "ENERGY": continue` filter in `processors/bids.py`, add FCAS revenue to the analytics calculations, add FCAS charts to the frontend.

**6. Interconnector flow context**  
NSW↔VIC interconnector flows (Terranora, QNI, VIC1-NSW1 Heywood limits) heavily influence when prices diverge between regions. Adding AEMO's Interconnector flow data would explain many price events that currently look mysterious.

**7. Unit outage / forced trip detection**  
When SCADA value drops sharply while availability was high, it's likely a forced outage. This could be auto-flagged and annotated on the interval charts with a red marker.

**8. Historical archive (May 2025 onwards)**  
The NEMWeb archive goes back to May 2025 for the key reports. A one-time bulk backfill script would populate the database with ~14 months of history, enabling meaningful seasonal analysis.

### Lower priority — polish and deployment

**9. Cloud deployment of the backend**  
Currently the Python backend must run locally. For a team or multi-user scenario, deploying to a small cloud VM (e.g. a $6/month DigitalOcean droplet) with a daily cron sync would make the app accessible from anywhere without needing `start.bat`.  
Stack suggestion: FastAPI on the same VM, behind Nginx, with the SQLite file on persistent storage. SQLite handles this workload easily at this data volume.

**10. Authentication**  
Currently there's no auth — the app is internal-only. If deployed to a cloud server, add simple HTTP Basic auth via FastAPI's `HTTPBasic` (5 lines) or a proper auth layer.

**11. Export to Excel/CSV**  
A common request from energy market analysts. Add `/api/export/unit-day/{duid}?date=` endpoints that return CSV, and a download button on the Generator Analysis page.

**12. Alert system**  
Email or webhook alert when a strategic rebid is detected for a specific generator. Useful for compliance monitoring.

---

## Questions for David

The answers to these will determine which parts of the roadmap to prioritise. Please work through these before starting development:

---

**1. What is your primary use case?**
- (a) **Commercial intelligence** — you want to understand what competitors are doing with their bids and why
- (b) **Compliance monitoring** — you want to flag potential NER 3.8.22 rebid violations for reporting
- (c) **Strategy development** — you want to understand what *you* could have bid differently (you work for or advise a generator)
- (d) **Academic / research** — building a dataset or model of NEM bidding behaviour
- (e) Multiple of the above — which is the primary?

*Why it matters: (a) focuses the app on competitor analysis features; (b) needs the alert system and exportable compliance reports; (c) means the AI narrative and "forgone revenue" analysis is the core; (d) needs the bulk historical backfill and CSV export.*

---

**2. Which generators matter most to you?**
- The current list covers the 14 largest NSW+VIC units (coal, gas, hydro)
- Are there specific DUIDs you want to add (SA, QLD, BESS, wind)?
- Are there any in the current list you don't care about?

*Why it matters: the database and daily sync will be much faster if we trim to a focused DUID list. Adding SA/QLD is straightforward but adds significant daily data volume.*

---

**3. Do you need FCAS (ancillary services) analysis, or just energy?**
- Currently the app only analyses energy bids
- FCAS is significant for peakers (gas OCGT, hydro) and batteries
- Adding it roughly doubles the complexity of the bid analysis

*Why it matters: if your focus is coal plants, FCAS is secondary. If you're looking at Snowy, Colongra, or any BESS, FCAS is critical.*

---

**4. How far back do you need history?**
- The NEMWeb archive goes back to May 2025
- Backfilling all 14 months at ~400 MB/day is a large one-time operation (~170 GB downloaded, ~5 GB in the database after filtering)
- Or we can start from "today forward" and build up organically

*Why it matters: determines whether we need a bulk backfill script or can just let it accumulate naturally.*

---

**5. Will you run this on your local machine, or do you want it on a server accessible from anywhere?**
- Current setup: local Windows machine, `start.bat`
- Alternative: cloud VM with the Python backend deployed, accessible from any browser (including mobile)
- The frontend is already on GitHub Pages and works from any device

*Why it matters: cloud deployment requires setting up a Linux VM, Nginx, and a deploy script — about a day of work, but makes the app genuinely multi-device.*

---

**6. Do you want the AI narrative feature?**
- It requires an Anthropic API key and costs approximately $0.01–0.05 per narrative generated (depending on data volume)
- At 5 narratives/day it's ~$50/year — negligible
- If you're generating many narratives (e.g. every unit every day), costs could add up

*Why it matters: if cost is a concern, we can replace the Claude API calls with sophisticated rule-based text templates that are free and faster, though less nuanced.*

---

**7. Are there any specific NEM events or periods you want to analyse first?**
- e.g. a particular high-price event, a known rebid controversy, a unit's retirement announcement period
- Starting with a specific period of interest is a great way to validate the app's analysis

*Why it matters: helps prioritise the historical backfill and gives us a ground-truth check on whether the analysis is correct.*

---

**8. What is your Python comfort level?**
- The backend is plain Python — no Django, no ORM, just FastAPI + sqlite3 + pandas
- The hardest parts are the CSV column-detection logic (NEMWeb changes formats occasionally) and the rebid classification

*Why it matters: determines how much handholding the code comments and documentation need, and whether you're comfortable extending the processors yourself.*

---

## Known issues and gotchas

1. **DUID verification** — The DUIDs in `config.py` are based on knowledge of the NEM but should be verified against the current AEMO NEM Registration and Exemption List before relying on them. DUIDs occasionally change when units are refurbished or renamed. The verification list is at: `https://www.aemo.com.au/energy-systems/electricity/national-electricity-market-nem/participate-in-the-market/registration`

2. **NEMWeb column order** — AEMO occasionally adds or reorders columns in their CSV files without notice. The processors use header-row (I-row) detection to handle this, but a new file format version could break ingestion. Check the `ingest_log` table in the Data Status page if data looks wrong.

3. **P5MIN rebid analysis is incomplete** — The rebid classifier has the P5MIN lookup query written but the P5MIN table is never populated (processor not yet built). All rebid P5MIN fields will be null until this is fixed. This is the highest priority code gap.

4. **SQLite concurrency** — The database uses WAL mode which allows concurrent reads, but heavy concurrent writes (e.g. a large sync running while you're browsing) can occasionally timeout. The connection timeout is set to 30 seconds. For a multi-user deployment, consider upgrading to PostgreSQL.

5. **Windows line endings** — The `.bat` startup script uses Windows line endings. If you're on Mac/Linux, run the backend and frontend manually: `cd backend && python main.py` and `npm run dev`.

---

## Getting help

- NEMWeb data documentation: https://www.nemweb.com.au/Reports/
- AEMO NER (National Electricity Rules): https://www.aemc.gov.au/regulation/energy-rules/national-electricity-rules
- FastAPI docs: https://fastapi.tiangolo.com/
- Recharts (chart library): https://recharts.org/
- Anthropic API: https://docs.anthropic.com/

For questions about the codebase, reach out to Travis.

---

*Last updated: June 2026*
