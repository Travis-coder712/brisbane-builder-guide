import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { Loader2, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import type {
  Generator, IntervalData, UnitDaySummary, Narrative, NarrativeFocus,
} from '../types/nem';

const YESTERDAY = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

function fmt$(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

const FOCUS_OPTIONS: { value: NarrativeFocus; label: string; desc: string }[] = [
  { value: 'all',     label: 'Full Analysis',     desc: 'Comprehensive review of all dimensions' },
  { value: 'revenue', label: 'Revenue Deep-Dive',  desc: 'What revenue was left on the table & why' },
  { value: 'rebids',  label: 'Rebid Behaviour',    desc: 'Rebid timing, classification, NER 3.8.22 risk' },
  { value: 'trends',  label: 'Trend Context',      desc: 'How today compares to recent history' },
];

export default function GeneratorAnalysis() {
  const [params] = useSearchParams();
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [selectedDuid, setSelectedDuid] = useState(params.get('duid') || '');
  const [date, setDate] = useState(params.get('date') || YESTERDAY);
  const [timeline, setTimeline] = useState<IntervalData[]>([]);
  const [summary, setSummary] = useState<UnitDaySummary | null>(null);
  const [narrative, setNarrative] = useState<Narrative | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [focus, setFocus] = useState<NarrativeFocus>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.generators().then(setGenerators).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDuid) return;
    setLoading(true);
    setError(null);
    setNarrative(null);
    Promise.all([
      api.unitTimeline(selectedDuid, date).catch(() => []),
      api.dailyPerformance(date, undefined, selectedDuid).catch(() => []),
    ]).then(([tl, perf]) => {
      setTimeline(tl);
      setSummary(perf[0] || null);
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
  }, [selectedDuid, date]);

  function loadNarrative() {
    if (!selectedDuid) return;
    setNarrativeLoading(true);
    api.narrative(selectedDuid, date, focus)
      .then(n => { setNarrative(n); setNarrativeLoading(false); })
      .catch(e => { setNarrative({ duid: selectedDuid, date, focus, narrative: `Error: ${e.message}`, generated_at: '' }); setNarrativeLoading(false); });
  }

  // Build chart data: actual cleared vs availability vs RRP
  const chartData = timeline.map(t => ({
    t: t.settlement_date.slice(11, 16),
    cleared:    t.total_cleared,
    avail:      t.availability,
    rrp:        t.rrp,
    forgone:    t.forgone_revenue,
    isPriceSetter: t.is_price_setter,
  }));

  const gen = generators.find(g => g.duids.includes(selectedDuid));
  const totalForgone = timeline.reduce((s, t) => s + t.forgone_revenue, 0);
  const priceSetterCount = timeline.filter(t => t.is_price_setter).length;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Generator Analysis</h1>
        <div className="header-controls">
          <select
            className="select"
            value={selectedDuid}
            onChange={e => setSelectedDuid(e.target.value)}
          >
            <option value="">— Select unit —</option>
            {generators.map(g =>
              g.duids.map(d => (
                <option key={d} value={d}>
                  {g.station} / {d} ({g.participant}, {g.region})
                </option>
              ))
            )}
          </select>
          <input
            type="date"
            className="input"
            value={date}
            max={YESTERDAY}
            onChange={e => setDate(e.target.value)}
          />
        </div>
      </div>

      {!selectedDuid && (
        <div className="empty-state">
          <div className="empty-icon">⚡</div>
          <h2>Select a generator unit above</h2>
          <p>Choose a DUID to see interval-by-interval bid analysis and performance metrics</p>
        </div>
      )}

      {selectedDuid && gen && (
        <div className="gen-meta-bar">
          <span className="gen-name">{gen.station}</span>
          <span className="badge badge-region">{gen.region}</span>
          <span className="badge badge-fuel" style={{ background: gen.colour + '33', color: gen.colour }}>
            {gen.fuel}
          </span>
          <span className="text-muted">{gen.participant}</span>
          <span className="text-muted">·</span>
          <span className="text-muted">{gen.capacity_mw.toLocaleString()} MW registered</span>
        </div>
      )}

      {loading && <div className="page-loading"><Loader2 className="spin" size={24} /> Loading data…</div>}

      {!loading && error && <div className="error-box">{error}</div>}

      {!loading && summary && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value text-green">{fmt$(summary.actual_revenue)}</div>
            <div className="stat-label">Actual Revenue</div>
            <div className="stat-sub">vs {fmt$(summary.max_possible_revenue)} possible</div>
          </div>
          <div className="stat-card">
            <div className={`stat-value ${summary.revenue_efficiency_pct < 70 ? 'text-warn' : 'text-green'}`}>
              {summary.revenue_efficiency_pct.toFixed(1)}%
            </div>
            <div className="stat-label">Revenue Efficiency</div>
            <div className="stat-sub">{fmt$(totalForgone)} forgone</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{summary.dispatch_rate_pct.toFixed(1)}%</div>
            <div className="stat-label">Dispatch Rate</div>
            <div className="stat-sub">{summary.intervals_dispatched} of {summary.intervals_available} intervals</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-blue">{priceSetterCount}</div>
            <div className="stat-label">Price Setter Intervals</div>
            <div className="stat-sub">avg RRP ${summary.avg_rrp.toFixed(2)}/MWh</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{summary.avg_cleared_mw.toFixed(0)} MW</div>
            <div className="stat-label">Avg Cleared MW</div>
          </div>
          <div className="stat-card">
            <div className={`stat-value ${summary.strategic_rebid_count > 0 ? 'text-warn' : ''}`}>
              {summary.rebid_count}
            </div>
            <div className="stat-label">Rebids</div>
            {summary.strategic_rebid_count > 0 && (
              <div className="stat-sub text-warn">{summary.strategic_rebid_count} strategic flagged</div>
            )}
          </div>
        </div>
      )}

      {!loading && timeline.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>Dispatch vs Availability vs RRP — {date}</h3>
            <span className="text-muted text-sm">Each bar = one 5-min dispatch interval</span>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 40, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="t" tick={{ fontSize: 9 }} interval={35} stroke="#475569" />
                <YAxis yAxisId="mw" tick={{ fontSize: 10 }} stroke="#475569" label={{ value: 'MW', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                <YAxis yAxisId="rrp" orientation="right" tick={{ fontSize: 10 }} stroke="#475569"
                  tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`}
                  label={{ value: '$/MWh', angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', fontSize: 11 }}
                  formatter={(v: unknown, name: unknown) => {
                    const val = v as number;
                    if (name === 'RRP') return [`$${val.toFixed(2)}/MWh`, name as string];
                    return [`${val.toFixed(0)} MW`, name as string];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="mw" dataKey="avail"   name="Availability" fill="#1e40af" opacity={0.4} />
                <Bar yAxisId="mw" dataKey="cleared"  name="Cleared MW"   fill="#3b82f6" />
                <Line yAxisId="rrp" dataKey="rrp" name="RRP" stroke="#f59e0b" dot={false} strokeWidth={1.5} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-note">
            Gaps between Availability (dark) and Cleared (blue) bars = forgone revenue.
            Orange line = 5-min RRP. Price setter intervals: {priceSetterCount}.
          </div>
        </div>
      )}

      {!loading && timeline.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>Forgone Revenue by Interval</h3>
            <span className="text-muted text-sm">Total forgone: {fmt$(totalForgone)}</span>
          </div>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="t" tick={{ fontSize: 9 }} interval={35} stroke="#475569" />
                <YAxis tick={{ fontSize: 10 }} stroke="#475569" tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', fontSize: 11 }}
                  formatter={(v: unknown) => [`$${(v as number).toLocaleString()}`, 'Forgone']}
                />
                <Bar dataKey="forgone" name="Forgone Revenue $" fill="#ef4444" opacity={0.8} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {selectedDuid && (
        <div className="card narrative-card">
          <div className="card-header">
            <div>
              <h3>AI Analysis — "What Could I Have Done Better?"</h3>
              <p className="text-muted text-sm">
                Claude analyses your bid data against actual market outcomes using NEM rule context
              </p>
            </div>
          </div>

          <div className="narrative-controls">
            <div className="focus-picker">
              {FOCUS_OPTIONS.map(f => (
                <button
                  key={f.value}
                  className={`focus-btn ${focus === f.value ? 'active' : ''}`}
                  onClick={() => setFocus(f.value)}
                  title={f.desc}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              className="btn btn-primary"
              onClick={loadNarrative}
              disabled={narrativeLoading}
            >
              {narrativeLoading
                ? <><Loader2 size={14} className="spin" /> Analysing…</>
                : <><Sparkles size={14} /> Generate Analysis</>
              }
            </button>
          </div>

          {narrative && (
            <div className="narrative-body">
              {narrative.narrative.split('\n').map((line, i) => (
                <p key={i} className={line.startsWith('#') ? 'narrative-heading' : ''}>{line || ' '}</p>
              ))}
              <div className="narrative-footer">
                Generated by Claude · {narrative.generated_at.slice(0, 19)} · Focus: {narrative.focus}
              </div>
            </div>
          )}

          {!narrative && !narrativeLoading && (
            <div className="narrative-placeholder">
              <Sparkles size={24} color="#3b82f6" />
              <p>Click "Generate Analysis" to get Claude's assessment of this unit's bidding strategy</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
