import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import { TrendingUp, Zap, AlertTriangle, DollarSign } from 'lucide-react';
import { api } from '../api/client';
import type { DispatchPrice, LeaderboardEntry, RebidEvent } from '../types/nem';

const YESTERDAY = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

function fmt$(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

function fmtRRP(n: number) {
  return `$${n.toFixed(2)}/MWh`;
}

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; accent: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: accent + '22', color: accent }}>
        <Icon size={20} />
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

function PriceSparkline({ data, region }: { data: DispatchPrice[]; region: string }) {
  const chartData = data.map(d => ({
    t: d.settlement_date.slice(11, 16),
    rrp: d.rrp,
  }));
  const max = Math.max(...data.map(d => d.rrp));
  const avg = data.reduce((s, d) => s + d.rrp, 0) / (data.length || 1);

  return (
    <div className="card">
      <div className="card-header">
        <h3>{region} — 5-min RRP ({YESTERDAY})</h3>
        <span className={`badge ${max > 300 ? 'badge-warn' : 'badge-ok'}`}>
          Peak {fmtRRP(max)}
        </span>
      </div>
      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="t" tick={{ fontSize: 10 }} interval={35} stroke="#475569" />
            <YAxis tick={{ fontSize: 10 }} stroke="#475569"
              tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', fontSize: 12 }}
              formatter={(v: unknown) => [fmtRRP(v as number), 'RRP']}
            />
            <ReferenceLine y={300} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: '$300', fill: '#f59e0b', fontSize: 10 }} />
            <Line dataKey="rrp" stroke="#3b82f6" dot={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="price-stats-row">
        <span>Avg {fmtRRP(avg)}</span>
        <span className="text-warn">{data.filter(d => d.rrp > 300).length} spike intervals</span>
        <span className="text-danger">{data.filter(d => d.rrp < 0).length} negative intervals</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [nswPrices, setNswPrices] = useState<DispatchPrice[]>([]);
  const [vicPrices, setVicPrices] = useState<DispatchPrice[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [rebids, setRebids] = useState<RebidEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.prices('NSW1', YESTERDAY),
      api.prices('VIC1', YESTERDAY),
      api.leaderboard(YESTERDAY, undefined, 'actual_revenue'),
      api.rebids(YESTERDAY),
    ])
      .then(([nsw, vic, lb, rb]) => {
        setNswPrices(nsw);
        setVicPrices(vic);
        setLeaderboard(lb.slice(0, 10));
        setRebids(rb);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="page-loading">Loading market data…</div>;

  if (error) return (
    <div className="page-error">
      <AlertTriangle size={32} color="#ef4444" />
      <h2>Backend not reachable</h2>
      <p>{error}</p>
      <p className="text-muted">Make sure the Python backend is running on port 8000.<br />
        Run <code>start.bat</code> from the project root.</p>
    </div>
  );

  const totalRevenue = leaderboard.reduce((s, r) => s + (r.actual_revenue || 0), 0);
  const strategicRebids = rebids.filter(r => r.classification === 'strategic').length;
  const avgEfficiency = leaderboard.length
    ? leaderboard.reduce((s, r) => s + (r.revenue_efficiency_pct || 0), 0) / leaderboard.length
    : 0;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Market Dashboard</h1>
        <span className="page-date">{YESTERDAY}</span>
      </div>

      <div className="stat-grid">
        <StatCard
          label="Combined Generator Revenue"
          value={fmt$(totalRevenue)}
          sub="NSW + VIC tracked units"
          icon={DollarSign}
          accent="#10b981"
        />
        <StatCard
          label="Average Revenue Efficiency"
          value={`${avgEfficiency.toFixed(1)}%`}
          sub="actual vs max possible"
          icon={TrendingUp}
          accent="#3b82f6"
        />
        <StatCard
          label="Rebids Yesterday"
          value={String(rebids.length)}
          sub={`${strategicRebids} flagged strategic`}
          icon={RefreshCwIcon}
          accent="#f59e0b"
        />
        <StatCard
          label="NSW1 Peak RRP"
          value={nswPrices.length ? fmtRRP(Math.max(...nswPrices.map(p => p.rrp))) : '—'}
          sub={`${nswPrices.filter(p => p.rrp > 300).length} spike intervals`}
          icon={Zap}
          accent="#ef4444"
        />
      </div>

      <div className="two-col">
        <PriceSparkline data={nswPrices} region="NSW1" />
        <PriceSparkline data={vicPrices} region="VIC1" />
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Revenue Leaderboard — {YESTERDAY}</h3>
          <span className="text-muted text-sm">All tracked NSW + VIC units</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Unit</th>
              <th>Participant</th>
              <th>Region</th>
              <th className="text-right">Energy MWh</th>
              <th className="text-right">Revenue</th>
              <th className="text-right">Efficiency</th>
              <th className="text-right">Price Setter</th>
              <th className="text-right">Rebids</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.length === 0 ? (
              <tr><td colSpan={9} className="text-center text-muted">
                No data — run a sync or check backend logs
              </td></tr>
            ) : leaderboard.map(r => (
              <tr key={r.duid}>
                <td className="text-muted">{r.rank}</td>
                <td>
                  <a href={`/generators?duid=${r.duid}&date=${YESTERDAY}`} className="link">
                    {r.station || r.duid}
                  </a>
                </td>
                <td className="text-muted">{r.participant}</td>
                <td><span className="badge badge-region">{r.region_id}</span></td>
                <td className="text-right">{(r.total_energy_mwh || 0).toLocaleString()}</td>
                <td className="text-right text-green">{fmt$(r.actual_revenue || 0)}</td>
                <td className="text-right">
                  <span className={r.revenue_efficiency_pct < 70 ? 'text-warn' : 'text-green'}>
                    {(r.revenue_efficiency_pct || 0).toFixed(1)}%
                  </span>
                </td>
                <td className="text-right">{r.intervals_price_setter}</td>
                <td className="text-right">
                  {r.rebid_count > 0 && (
                    <span className={r.strategic_rebid_count > 0 ? 'text-warn' : ''}>
                      {r.rebid_count}
                      {r.strategic_rebid_count > 0 && ` (${r.strategic_rebid_count}⚠)`}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rebids.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>Rebid Activity — {YESTERDAY}</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Unit</th>
                <th>Participant</th>
                <th>Avail Change</th>
                <th>RRP at Rebid</th>
                <th>RRP 5min After</th>
                <th>Classification</th>
              </tr>
            </thead>
            <tbody>
              {rebids.map(r => (
                <tr key={r.id}>
                  <td className="mono">{r.rebid_at.slice(11, 16)}</td>
                  <td>{r.station || r.duid}</td>
                  <td className="text-muted">{r.participant}</td>
                  <td>
                    <span className={r.new_max_avail > r.prior_max_avail ? 'text-green' : 'text-danger'}>
                      {r.prior_max_avail.toFixed(0)} → {r.new_max_avail.toFixed(0)} MW
                    </span>
                  </td>
                  <td className="mono">{r.rrp_at_rebid != null ? fmtRRP(r.rrp_at_rebid) : '—'}</td>
                  <td className={`mono ${(r.rrp_5min_after || 0) > 300 ? 'text-warn' : ''}`}>
                    {r.rrp_5min_after != null ? fmtRRP(r.rrp_5min_after) : '—'}
                  </td>
                  <td>
                    <span className={`badge ${
                      r.classification === 'strategic'   ? 'badge-danger' :
                      r.classification === 'operational' ? 'badge-ok' : 'badge-neutral'
                    }`}>
                      {r.classification}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// inline icon to avoid import issues
function RefreshCwIcon({ size }: { size: number }) {
  return <RefreshCw size={size} />;
}

import { RefreshCw } from 'lucide-react';
