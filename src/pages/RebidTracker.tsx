import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { api } from '../api/client';
import type { RebidEvent, RebidSummary } from '../types/nem';

const YESTERDAY = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

const CLASS_CONFIG = {
  strategic:   { icon: AlertTriangle, colour: '#ef4444', label: 'Strategic' },
  operational: { icon: CheckCircle,   colour: '#10b981', label: 'Operational' },
  ambiguous:   { icon: HelpCircle,    colour: '#f59e0b', label: 'Ambiguous' },
};

export default function RebidTracker() {
  const [date, setDate] = useState(YESTERDAY);
  const [events, setEvents] = useState<RebidEvent[]>([]);
  const [summary, setSummary] = useState<RebidSummary[]>([]);
  const [classFilter, setClassFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.rebids(date),
      api.rebidSummary(30),
    ]).then(([ev, sum]) => {
      setEvents(ev);
      setSummary(sum);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [date]);

  const filtered = classFilter === 'all'
    ? events
    : events.filter(e => e.classification === classFilter);

  const strategicCount   = events.filter(e => e.classification === 'strategic').length;
  const operationalCount = events.filter(e => e.classification === 'operational').length;
  const ambiguousCount   = events.filter(e => e.classification === 'ambiguous').length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Rebid Tracker</h1>
          <p className="page-sub">
            Rebid detection · P5MIN cross-reference · NER clause 3.8.22 classification
          </p>
        </div>
        <input
          type="date"
          className="input"
          value={date}
          max={YESTERDAY}
          onChange={e => setDate(e.target.value)}
        />
      </div>

      <div className="info-box">
        <strong>NEM Rule Context:</strong> Under NER clause 3.8.22(b), generators must not rebid
        for commercial reasons — i.e. to take advantage of anticipated price movements.
        AEMO and the AER monitor rebid patterns. A "strategic" flag here means the rebid
        timing, direction (availability increase), and price outcome are consistent with
        commercially-motivated behaviour. This is analytical, not a legal finding.
      </div>

      <div className="stat-grid-3">
        <div className="stat-card" style={{ borderColor: '#ef4444' }}>
          <AlertTriangle size={20} color="#ef4444" />
          <div>
            <div className="stat-value text-danger">{strategicCount}</div>
            <div className="stat-label">Strategic Flagged</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderColor: '#10b981' }}>
          <CheckCircle size={20} color="#10b981" />
          <div>
            <div className="stat-value text-green">{operationalCount}</div>
            <div className="stat-label">Operational</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderColor: '#f59e0b' }}>
          <HelpCircle size={20} color="#f59e0b" />
          <div>
            <div className="stat-value text-warn">{ambiguousCount}</div>
            <div className="stat-label">Ambiguous</div>
          </div>
        </div>
      </div>

      {summary.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>Rebid Frequency — Last 30 Days by Unit</h3>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary} margin={{ top: 4, right: 8, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="duid" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} stroke="#475569" />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', fontSize: 11 }} />
                <Bar dataKey="strategic"   name="Strategic"   fill="#ef4444" stackId="a" />
                <Bar dataKey="ambiguous"   name="Ambiguous"   fill="#f59e0b" stackId="a" />
                <Bar dataKey="operational" name="Operational" fill="#10b981" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>Rebid Events — {date}</h3>
          <div className="filter-tabs">
            {['all', 'strategic', 'operational', 'ambiguous'].map(c => (
              <button
                key={c}
                className={`filter-tab ${classFilter === c ? 'active' : ''}`}
                onClick={() => setClassFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center text-muted p-8">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted p-8">No rebid events found for this date</div>
        ) : (
          <div className="rebid-list">
            {filtered.map(r => {
              const cfg = CLASS_CONFIG[r.classification];
              const Icon = cfg.icon;
              const availUp = r.new_max_avail > r.prior_max_avail;
              return (
                <div key={r.id} className="rebid-item">
                  <div className="rebid-class-icon" style={{ color: cfg.colour }}>
                    <Icon size={18} />
                  </div>
                  <div className="rebid-body">
                    <div className="rebid-header-row">
                      <strong>{r.station || r.duid}</strong>
                      <span className="text-muted">{r.participant}</span>
                      <span className="mono text-sm">{r.rebid_at.slice(11, 16)}</span>
                      <span className={`badge ${
                        r.classification === 'strategic'   ? 'badge-danger' :
                        r.classification === 'operational' ? 'badge-ok' : 'badge-warn'
                      }`}>{r.classification}</span>
                    </div>
                    <div className="rebid-detail-row">
                      <span>
                        Availability: {r.prior_max_avail.toFixed(0)} →{' '}
                        <strong className={availUp ? 'text-green' : 'text-danger'}>
                          {r.new_max_avail.toFixed(0)} MW
                        </strong>
                        {' '}({availUp ? '+' : ''}{(r.new_max_avail - r.prior_max_avail).toFixed(0)} MW)
                      </span>
                    </div>
                    <div className="rebid-price-row">
                      <span className="price-chip">
                        RRP at rebid: <strong>${(r.rrp_at_rebid ?? 0).toFixed(2)}/MWh</strong>
                      </span>
                      <span className={`price-chip ${(r.rrp_5min_after ?? 0) > 300 ? 'price-chip-warn' : ''}`}>
                        RRP 5min later: <strong>${(r.rrp_5min_after ?? 0).toFixed(2)}/MWh</strong>
                      </span>
                      {r.p5min_price_forecast != null && (
                        <span className="price-chip">
                          P5MIN forecast: <strong>${r.p5min_price_forecast.toFixed(2)}/MWh</strong>
                        </span>
                      )}
                    </div>
                    {r.rebid_explanation && (
                      <div className="rebid-reason">
                        <span className="text-muted text-sm">Reason: </span>
                        <span className="text-sm">{r.rebid_explanation}</span>
                      </div>
                    )}
                    {r.classification === 'strategic' && (
                      <div className="rebid-flag">
                        ⚠ Availability increased before a price spike visible in P5MIN forecasts.
                        Pattern is consistent with commercially-motivated rebid under NER 3.8.22.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
