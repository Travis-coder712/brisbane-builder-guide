import type {
  Generator, DispatchPrice, PriceSummary, UnitDaySummary,
  IntervalData, BidData, RebidEvent, RebidSummary,
  Narrative, LeaderboardEntry, Region, NarrativeFocus,
} from '../types/nem';

const BASE = 'http://localhost:8000/api';

async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(BASE + path);
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
  const url = new URL(BASE + path);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  const res = await fetch(url.toString(), { method: 'POST' });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export const api = {
  // Reference
  generators: (): Promise<Generator[]> =>
    get('/generators'),
  generator: (duid: string): Promise<Generator> =>
    get(`/generators/${duid}`),

  // Prices
  prices: (region: Region, date?: string): Promise<DispatchPrice[]> =>
    get('/prices', { region, ...(date ? { date } : {}) }),
  priceSummary: (region: Region, days?: number): Promise<PriceSummary[]> =>
    get('/prices/summary', { region, ...(days ? { days } : {}) }),

  // Performance
  dailyPerformance: (date?: string, region?: Region, duid?: string): Promise<UnitDaySummary[]> =>
    get('/performance/daily', {
      ...(date ? { date } : {}),
      ...(region ? { region } : {}),
      ...(duid ? { duid } : {}),
    }),
  unitTimeline: (duid: string, date?: string): Promise<IntervalData[]> =>
    get(`/performance/timeline/${duid}`, date ? { date } : {}),
  unitTrend: (duid: string, days?: number): Promise<UnitDaySummary[]> =>
    get(`/performance/trend/${duid}`, days ? { days } : {}),

  // Bids
  bids: (duid: string, date?: string): Promise<BidData> =>
    get(`/bids/${duid}`, date ? { date } : {}),

  // Rebids
  rebids: (date?: string, duid?: string, classification?: string): Promise<RebidEvent[]> =>
    get('/rebids', {
      ...(date ? { date } : {}),
      ...(duid ? { duid } : {}),
      ...(classification ? { classification } : {}),
    }),
  rebidSummary: (days?: number): Promise<RebidSummary[]> =>
    get('/rebids/summary', days ? { days } : {}),

  // Narrative
  narrative: (duid: string, date?: string, focus?: NarrativeFocus): Promise<Narrative> =>
    get(`/narrative/${duid}`, {
      ...(date ? { date } : {}),
      ...(focus ? { focus } : {}),
    }),

  // Leaderboard
  leaderboard: (date?: string, region?: Region, metric?: string): Promise<LeaderboardEntry[]> =>
    get('/leaderboard', {
      ...(date ? { date } : {}),
      ...(region ? { region } : {}),
      ...(metric ? { metric } : {}),
    }),

  // Data management
  sync: (days_back?: number) => post('/sync', days_back ? { days_back } : {}),
  status: () => get('/status'),
};
