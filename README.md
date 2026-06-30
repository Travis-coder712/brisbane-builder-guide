# NEM Bid Analyser

A comprehensive web application for analysing generator bidding behaviour in the Australian National Electricity Market (NEM), focusing on NSW and VIC large generators.

**Live frontend:** https://travis-coder712.github.io/brisbane-builder-guide/

> **Note:** The GitHub Pages deployment shows the UI shell. Live data requires the Python backend running locally — see Setup below.

---

## What it does

- Downloads and processes real NEM bid data from AEMO's NEMWeb portal
- Shows interval-by-interval dispatch vs availability vs RRP for every large generator
- Quantifies **forgone revenue** — what each unit left on the table and why
- Detects and classifies **rebids** against P5MIN forecasts using NER clause 3.8.22 logic
- Generates **AI narrative analysis** via Claude API: "What could I have done better today?"
- Weekly and monthly trend comparisons across generators

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 · TypeScript · Vite 6 · Recharts · React Router |
| Backend | Python · FastAPI · SQLite |
| AI | Anthropic Claude API |
| Data | AEMO NEMWeb (Public domain) |
| Deployment | GitHub Pages (frontend) + local Windows (backend) |

---

## Quick Start (Windows)

### Prerequisites
- [Python 3.11+](https://www.python.org/downloads/) — check "Add Python to PATH"
- [Node.js 20+](https://nodejs.org/)
- An [Anthropic API key](https://console.anthropic.com/) (for AI narratives — optional)

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/Travis-coder712/brisbane-builder-guide.git
cd brisbane-builder-guide

# 2. Add your API key
copy backend\.env.example backend\.env
# Edit backend\.env and paste your ANTHROPIC_API_KEY

# 3. Launch everything
start.bat
```

Then open **http://localhost:5173** in your browser.

The backend will automatically begin downloading NEMWeb data for the last 2 days on first run. Allow 5–10 minutes for the initial sync — file sizes are 200–400 MB/day.

---

## Project Structure

```
brisbane-builder-guide/
├── backend/
│   ├── main.py              # FastAPI app — all API routes
│   ├── config.py            # DUID registry, NEM constants, market caps
│   ├── database.py          # SQLite schema and connection
│   ├── downloader.py        # NEMWeb ZIP fetcher (current + archive)
│   ├── processors/
│   │   ├── prices.py        # Public_Prices → dispatch_price table
│   │   ├── bids.py          # Bidmove_Complete → bid_offer + bid_price_band
│   │   ├── dispatch.py      # Next_Day_Dispatch → dispatch_unit_solution
│   │   └── scada.py         # Dispatch_SCADA → dispatch_scada
│   ├── analyzers/
│   │   ├── bid_success.py   # Revenue efficiency, dispatch rate, price setter
│   │   ├── rebid.py         # Rebid detection + NER 3.8.22 classification
│   │   └── narrative.py     # Claude API "what could I have done better"
│   ├── requirements.txt
│   └── .env.example
├── src/
│   ├── api/client.ts        # Typed API client (all backend calls)
│   ├── types/nem.ts         # TypeScript interfaces
│   ├── components/
│   │   └── Layout.tsx       # Sidebar navigation shell
│   └── pages/
│       ├── Dashboard.tsx    # RRP charts, leaderboard, rebid summary
│       ├── GeneratorAnalysis.tsx  # Per-unit interval analysis + AI narrative
│       ├── BidAnalysis.tsx  # Bid stack, supply curve, availability history
│       ├── RebidTracker.tsx # Rebid events with NER compliance flags
│       ├── Trends.tsx       # Multi-unit trend comparisons
│       └── DataStatus.tsx   # Database status, ingest log, sync controls
├── start.bat                # Windows one-click launcher
└── HANDOVER.md              # Project context and roadmap for new contributors
```

---

## Tracked Generators

| Station | Participant | Region | Fuel | Capacity |
|---------|------------|--------|------|----------|
| Bayswater | AGL Energy | NSW1 | Coal | 2,640 MW |
| Eraring | Origin Energy | NSW1 | Coal | 2,880 MW |
| Mt Piper | EnergyAustralia | NSW1 | Coal | 1,400 MW |
| Colongra | Snowy Hydro | NSW1 | Gas OCGT | 667 MW |
| Tallawarra | EnergyAustralia | NSW1 | Gas CCGT | 435 MW |
| Uranquinty | Origin Energy | NSW1 | Gas OCGT | 664 MW |
| Snowy (Murray/Tumut) | Snowy Hydro | NSW1 | Hydro | 2,082 MW |
| Loy Yang A | AGL Energy | VIC1 | Coal | 2,210 MW |
| Loy Yang B | ENGIE | VIC1 | Coal | 1,000 MW |
| Yallourn | EnergyAustralia | VIC1 | Coal | 1,480 MW |
| Mortlake | Origin Energy | VIC1 | Gas OCGT | 566 MW |
| Newport | AGL Energy | VIC1 | Gas Steam | 500 MW |
| Laverton North | ERM Power | VIC1 | Gas OCGT | 312 MW |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/generators` | All tracked generators |
| GET | `/api/prices?region=NSW1&date=YYYY-MM-DD` | 5-min RRP |
| GET | `/api/prices/summary?region=NSW1&days=7` | Daily RRP stats |
| GET | `/api/performance/daily?date=&region=&duid=` | Unit day analytics |
| GET | `/api/performance/timeline/{duid}?date=` | Interval-by-interval data |
| GET | `/api/performance/trend/{duid}?days=30` | Multi-day trend |
| GET | `/api/bids/{duid}?date=` | Bid stack + availability history |
| GET | `/api/rebids?date=&duid=&classification=` | Rebid events |
| GET | `/api/rebids/summary?days=30` | Rebid frequency breakdown |
| GET | `/api/narrative/{duid}?date=&focus=` | Claude AI analysis |
| GET | `/api/leaderboard?date=&region=&metric=` | Generator rankings |
| POST | `/api/sync?days_back=1` | Trigger data sync |
| GET | `/api/status` | Database status |

---

## NEM Data Sources

| Report | Used for | Size | Route |
|--------|----------|------|-------|
| Public_Prices | 5-min RRP, all regions | ~8 MB/mo | Implemented |
| Bidmove_Complete | All bid bands (price + quantity) | ~216 MB/mo | Implemented |
| Next_Day_Dispatch | Cleared MW, availability | ~193 MB/mo | Implemented |
| Dispatch_SCADA | Actual MW output 5-min | ~60 MB/day | Implemented |
| Daily_Reports | DUNIT MARGINALVALUE (price setter) | TBC | Pending |
| P5MIN | Price forecasts for rebid analysis | 51 MB/day | Pending |
| STPASA | Reserve adequacy | Hourly | Pending |
| HistDemand | 30-min settlement demand | ~1 MB/mo | Pending |

---

## Deploy

Push to `main` → GitHub Actions builds frontend → GitHub Pages auto-deploys.

The Python backend is not deployed to the cloud — it runs locally.
See `HANDOVER.md` for future hosting options.
