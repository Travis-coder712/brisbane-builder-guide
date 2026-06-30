import { useEffect, useState } from 'react';
import { RefreshCw, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../api/client';

interface StatusData {
  table_counts: Record<string, number>;
  last_ingests: { report_type: string; last_ingest: string; total_rows: number }[];
  db_path: string;
}

export default function DataStatus() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [loading, setLoading] = useState(true);

  function loadStatus() {
    api.status().then(s => { setStatus(s as StatusData); setLoading(false); }).catch(() => setLoading(false));
  }

  useEffect(() => { loadStatus(); }, []);

  function triggerSync(days: number) {
    setSyncing(true);
    setSyncMsg('');
    api.sync(days)
      .then(() => { setSyncMsg(`Sync started for last ${days} day(s). Refresh status in 30–60s.`); setSyncing(false); })
      .catch(e => { setSyncMsg(`Error: ${e.message}`); setSyncing(false); });
  }

  const totalRows = status
    ? Object.values(status.table_counts).reduce((s, n) => s + n, 0)
    : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Data Status</h1>
          <p className="page-sub">NEMWeb ingestion log · SQLite database · Manual sync controls</p>
        </div>
        <div className="header-controls">
          <button className="btn btn-secondary" onClick={loadStatus}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary" disabled={syncing} onClick={() => triggerSync(1)}>
            {syncing ? 'Syncing…' : 'Sync Yesterday'}
          </button>
          <button className="btn btn-secondary" disabled={syncing} onClick={() => triggerSync(7)}>
            Sync 7 Days
          </button>
        </div>
      </div>

      {syncMsg && <div className="info-box">{syncMsg}</div>}

      {loading && <div className="page-loading">Connecting to backend…</div>}

      {!loading && !status && (
        <div className="page-error">
          <AlertCircle size={32} color="#ef4444" />
          <h2>Backend not reachable</h2>
          <p>Run <code>start.bat</code> from the project root to start the Python backend.</p>
        </div>
      )}

      {status && (
        <>
          <div className="card">
            <div className="card-header">
              <h3><Database size={16} /> Database Overview</h3>
            </div>
            <div className="status-grid">
              <div className="status-item">
                <div className="status-value">{totalRows.toLocaleString()}</div>
                <div className="status-label">Total Rows</div>
              </div>
              <div className="status-item">
                <div className="status-value">{Object.keys(status.table_counts).length}</div>
                <div className="status-label">Tables</div>
              </div>
              <div className="status-item mono text-sm">
                {status.db_path}
              </div>
            </div>
            <table className="data-table">
              <thead>
                <tr><th>Table</th><th className="text-right">Row Count</th><th>Status</th></tr>
              </thead>
              <tbody>
                {Object.entries(status.table_counts).map(([table, count]) => (
                  <tr key={table}>
                    <td className="mono">{table}</td>
                    <td className="text-right">{count.toLocaleString()}</td>
                    <td>
                      {count > 0
                        ? <span className="badge badge-ok"><CheckCircle size={10} /> populated</span>
                        : <span className="badge badge-warn">empty — run sync</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Last Ingestion by Report Type</h3>
            </div>
            {status.last_ingests.length === 0 ? (
              <div className="text-center text-muted p-8">No data ingested yet. Click "Sync Yesterday" to fetch NEMWeb data.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Report</th>
                    <th>Last Ingested</th>
                    <th className="text-right">Total Rows</th>
                  </tr>
                </thead>
                <tbody>
                  {status.last_ingests.map(r => (
                    <tr key={r.report_type}>
                      <td className="mono">{r.report_type}</td>
                      <td>{r.last_ingest || '—'}</td>
                      <td className="text-right">{r.total_rows?.toLocaleString() || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <div className="card-header"><h3>NEM Data Sources</h3></div>
            <table className="data-table">
              <thead>
                <tr><th>Report</th><th>What it provides</th><th>Route</th><th>Size</th></tr>
              </thead>
              <tbody>
                {[
                  ['Public_Prices',    '5-min RRP for all regions',                          'Direct', '~8 MB/mo'],
                  ['Bidmove_Complete', 'All 504 participant bids (price + quantity bands)',   'Python', '~216 MB/mo'],
                  ['Next_Day_Dispatch','Cleared MW, availability, constraints per interval', 'Python', '~193 MB/mo'],
                  ['Daily_Reports',   'DUNIT MARGINALVALUE, FCAS aggregate prices',          'Direct', 'TBC'],
                  ['Dispatch_SCADA',  'Unit MW output 5-min (actual generation)',            'Python', '~60 MB/day'],
                  ['P5MIN',           'FCAS live prices, LOCAL_PRICE setter flag',           'Direct', '51 MB/day'],
                  ['STPASA',          'Reserve adequacy, structural surplus signal',         'Direct', 'Hourly'],
                  ['HistDemand',      '30-min settlement demand by region',                  'Direct', '~1 MB/mo'],
                ].map(([r, desc, route, size]) => (
                  <tr key={r}>
                    <td className="mono">{r}</td>
                    <td className="text-sm text-muted">{desc}</td>
                    <td><span className={`badge ${route === 'Python' ? 'badge-warn' : 'badge-ok'}`}>{route}</span></td>
                    <td className="text-sm text-muted">{size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
