import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Play, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { LOCATIONS, DATASETS, getSource } from '../config';
import { formatDateTime } from '../lib/time';
import { FreshBadge } from '../components/Badges';
import { Loading } from '../components/States';
import {
  HttpError, adminAudit, adminFeeds, adminHealth, adminRules, adminRunIngestion, normaliseSourceId, parseUtc,
  type AdminAudit, type AdminFeed, type AdminRule, type AdminRun, type Health,
} from '../api/client';

const when = (s: string | null) => (s ? formatDateTime(parseUtc(s)) : '–');
const locName = (id: string) => LOCATIONS.find((l) => l.id === id)?.name ?? id;
const dsLabel = (key: string) => DATASETS.find((d) => d.key === key)?.label ?? key;

/** Operations console backed by the real /api/v1/admin endpoints. */
export default function AdminLive() {
  const { signOut } = useAuth();
  const { reload } = useData();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [health, setHealth] = useState<Health>();
  const [feeds, setFeeds] = useState<AdminFeed[]>([]);
  const [runs, setRuns] = useState<AdminRun[]>([]);
  const [rules, setRules] = useState<AdminRule[]>([]);
  const [audit, setAudit] = useState<AdminAudit[]>([]);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [h, f, r, a] = await Promise.all([adminHealth(), adminFeeds(), adminRules(), adminAudit()]);
      setHealth(h); setFeeds(f.feeds); setRuns(f.recent_runs); setRules(r); setAudit(a);
      setError(undefined);
    } catch (e) {
      if (e instanceof HttpError && e.status === 401) { signOut(); return; }
      setError(e instanceof Error ? e.message : 'Could not load operations data.');
    } finally {
      setLoading(false);
    }
  }, [signOut]);

  useEffect(() => { void load(); }, [load]);

  const runNow = async () => {
    setRunning(true);
    try {
      await adminRunIngestion();
      reload();
      await load();
    } catch (e) {
      if (e instanceof HttpError && e.status === 401) { signOut(); return; }
      setError(e instanceof Error ? e.message : 'Ingestion failed.');
    } finally {
      setRunning(false);
    }
  };

  const feedsOk = health?.feeds.status === 'healthy';
  const lastOk = runs.find((r) => r.status === 'success');

  return (
    <div className="container section page">
      <div className="row-between">
        <h1>Operations</h1>
        <div className="cmd-actions">
          <button className="btn" onClick={() => void load()} disabled={loading}><RefreshCw size={16} aria-hidden /> Refresh</button>
          <button className="btn btn-primary" onClick={runNow} disabled={running}><Play size={16} aria-hidden /> {running ? 'Running…' : 'Run ingestion now'}</button>
        </div>
      </div>

      {error && <div className="notice notice-warn" role="alert"><ShieldAlert size={18} aria-hidden /><div><strong>Could not complete the request.</strong> {error}</div></div>}

      <h2 id="health">Health</h2>
      {loading && !health ? <Loading /> : (
        <div className="health-grid">
          <div className="card health">
            <h3>Application</h3>
            {health?.status === 'ok' ? <p className="ok"><CheckCircle2 aria-hidden /> Running</p> : <p className="bad"><XCircle aria-hidden /> {health?.status ?? 'Unknown'}</p>}
            <small>Database: {health?.app.database ?? 'unknown'}. Mirrors <code>GET /api/v1/health</code>.</small>
          </div>
          <div className="card health">
            <h3>Data feeds</h3>
            {feedsOk ? <p className="ok"><CheckCircle2 aria-hidden /> Healthy</p> : <p className="warn"><ShieldAlert aria-hidden /> {health?.feeds.status === 'degraded' ? 'Degraded: stale or missing data' : (health?.feeds.status ?? 'Unknown')}</p>}
            <small>Last successful sync: {lastOk ? when(lastOk.completed_at ?? lastOk.started_at) : 'none yet'}. Reported separately from application health (FR-021).</small>
          </div>
        </div>
      )}

      <h2 id="freshness">Feed freshness by dataset</h2>
      {loading && !feeds.length ? <Loading /> : (
        <div className="table-scroll">
          <table>
            <thead><tr><th>Location</th><th>Dataset</th><th>Last source timestamp</th><th>Age</th><th>Limit</th><th>Status</th></tr></thead>
            <tbody>
              {feeds.map((f) => (
                <tr key={`${f.location_id}:${f.dataset}`}>
                  <td>{locName(f.location_id)}</td><td>{dsLabel(f.dataset)}</td>
                  <td>{when(f.source_timestamp)}</td>
                  <td>{f.age_minutes != null ? `${f.age_minutes} min` : '–'}</td>
                  <td>{f.limit_minutes} min</td>
                  <td><FreshBadge status={f.status} /></td>
                </tr>
              ))}
              {!feeds.length && <tr><td colSpan={6}>No feeds reported.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <h2 id="runs">Ingestion runs</h2>
      <p className="muted">Last successful sync: {lastOk ? when(lastOk.completed_at ?? lastOk.started_at) : 'none'}</p>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Run ID</th><th>Source</th><th>Started</th><th>Outcome</th><th>Records</th><th>Rejected</th><th>Error category</th></tr></thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.run_id}>
                <td><code>{r.run_id}</code></td><td>{getSource(normaliseSourceId(r.source_id)).name}</td><td>{when(r.started_at)}</td>
                <td>{r.status === 'success' ? <span className="badge fresh-fresh"><CheckCircle2 size={12} aria-hidden /> Success</span> : <span className="badge fresh-empty"><XCircle size={12} aria-hidden /> {r.status}</span>}</td>
                <td>{r.records}</td><td>{r.rejected}</td><td>{r.error_category ?? '–'}</td>
              </tr>
            ))}
            {!runs.length && <tr><td colSpan={7}>No ingestion runs yet. Use “Run ingestion now” to load data.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="muted">Logs carry run ID, source, time, outcome and an error category. They never include secrets (FR-022).</p>

      <h2 id="rules">Alert rule configuration</h2>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Rule</th><th>Condition</th><th>Suppression</th><th>Valid for</th><th>Enabled</th><th>Review status</th></tr></thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}><td>{r.name}</td><td>{dsLabel(r.dataset)} {r.operator} {r.threshold} {r.unit}</td><td>{r.suppression_hours} h</td><td>{r.validity_hours} h</td><td>{r.enabled ? 'Yes' : 'No'}</td><td>{r.review_status}</td></tr>
            ))}
            {!rules.length && <tr><td colSpan={6}>No rules configured.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 id="audit">Audit trail</h2>
      <div className="table-scroll">
        <table>
          <thead><tr><th>When</th><th>Who</th><th>Change</th></tr></thead>
          <tbody>
            {audit.map((a, i) => <tr key={`${a.at}:${i}`}><td>{when(a.at)}</td><td>{a.actor}</td><td>{a.action}{a.target ? `: ${a.target}` : ''}</td></tr>)}
            {!audit.length && <tr><td colSpan={3}>No audited changes yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
