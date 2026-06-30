import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Cell,
} from 'recharts';
import { api } from '../api/client';
import type { Generator, BidData } from '../types/nem';

const YESTERDAY = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const BAND_COLOURS = [
  '#1e40af','#1d4ed8','#2563eb','#3b82f6','#60a5fa',
  '#f59e0b','#f97316','#ef4444','#dc2626','#b91c1c',
];

export default function BidAnalysis() {
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [duid, setDuid] = useState('');
  const [date, setDate] = useState(YESTERDAY);
  const [bidData, setBidData] = useState<BidData | null>(null);
  const [rrp, setRrp] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.generators().then(setGenerators).catch(() => {}); }, []);

  useEffect(() => {
    if (!duid) return;
    setLoading(true);
    Promise.all([
      api.bids(duid, date).catch(() => null),
      api.prices('NSW1', date).catch(() => []),
    ]).then(([bd, prices]) => {
      setBidData(bd);
      const avg = prices.length ? prices.reduce((s: number, p: any) => s + p.rrp, 0) / prices.length : null;
      setRrp(avg);
      setLoading(false);
    });
  }, [duid, date]);

  const chartData = bidData?.bid_stack
    .sort((a, b) => a.price - b.price)
    .map(b => ({ name: `Band ${b.band}`, price: b.price, mw: b.mw })) || [];

  // Cumulative supply curve
  let cumMW = 0;
  const supplyCurve = chartData.map(b => {
    cumMW += b.mw;
    return { ...b, cumMW };
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Bid Stack Analysis</h1>
          <p className="page-sub">Price-band structure · Supply curve · Availability history</p>
        </div>
        <div className="header-controls">
          <select className="select" value={duid} onChange={e => setDuid(e.target.value)}>
            <option value="">— Select unit —</option>
            {generators.map(g =>
              g.duids.map(d => (
                <option key={d} value={d}>{g.station} / {d}</option>
              ))
            )}
          </select>
          <input type="date" className="input" value={date} max={YESTERDAY}
            onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      {!duid && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h2>Select a unit to view its bid stack</h2>
          <p>The bid stack shows the 10 price-quantity bands submitted for each trading day</p>
        </div>
      )}

      {loading && <div className="page-loading">Loading bid data…</div>}

      {!loading && bidData && (
        <>
          <div className="card">
            <div className="card-header">
              <h3>Bid Stack — {duid} · {date}</h3>
              {bidData.offer_datetime && (
                <span className="text-muted text-sm">Offer submitted: {bidData.offer_datetime}</span>
              )}
            </div>

            <div className="two-col">
              {/* Band table */}
              <div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Band</th>
                      <th className="text-right">Price $/MWh</th>
                      <th className="text-right">MW Offered</th>
                      <th>Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bidData.bid_stack.sort((a, b) => a.price - b.price).map(b => {
                      const isCheap = b.price < 0;
                      const isSpike = b.price > 300;
                      return (
                        <tr key={b.band}>
                          <td>
                            <span className="band-dot" style={{ background: BAND_COLOURS[b.band - 1] }} />
                            Band {b.band}
                          </td>
                          <td className={`text-right mono ${isCheap ? 'text-green' : isSpike ? 'text-danger' : ''}`}>
                            ${b.price.toLocaleString()}
                          </td>
                          <td className="text-right">{b.mw.toFixed(0)} MW</td>
                          <td>
                            <span className={`badge ${isCheap ? 'badge-ok' : isSpike ? 'badge-danger' : 'badge-neutral'}`}>
                              {isCheap ? 'Baseload' : isSpike ? 'Spike / Strategic' : 'Market'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bar chart */}
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={supplyCurve} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="cumMW" type="number" tick={{ fontSize: 9 }} stroke="#475569"
                      label={{ value: 'Cumulative MW', position: 'insideBottom', fill: '#64748b', fontSize: 10, offset: -4 }} />
                    <YAxis dataKey="price" type="number" tick={{ fontSize: 10 }} stroke="#475569"
                      tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`}
                      label={{ value: '$/MWh', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', fontSize: 11 }}
                      formatter={(v: unknown, n: unknown) => (n === 'price' ? [`$${v}/MWh`, 'Band Price'] : [v, n]) as [string, string]} />
                    {rrp && <ReferenceLine y={rrp} stroke="#f59e0b" strokeDasharray="4 2"
                      label={{ value: `Avg RRP $${rrp.toFixed(0)}`, fill: '#f59e0b', fontSize: 10 }} />}
                    <Bar dataKey="price" name="price">
                      {supplyCurve.map((_, i) => (
                        <Cell key={i} fill={BAND_COLOURS[i % BAND_COLOURS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="chart-note text-center">Supply curve: bid price vs cumulative MW</div>
              </div>
            </div>
          </div>

          {bidData.availability_history.length > 1 && (
            <div className="card">
              <div className="card-header">
                <h3>Availability History (Rebids Detected)</h3>
                <span className="badge badge-warn">{bidData.availability_history.length - 1} rebid(s)</span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Offer Time</th>
                    <th className="text-right">Max Avail MW</th>
                    <th className="text-right">Band 1</th>
                    <th className="text-right">Band 6</th>
                    <th className="text-right">Band 10</th>
                    <th>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {bidData.availability_history.map((h, i) => {
                    const prev = bidData.availability_history[i - 1];
                    const delta = prev ? h.max_avail - prev.max_avail : null;
                    return (
                      <tr key={i}>
                        <td className="mono text-sm">{h.offer_datetime.slice(5)}</td>
                        <td className="text-right">{h.max_avail?.toFixed(0)}</td>
                        <td className="text-right">{h.band_avail1?.toFixed(0)}</td>
                        <td className="text-right">{h.band_avail6?.toFixed(0)}</td>
                        <td className="text-right">{h.band_avail10?.toFixed(0)}</td>
                        <td>
                          {delta !== null && (
                            <span className={delta > 0 ? 'text-green' : delta < 0 ? 'text-danger' : ''}>
                              {delta > 0 ? '+' : ''}{delta.toFixed(0)} MW
                              {i > 0 ? ' ← REBID' : ''}
                            </span>
                          )}
                          {i === 0 && <span className="text-muted">Initial bid</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
