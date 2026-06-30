export interface Generator {
  station: string;
  participant: string;
  region: 'NSW1' | 'VIC1';
  fuel: 'Coal' | 'Gas' | 'Hydro' | 'Wind' | 'Solar' | 'Battery';
  technology: string;
  capacity_mw: number;
  duids: string[];
  colour: string;
}

export interface DispatchPrice {
  settlement_date: string;
  region_id: string;
  rrp: number;
  raise6sec_rrp: number | null;
  raise60sec_rrp: number | null;
  raise5min_rrp: number | null;
}

export interface PriceSummary {
  trading_date: string;
  min_rrp: number;
  max_rrp: number;
  avg_rrp: number;
  spike_intervals: number;
  floor_intervals: number;
}

export interface UnitDaySummary {
  trading_date: string;
  duid: string;
  region_id: string;
  total_energy_mwh: number;
  actual_revenue: number;
  max_possible_revenue: number;
  revenue_efficiency_pct: number;
  intervals_price_setter: number;
  intervals_dispatched: number;
  intervals_available: number;
  dispatch_rate_pct: number;
  avg_cleared_mw: number;
  avg_rrp: number;
  rebid_count: number;
  strategic_rebid_count: number;
  // enriched client-side
  station?: string;
  participant?: string;
  fuel?: string;
  rank?: number;
}

export interface IntervalData {
  settlement_date: string;
  total_cleared: number;
  availability: number;
  initial_mw: number;
  rrp: number;
  actual_revenue: number;
  max_revenue: number;
  forgone_revenue: number;
  is_price_setter: boolean;
  bid_stack: { price: number; mw: number }[];
}

export interface BidBand {
  band: number;
  price: number;
  mw: number;
}

export interface BidData {
  duid: string;
  date: string;
  offer_datetime: string | null;
  bid_stack: BidBand[];
  availability_history: {
    offer_datetime: string;
    max_avail: number;
    band_avail1: number; band_avail2: number; band_avail3: number;
    band_avail4: number; band_avail5: number; band_avail6: number;
    band_avail7: number; band_avail8: number; band_avail9: number;
    band_avail10: number;
  }[];
}

export interface RebidEvent {
  id: number;
  settlement_date: string;
  duid: string;
  bid_type: string;
  rebid_at: string;
  rebid_explanation: string | null;
  prior_max_avail: number;
  new_max_avail: number;
  rrp_at_rebid: number | null;
  rrp_5min_after: number | null;
  p5min_price_forecast: number | null;
  price_spike_flagged: number;
  classification: 'strategic' | 'operational' | 'ambiguous';
  station: string;
  participant: string;
}

export interface RebidSummary {
  duid: string;
  total_rebids: number;
  strategic: number;
  operational: number;
  ambiguous: number;
  avg_rrp_after_rebid: number;
  station: string;
  participant: string;
}

export interface Narrative {
  duid: string;
  date: string;
  focus: string;
  narrative: string;
  generated_at: string;
}

export interface LeaderboardEntry extends UnitDaySummary {
  rank: number;
}

export type Region = 'NSW1' | 'VIC1';
export type NarrativeFocus = 'all' | 'revenue' | 'rebids' | 'trends';
