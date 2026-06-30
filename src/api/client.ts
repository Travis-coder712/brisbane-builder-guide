import type {
  Generator, DispatchPrice, PriceSummary, UnitDaySummary,
  IntervalData, BidData, RebidEvent, RebidSummary,
  Narrative, LeaderboardEntry, Region, NarrativeFocus,
} from '../types/nem';

// When running on localhost the React app talks to the FastAPI backend.
// When deployed to GitHub Pages there is no backend, so the app reads
// pre-built JSON files that a daily GitHub Actions job publishes to public/data/.
const IS_STATIC = typeof window !== 'undefined'
  && window.location.hostname !== 'localhost'
  && window.location.hostname !== '127.0.0.1';

const LIVE_BASE   = 'http://localhost:8000/api';
const STATIC_BASE = import.meta.env.BASE_URL + 'data';

// ── Live (local backend) helpers ──────────────────────────────────────────────

async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(LIVE_BASE + path);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

async function post<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(LIVE_BASE + path);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  const res = await fetch(url.toString(), { method: 'POST' });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// ── Static (GitHub Pages) helpers ─────────────────────────────────────────────

async function staticGet<T>(filename: string): Promise<T> {
  const res = await fetch(`${STATIC_BASE}/${filename}`);
  if (!res.ok) throw new Error(`Static data not found: ${filename}`);
  return res.json();
}

// ── Public API ────────────────────────────────────────────────────────────────

export const api = {
  isStatic: IS_STATIC,

  // Reference
  generators: (): Promise<Generator[]> =>
    IS_STATIC
      ? staticGet('generators.json')
      : get('/generators'),

  generator: (duid: string): Promise<Generator> =>
    IS_STATIC
      ? staticGet<Generator[]>('generators.json').then(gs => {
          const g = gs.find(x => x.duids?.includes(duid));
          if (!g) throw new Error(`DUID ${duid} not found`);
          return g;
        })
      : get(`/generators/${duid}`),

  // Prices — static ignores date param, always serves latest pre-built day
  prices: (region: Region, _date?: string): Promise<DispatchPrice[]> =>
    IS_STATIC
      ? staticGet(`prices-${region}.json`)
      : get('/prices', { region, ...(_date ? { date: _date } : {}) }),

  priceSummary: (region: Region, _days?: number): Promise<PriceSummary[]> =>
    IS_STATIC
      ? staticGet(`prices-summary-${region}.json`)
      : get('/prices/summary', { region, ...(_days ? { days: _days } : {}) }),

  // Performance
  dailyPerformance: (_date?: string, region?: Region, duid?: string): Promise<UnitDaySummary[]> =>
    IS_STATIC
      ? staticGet<LeaderboardEntry[]>('leaderboard.json').then(rows =>
          rows
            .filter(r => !region || r.region_id === region)
            .filter(r => !duid   || r.duid === duid)
        )
      : get('/performance/daily', {
          ...(_date  ? { date: _date }   : {}),
          ...(region ? { region }        : {}),
          ...(duid   ? { duid }          : {}),
        }),

  unitTimeline: (duid: string, _date?: string): Promise<IntervalData[]> =>
    IS_STATIC
      ? staticGet(`timeline-${duid}.json`)
      : get(`/performance/timeline/${duid}`, _date ? { date: _date } : {}),

  unitTrend: (duid: string, _days?: number): Promise<UnitDaySummary[]> =>
    IS_STATIC
      ? staticGet(`trends-${duid}.json`)
      : get(`/performance/trend/${duid}`, _days ? { days: _days } : {}),

  // Bids
  bids: (duid: string, _date?: string): Promise<BidData> =>
    IS_STATIC
      ? staticGet(`bids-${duid}.json`)
      : get(`/bids/${duid}`, _date ? { date: _date } : {}),

  // Rebids — static returns latest day; client-side filter by duid/classification
  rebids: (_date?: string, duid?: string, classification?: string): Promise<RebidEvent[]> =>
    IS_STATIC
      ? staticGet<RebidEvent[]>('rebids.json').then(rows =>
          rows
            .filter(r => !duid           || r.duid === duid)
            .filter(r => !classification || r.classification === classification)
        )
      : get('/rebids', {
          ...(_date          ? { date: _date }             : {}),
          ...(duid           ? { duid }                    : {}),
          ...(classification ? { classification }          : {}),
        }),

  rebidSummary: (_days?: number): Promise<RebidSummary[]> =>
    IS_STATIC
      ? staticGet('rebids-summary.json')
      : get('/rebids/summary', _days ? { days: _days } : {}),

  // Narrative — not available in static mode
  narrative: (duid: string, date?: string, focus?: NarrativeFocus): Promise<Narrative> =>
    IS_STATIC
      ? Promise.resolve({
          duid,
          date: date ?? '',
          focus: focus ?? 'all',
          narrative: '**AI narrative not available in the public demo.**\n\nTo generate live AI analysis, run the backend locally with your Anthropic API key. See the README for setup instructions.',
          generated_at: new Date().toISOString(),
        })
      : get(`/narrative/${duid}`, {
          ...(date  ? { date }  : {}),
          ...(focus ? { focus } : {}),
        }),

  // Leaderboard
  leaderboard: (_date?: string, region?: Region, metric?: string): Promise<LeaderboardEntry[]> =>
    IS_STATIC
      ? staticGet<LeaderboardEntry[]>('leaderboard.json').then(rows => {
          const filtered = rows.filter(r => !region || r.region_id === region);
          if (metric && metric !== 'actual_revenue') {
            filtered.sort((a, b) =>
              (((b as unknown) as Record<string, number>)[metric] ?? 0) -
              (((a as unknown) as Record<string, number>)[metric] ?? 0)
            );
            return filtered.map((r, i) => ({ ...r, rank: i + 1 }));
          }
          return filtered;
        })
      : get('/leaderboard', {
          ...(_date  ? { date: _date } : {}),
          ...(region ? { region }     : {}),
          ...(metric ? { metric }     : {}),
        }),

  // Data management — no-ops in static mode
  sync: (days_back?: number) =>
    IS_STATIC
      ? Promise.resolve({ status: 'static mode — sync runs via GitHub Actions' })
      : post('/sync', days_back ? { days_back } : {}),

  status: () =>
    IS_STATIC
      ? staticGet('snapshot.json')
      : get('/status'),
};
