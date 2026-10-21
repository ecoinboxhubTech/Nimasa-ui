import { Link } from 'react-router-dom';
import { CheckCircle2, ShieldAlert, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ALERT_RULES, DATASETS, LOCATIONS, getSource, seriesKey } from '../config';
import { ageMinutes } from '../lib/freshness';
import { formatDateTime } from '../lib/time';
import { FreshBadge } from '../components/Badges';
import { Loading } from '../components/States';
import type { FeedMode } from '../types';

const AUDIT = [
  { at: '2026-10-12 09:14 WAT', who: 'admin (sample)', what: 'Created rule “High wave height advisory” (threshold 2.0 m)' },
  { at: '2026-10-12 09:20 WAT', who: 'admin (sample)', what: 'Enabled source “BlueIntel sample generator”' },
  { at: '2026-10-15 16:02 WAT', who: 'admin (sample)', what: 'Set wind freshness limit to 120 min' },
];

export default function Admin() {
  const { isAdmin, signIn, signOut } = useAuth();
  const { status, bundle, now, mode, setMode, reload, getFresh, getSeries } = useData();

  if (!isAdmin) {
    return (
      <div className="container section page narrow">
        <h1>Operations sign-in</h1>
        <div className="notice notice-warn">
          <ShieldAlert size={18} aria-hidden />
          <div><strong>Demo placeholder.</strong> There is no real authentication in this build. Production must enforce server-side authentication and role-based authorisation before exposing source or alert configuration (NFR-006, FR-023).</div>
        </div>
        <p>The operations view shows feed health, ingestion runs, and controls to simulate stale or failed feeds so every error state can be reviewed.</p>
        <button className="btn btn-primary" onClick={signIn}>Continue as demo administrator</button>
        <p><Link to="/" className="inline-link">← Back to dashboard</Link></p>
      </div>
    );
  }

  const modes: { key: FeedMode; label: string; help: string }[] = [
    { key: 'normal', label: 'Normal', help: 'Feed is current.' },
    { key: 'stale', label: 'Stale feed', help: 'Source is 8 h behind. Wave and wind become stale; alerts are suppressed.' },
    { key: 'error', label: 'Service error', help: 'Data service is unreachable. Cached values are labelled, or an error is shown.' },
  ];

  return (
    <div className="container section page">
      <div className="row-between">
        <h1>Operations</h1>
        <button className="btn" onClick={signOut}>Sign out</button>
      </div>
      <div className="notice notice-info"><div>Demo operations view with sample data. No configuration changes are persisted.</div></div>

      <h2>Health</h2>
      <div className="health-grid">
        <div className="card health">
          <h3>Application</h3>
          <p className="ok"><CheckCircle2 aria-hidden /> Running</p>
          <small>Front-end is serving. Mirrors <code>GET /api/v1/health</code>.</small>
        </div>
        <div className="card health">
          <h3>Data feeds</h3>
          {status === 'error' ? <p className="bad"><XCircle aria-hidden /> Unreachable</p>
            : DATASETS.some((d) => getFresh('lekki', d.key) === 'stale') ? <p className="warn"><ShieldAlert aria-hidden /> Degraded: stale data</p>
            : <p className="ok"><CheckCircle2 aria-hidden /> Healthy</p>}
          <small>Application health and upstream feed health are reported separately (FR-021).</small>
        </div>
      </div>

      <h2>Simulate feed conditions</h2>
      <div className="mode-grid" role="radiogroup" aria-label="Simulated feed condition">
        {modes.map((m) => (
          <button key={m.key} role="radio" aria-checked={mode === m.key} className={`mode ${mode === m.key ? 'on' : ''}`} onClick={() => setMode(m.key)}>
            <strong>{m.label}</strong>
            <span>{m.help}</span>
          </button>
        ))}
      </div>

      <h2>Feed freshness by dataset</h2>
      {status === 'loading' && !bundle ? <Loading /> : (
        <div className="table-scroll">
          <table>
            <thead><tr><th>Location</th><th>Dataset</th><th>Last source timestamp</th><th>Age</th><th>Limit</th><th>Status</th></tr></thead>
            <tbody>
              {LOCATIONS.flatMap((l) => DATASETS.map((d) => {
                const s = getSeries(l.id, d.key);
                const age = ageMinutes(s?.sourceTimestamp ?? null, now);
                return (
                  <tr key={seriesKey(l.id, d.key)}>
                    <td>{l.name}</td><td>{d.label}</td>
                    <td>{s?.sourceTimestamp ? formatDateTime(s.sourceTimestamp) : '–'}</td>
                    <td>{age != null ? `${age} min` : '–'}</td>
                    <td>{d.staleAfterMinutes} min</td>
                    <td><FreshBadge status={getFresh(l.id, d.key)} /></td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Ingestion runs</h2>
      <p className="muted">Last successful sync: {(() => { const r = bundle?.runs.find((x) => x.status === 'success'); return r ? formatDateTime(r.completedAt) : 'none'; })()}</p>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Run ID</th><th>Source</th><th>Started</th><th>Outcome</th><th>Records</th><th>Rejected</th><th>Error category</th></tr></thead>
          <tbody>
            {(bundle?.runs ?? []).slice(0, 12).map((r) => (
              <tr key={r.id}>
                <td><code>{r.id}</code></td><td>{getSource(r.sourceId).name}</td><td>{formatDateTime(r.startedAt)}</td>
                <td>{r.status === 'success' ? <span className="badge fresh-fresh"><CheckCircle2 size={12} aria-hidden /> Success</span> : <span className="badge fresh-empty"><XCircle size={12} aria-hidden /> Failed</span>}</td>
                <td>{r.records}</td><td>{r.rejected}</td><td>{r.errorCategory ?? '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">Logs carry run ID, source, time, outcome and an error category. They never include secrets (FR-022).</p>

      <h2>Alert rule configuration</h2>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Rule</th><th>Threshold</th><th>Suppression</th><th>Enabled</th></tr></thead>
          <tbody>{ALERT_RULES.map((r) => <tr key={r.id}><td>{r.name}</td><td>{r.threshold} {r.unit}</td><td>{r.suppressionHours} h</td><td>{r.enabled ? 'Yes' : 'No'}</td></tr>)}</tbody>
        </table>
      </div>

      <h2>Audit trail (sample)</h2>
      <div className="table-scroll">
        <table>
          <thead><tr><th>When</th><th>Who</th><th>Change</th></tr></thead>
          <tbody>{AUDIT.map((a) => <tr key={a.at}><td>{a.at}</td><td>{a.who}</td><td>{a.what}</td></tr>)}</tbody>
        </table>
      </div>
      <p><button className="btn" onClick={reload}>Reload data</button></p>
    </div>
  );
}
