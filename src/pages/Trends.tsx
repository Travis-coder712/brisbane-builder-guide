import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';
import { api } from '../api/client';
import type { Generator, UnitDaySummary, PriceSummary } from '../types/nem';

const COLOURS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'];

export default function Trends() {
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [selectedDuids, setSelectedDuids] = useState<string[]>([]);
  const [days, setDays] = useState(30);
  const [region, setRegion] = useState<'NSW1'|'VIC1'>('NSW1');
  const [trendData, setTrendData] = useState<Record<string, UnitDaySummary[]>>({});
  const [priceSummary, setPriceSummary] = useState<PriceSummary[]>([]);
  const [metric, setMetric] = useState<keyof UnitDaySummary>('revenue_efficiency_pct');

  useEffect(() => {
    api.generators().then(setGenerators).catch(() => {});
  }, []);

  useEffect(() => {
    api.priceSummary(region, days).then(setPriceSummary).catch(() => {});
  }, [region, days]);

  useEffect(() => {
    selectedDuids.forEach(duid => {
      if (trendData[duid]) return;
      api.unitTrend(duid, days).then(data => {
        setTrendData(prev => ({ ...prev, [duid]: data }));
      }).catch(() => {});
    });
  }, [selectedDuids, days]);

  function toggleDuid(duid: string) {
    setSelectedDuids(prev =>
      prev.includes(duid) ? prev.filter(d => d !== duid) : [...prev, duid].slice(0, 8)
    );
  }

  // Merge trend data by date for multi-line chart
  const allDates = Array.from(new Set(
    Object.values(trendData).flatMap(rows => rows.map(r => r.trading_date))
  )).sort();

  const mergedData = allDates.map(date => {
    const point: Record<string, unknown> = { date: date.slice(5) }; // MM-DD
    selectedDuids.forEach(duid => {
      const row = trendData[duid]?.find(r => r.trading_date === date);
      point[duid] = row ? (row[metric] as number) : null;
    });
    return point;
  });

  const METRICS: { value: keyof UnitDaySummary; label: string }[] = [
    { value: 'revenue_efficiency_pct', label: 'Revenue Efficiency %' },
    { value: 'actual_revenue',         label: 'Daily Revenue $' },
    { value: 'dispatch_rate_pct',      label: 'Dispatch Rate %' },
    { value: 'avg_cleared_mw',         label: 'Avg Cleared MW' },
    { value: 'intervals_price_setter', label: 'Price Setter Intervals' },
    { value: 'rebid_count',            label: 'Rebid Count' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Trend Analysis</h1>
          <p className="page-sub">Weekly and monthly performance patterns for NSW & VIC generators</p>
        </div>
        <div className="header-controls">
          <select className="select" value={region} onChange={e => setRegion(e.target.value as any)}>
            <option value="NSW1">NSW1</option>
            <option value="VIC1">VIC1</option>
          </select>
          <select className="select" value={days} onChange={e => setDays(Number(e.target.value))}>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>
      </div>

      {priceSummary.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>{region} — Daily RRP Summary (last {days} days)</h3>
          </div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceSummary.map(p => ({ date: p.trading_date.slice(5), max: p.max_rrp, avg: p.avg_rrp, spikes: p.spike_intervals }))}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={4} stroke="#475569" />
                <YAxis tick={{ fontSize: 10 }} stroke="#475569" tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', fontSize: 11 }}
                  formatter={(v: unknown, n: unknown) => [`$${(v as number).toFixed(2)}/MWh`, n as string]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line dataKey="max" name="Peak RRP" stroke="#ef4444" dot={false} strokeWidth={1.5} />
                <Line dataKey="avg" name="Avg RRP"  stroke="#3b82f6" dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="two-col-3-1">
        <div className="card">
          <div className="card-header">
            <h3>Unit Trend Comparison</h3>
            <select className="select select-sm" value={metric as string} onChange={e => setMetric(e.target.value as keyof UnitDaySummary)}>
              {METRICS.map(m => <option key={m.value as string} value={m.value as string}>{m.label}</option>)}
            </select>
          </div>
          {selectedDuids.length === 0 ? (
            <div className="text-center text-muted p-8">Select units from the panel to compare trends</div>
          ) : (
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mergedData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={4} stroke="#475569" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#475569" />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {selectedDuids.map((duid, i) => (
                    <Line key={duid} dataKey={duid} name={duid}
                      stroke={COLOURS[i % COLOURS.length]} dot={false} strokeWidth={1.5}
                      connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Select Units</h3>
            <span className="text-muted text-sm">{selectedDuids.length}/8</span>
          </div>
          <div className="duid-picker">
            {generators
              .filter(g => g.region === region)
              .map((g, gi) =>
                g.duids.map((duid, i) => {
                  const colour = COLOURS[(gi * 4 + i) % COLOURS.length];
                  const active = selectedDuids.includes(duid);
                  return (
                    <button
                      key={duid}
                      className={`duid-chip ${active ? 'active' : ''}`}
                      style={active ? { borderColor: colour, color: colour } : {}}
                      onClick={() => toggleDuid(duid)}
                    >
                      <span className="duid-dot" style={{ background: active ? colour : '#475569' }} />
                      {duid}
                      <span className="text-muted text-xs">{g.station}</span>
                    </button>
                  );
                })
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
