import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Activity, Bell, CheckCircle2, Code2, Copy, Database, Gauge, HeartPulse, KeyRound, ListChecks,
  MapPin, Play, Plus, RefreshCw, Send, ShieldAlert, ShieldCheck, Users, XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { formatDateTime } from '../lib/time';
import { FreshBadge } from '../components/Badges';
import { Loading } from '../components/States';
import {
  HttpError, adminAudit, adminCreateJob, adminCreateKey, adminCreateLocation, adminCreateRule, adminCreateStaffRole,
  adminCreateTarget, adminDeleteLocation, adminDeleteRule, adminDeleteTarget, adminDispatchNotifications, adminFeeds,
  adminHealth, adminJobs, adminKeys, adminLocations, adminMfaDisable, adminMfaEnable, adminMfaSetup,
  adminNotifications, adminQuality, adminRotateKey, adminRules, adminRunIngestion, adminRunJobs, adminSetSource,
  adminSetStaleAfter, adminStaffUsers, adminTargets, adminTestTarget, adminUpdateKey, adminUpdateLocation,
  adminUpdateStaffRole, adminUpdateTarget, adminChangePassword, adminPatchRule, adminUpdateDataset,
  type AdminAudit, type AdminFeed, type AdminJob, type AdminKey, type AdminLocation, type AdminNotification,
  type AdminRule, type AdminRun, type AdminStaffUser, type AdminTarget, type Health, type SourceDto, type AdminUser, type ApiUsage,
  fetchSources,
} from '../api/client';
import type { AlertCategory, DatasetMeta, QualitySummary, SourceMeta } from '../types';

const when = (s: string | null) => (s ? formatDateTime(new Date(s).getTime()) : '-');
const ZONES = ['coastal', 'waterway', 'offshore'] as const;
const CATEGORIES: AlertCategory[] = ['coastal', 'ocean_navigation', 'waterway_navigation'];

type Tab = 'operations' | 'sources' | 'rules' | 'locations' | 'notifications' | 'developers' | 'jobs' | 'staff' | 'profile' | 'audit';

const TABS: { id: Tab; label: string; icon: typeof HeartPulse; admin?: boolean }[] = [
  { id: 'operations', label: 'Operations', icon: HeartPulse },
  { id: 'sources', label: 'Sources', icon: Database },
  { id: 'rules', label: 'Alert rules', icon: ListChecks },
  { id: 'locations', label: 'Locations', icon: MapPin },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'developers', label: 'API keys', icon: Code2 },
  { id: 'jobs', label: 'Jobs & quality', icon: Gauge },
  { id: 'staff', label: 'Staff', icon: Users, admin: true },
  { id: 'profile', label: 'My account', icon: ShieldCheck },
  { id: 'audit', label: 'Audit trail', icon: Activity },
];

export default function AdminLive() {
  const { signOut, user, role, canEdit, canAdmin } = useAuth();
  const { reload, datasets, locations: publicLocations } = useData();
  const [tab, setTab] = useState<Tab>('operations');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const [health, setHealth] = useState<Health>();
  const [feeds, setFeeds] = useState<AdminFeed[]>([]);
  const [runs, setRuns] = useState<AdminRun[]>([]);
  const [audit, setAudit] = useState<AdminAudit[]>([]);
  const [rules, setRules] = useState<AdminRule[]>([]);
  const [locations, setLocations] = useState<AdminLocation[]>([]);
  const [sources, setSources] = useState<SourceDto[]>([]);
  const [targets, setTargets] = useState<AdminTarget[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [keys, setKeys] = useState<AdminKey[]>([]);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [quality, setQuality] = useState<QualitySummary>();
  const [staff, setStaff] = useState<AdminStaffUser[]>([]);
  const [rawKey, setRawKey] = useState<string>();
  const [running, setRunning] = useState(false);
  const { hash } = useLocation();

  useEffect(() => {
    const id = hash.replace('#', '') as Tab;
    if (TABS.some((t) => t.id === id)) setTab(id);
  }, [hash]);

  const fail = useCallback((e: unknown, fallback: string) => {
    if (e instanceof HttpError && e.status === 401) { signOut(); return; }
    setError(e instanceof HttpError ? `${e.message} (${e.code})` : e instanceof Error ? e.message : fallback);
  }, [signOut]);

  const load = useCallback(async () => {
    setLoading(true); setError(undefined);
    try {
      if (tab === 'operations') {
        const [h, f] = await Promise.all([adminHealth(), adminFeeds()]);
        setHealth(h); setFeeds(f.feeds); setRuns(f.recent_runs);
      } else if (tab === 'sources') {
        setSources(await fetchSources());
      } else if (tab === 'rules') {
        const [r, l] = await Promise.all([adminRules(), adminLocations()]);
        setRules(r); setLocations(l);
      } else if (tab === 'locations') setLocations(await adminLocations());
      else if (tab === 'notifications') {
        const [t, n] = await Promise.all([adminTargets(), adminNotifications()]);
        setTargets(t); setNotifications(n);
      } else if (tab === 'developers') setKeys(await adminKeys());
      else if (tab === 'jobs') {
        const [j, q] = await Promise.all([adminJobs(), adminQuality()]);
        setJobs(j); setQuality(q);
      } else if (tab === 'staff') setStaff(await adminStaffUsers());
      else if (tab === 'audit') setAudit(await adminAudit());
    } catch (e) { fail(e, 'Could not load operations data.'); }
    finally { setLoading(false); }
  }, [tab, fail]);

  useEffect(() => { void load(); }, [load]);

  const act = async (work: () => Promise<unknown>, success: string) => {
    setError(undefined); setNotice(undefined); setRunning(true);
    try { await work(); setNotice(success); await load(); if (tab === 'operations' || tab === 'sources') reload(); }
    catch (e) { fail(e, 'The request failed.'); }
    finally { setRunning(false); }
  };

  const runNow = () => act(async () => { await adminRunIngestion(); }, 'Ingestion finished.');

  return (
    <div className="container section page">
      <div className="row-between">
        <div>
          <h1>Operations</h1>
          <p className="muted">Signed in as {user?.email ?? 'operations staff'} — <span className="badge">{role ?? 'viewer'}</span> {canEdit ? 'edit access' : 'read-only'}</p>
        </div>
        <div className="cmd-actions">
          <button className="btn" onClick={() => void load()} disabled={loading || running}><RefreshCw size={16} aria-hidden /> Refresh</button>
          {tab === 'operations' && canEdit && <button className="btn btn-primary" onClick={() => void runNow()} disabled={running}><Play size={16} aria-hidden /> {running ? 'Running.' : 'Run ingestion now'}</button>}
        </div>
      </div>

      <div className="tabs admin-tabs" role="tablist" aria-label="Operations sections">
        {TABS.filter((t) => !t.admin || canAdmin).map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'tab on' : 'tab'} onClick={() => { setTab(id); setError(undefined); setNotice(undefined); }}>
            <Icon size={16} aria-hidden /> {label}
          </button>
        ))}
      </div>

      {error && <div className="notice notice-warn" role="alert"><ShieldAlert size={18} aria-hidden /><div><strong>Request failed.</strong> {error}</div></div>}
      {notice && <div className="notice notice-info" role="status"><CheckCircle2 size={18} aria-hidden /><div>{notice}</div></div>}
      {loading && <Loading />}

      {!loading && tab === 'operations' && <Operations health={health} feeds={feeds} runs={runs} canEdit={canEdit} locations={publicLocations} datasets={datasets} />}
      {!loading && tab === 'sources' && <Sources sources={sources} datasets={datasets} canEdit={canEdit} onToggle={(id, enabled) => (!enabled || window.confirm('Enable this source? Candidate providers require completed licence and coverage review.')) && act(() => adminSetSource(id, enabled), `Source ${enabled ? 'enabled' : 'disabled'}.`)} onStale={(key, mins) => act(() => adminSetStaleAfter(key, mins), 'Freshness threshold updated.')} onSource={(key, id) => act(() => adminUpdateDataset(key, { source_id: id }), 'Dataset source updated.')} />}
      {!loading && tab === 'rules' && <Rules rules={rules} locations={locations} datasets={datasets} canEdit={canEdit} onCreate={(b) => act(() => adminCreateRule(b), 'Alert rule created.')} onPatch={(id, p) => act(() => adminPatchRule(id, p), 'Alert rule updated.')} onDelete={(id) => window.confirm('Delete this alert rule? This cannot be undone.') && act(() => adminDeleteRule(id), 'Alert rule deleted.')} />}
      {!loading && tab === 'locations' && <Locations locations={locations} canEdit={canEdit} onCreate={(b) => act(() => adminCreateLocation(b), 'Location created.')} onPatch={(id, p) => act(() => adminUpdateLocation(id, p), 'Location updated.')} onDelete={(id) => window.confirm('Delete this location? This cannot be undone.') && act(() => adminDeleteLocation(id), 'Location deleted.')} />}
      {!loading && tab === 'notifications' && <Notifications targets={targets} notifications={notifications} canEdit={canEdit} onCreate={(b) => act(() => adminCreateTarget(b), 'Notification target created.')} onToggle={(id, active) => act(() => adminUpdateTarget(id, { active }), 'Target updated.')} onTest={(id) => act(async () => { const r = await adminTestTarget(id); setNotice(`Test delivery: ${r.status}${r.error ? ` — ${r.error}` : ''}`); }, 'Test queued.')} onDelete={(id) => window.confirm('Delete this notification target?') && act(() => adminDeleteTarget(id), 'Target deleted.')} onDispatch={() => act(async () => { const r = await adminDispatchNotifications(); setNotice(`${r.processed} notification(s) dispatched.`); }, 'Dispatch finished.')} />}
      {!loading && tab === 'developers' && <Developers keys={keys} rawKey={rawKey} canEdit={canEdit} onCreate={(name, email, quota, environment) => act(async () => { const k = await adminCreateKey({ name, owner_email: email || undefined, quota_per_day: quota, environment }); setRawKey(k.key); }, 'API key created. Copy it now.')} onRotate={(id) => act(async () => { const k = await adminRotateKey(id); setRawKey(k.key); }, 'API key rotated. Copy it now.')} onToggle={(id, active) => act(() => adminUpdateKey(id, { active }), 'API key updated.')} />}
      {!loading && tab === 'jobs' && <Jobs jobs={jobs} quality={quality} canEdit={canEdit} onCreate={(kind) => act(() => adminCreateJob(kind), 'Job queued.')} onRun={() => act(async () => { const r = await adminRunJobs(); setNotice(`${r.processed} job(s) processed.`); }, 'Jobs processed.')} />}
      {!loading && tab === 'staff' && canAdmin && <Staff staff={staff} me={user} onCreate={(email, password, r) => act(() => adminCreateStaffRole(email, password, r), 'Staff account created.')} onPatch={(id, p) => act(() => adminUpdateStaffRole(id, p), 'Staff account updated. All sessions were revoked.')} />}
      {!loading && tab === 'profile' && <Profile user={user} onPassword={(c, n) => act(() => adminChangePassword(c, n), 'Password changed; other sessions signed out.')} onMfaSetup={() => act(async () => { const s = await adminMfaSetup(); setNotice(`Authenticator secret: ${s.secret} — add it to your app, then enable MFA.`); }, 'Secret generated.')} onMfaEnable={(code) => act(() => adminMfaEnable(code), 'MFA enabled.')} onMfaDisable={(p) => act(() => adminMfaDisable(p), 'MFA disabled.')} />}
      {!loading && tab === 'audit' && <Audit rows={audit} />}
    </div>
  );
}

function Operations({ health, feeds, runs, canEdit, locations, datasets }: { health?: Health; feeds: AdminFeed[]; runs: AdminRun[]; canEdit: boolean; locations: { id: string; name: string }[]; datasets: DatasetMeta[] }) {
  const feedsOk = health?.feeds.status === 'healthy';
  const lastOk = runs.find((r) => r.status === 'success');
  const locationName = (id: string) => locations.find((location) => location.id === id)?.name ?? id;
  const datasetLabel = (key: string) => datasets.find((dataset) => dataset.key === key)?.label ?? key;
  return (
    <>
      <div className="health-grid">
        <div className="card health"><h3>Application</h3>{health?.status === 'ok' ? <p className="ok"><CheckCircle2 aria-hidden /> Running</p> : <p className="bad"><XCircle aria-hidden /> {health?.status ?? 'Unknown'}</p>}<small>Database: {health?.app.database ?? 'unknown'}.</small></div>
        <div className="card health"><h3>Data feeds</h3>{feedsOk ? <p className="ok"><CheckCircle2 aria-hidden /> Healthy</p> : <p className="warn"><ShieldAlert aria-hidden /> {health?.feeds.status ?? 'Unknown'}</p>}<small>Last successful sync: {lastOk ? when(lastOk.completed_at ?? lastOk.started_at) : 'none yet'}.</small></div>
      </div>
      <h2>Feed freshness</h2>
      <div className="table-scroll"><table><thead><tr><th>Location</th><th>Dataset</th><th>Last value</th><th>Age</th><th>Limit</th><th>Status</th></tr></thead><tbody>
        {feeds.map((f) => <tr key={`${f.location_id}:${f.dataset}`}><td>{locationName(f.location_id)}</td><td>{datasetLabel(f.dataset)}</td><td>{when(f.source_timestamp)}</td><td>{f.age_minutes != null ? `${f.age_minutes} min` : '-'}</td><td>{f.limit_minutes} min</td><td><FreshBadge status={f.status} /></td></tr>)}
        {!feeds.length && <tr><td colSpan={6}>No feeds reported.</td></tr>}
      </tbody></table></div>
      <h2>Recent ingestion runs</h2>
      <div className="table-scroll"><table><thead><tr><th>Run</th><th>Source</th><th>Started</th><th>Outcome</th><th>Records</th><th>Rejected</th><th>Error</th></tr></thead><tbody>
        {runs.map((r) => <tr key={r.run_id}><td><code>{r.run_id}</code></td><td>{r.source_id}</td><td>{when(r.started_at)}</td><td>{r.status === 'success' ? <span className="badge fresh-fresh">success</span> : <span className="badge fresh-empty">{r.status}</span>}</td><td>{r.records}</td><td>{r.rejected}</td><td>{r.error_category ?? '-'}</td></tr>)}
        {!runs.length && <tr><td colSpan={7}>No runs yet.{canEdit ? ' Use "Run ingestion now".' : ''}</td></tr>}
      </tbody></table></div>
    </>
  );
}

function Sources({ sources, datasets, canEdit, onToggle, onStale, onSource }: { sources: SourceDto[]; datasets: DatasetMeta[]; canEdit: boolean; onToggle: (id: string, enabled: boolean) => void; onStale: (key: string, mins: number) => void; onSource: (key: string, sourceId: string) => void }) {
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [selectedSources, setSelectedSources] = useState<Record<string, string>>({});
  return (
    <>
      <h2>Data sources</h2>
      <div className="table-scroll"><table><thead><tr><th>Source</th><th>Provider</th><th>Licence</th><th>Refresh</th><th>Enabled</th></tr></thead><tbody>
        {sources.map((s) => <tr key={s.id}><td><strong>{s.name}</strong><br /><small className="muted">{s.note}</small></td><td>{s.provider}</td><td>{s.licence_status}</td><td>{s.refresh_interval_minutes} min</td><td><label className="switch"><input type="checkbox" checked={s.enabled} disabled={!canEdit} onChange={(e) => onToggle(s.id, e.target.checked)} /><span /></label></td></tr>)}
      </tbody></table></div>
      <h2>Dataset freshness thresholds</h2>
      <div className="table-scroll"><table><thead><tr><th>Dataset</th><th>Refresh</th><th>Stale after (min)</th><th>Source</th><th>Actions</th></tr></thead><tbody>
        {datasets.map((d) => {
          const currentSource = sources.find((source) => source.id === d.sourceId)?.id ?? d.sourceId;
          const selectedSource = selectedSources[d.key] ?? currentSource;
          const validLimit = Number.isInteger(limits[d.key] ?? d.staleAfterMinutes) && (limits[d.key] ?? d.staleAfterMinutes) >= d.refreshMinutes;
          return <tr key={d.key}><td>{d.label}</td><td>{d.refreshMinutes} min</td><td><input className="input-sm" type="number" min={d.refreshMinutes} value={limits[d.key] ?? d.staleAfterMinutes} disabled={!canEdit} onChange={(e) => setLimits({ ...limits, [d.key]: Number(e.target.value) })} /></td><td><select className="input-sm" value={selectedSource} disabled={!canEdit} onChange={(e) => setSelectedSources({ ...selectedSources, [d.key]: e.target.value })}>{sources.filter((source) => source.enabled || source.id === currentSource).map((source) => <option key={source.id} value={source.id}>{source.name}{source.enabled ? '' : ' (disabled)'}</option>)}</select></td><td className="cmd-actions"><button className="btn btn-sm" disabled={!canEdit || !validLimit} onClick={() => onStale(d.key, limits[d.key] ?? d.staleAfterMinutes)}>Save limit</button><button className="btn btn-sm" disabled={!canEdit || selectedSource === currentSource} onClick={() => onSource(d.key, selectedSource)}>Save source</button></td></tr>;
        })}
      </tbody></table></div>
    </>
  );
}

function Rules({ rules, locations, datasets, canEdit, onCreate, onPatch, onDelete }: { rules: AdminRule[]; locations: AdminLocation[]; datasets: DatasetMeta[]; canEdit: boolean; onCreate: (b: Parameters<typeof adminCreateRule>[0]) => void; onPatch: (id: string, p: Parameters<typeof adminPatchRule>[1]) => void; onDelete: (id: string) => void }) {
  const [form, setForm] = useState({ id: '', name: '', dataset: (datasets[0]?.key ?? '') as DatasetMeta['key'], operator: '>=' as '>=' | '<=', threshold: 2, unit: datasets[0]?.unit ?? '', category: 'coastal' as AlertCategory, zones: [] as ('coastal' | 'waterway' | 'offshore')[], suppression_hours: 6, validity_hours: 12 });
  const datasetLabel = (key: string) => datasets.find((dataset) => dataset.key === key)?.label ?? key;
  const submit = (e: FormEvent) => { e.preventDefault(); onCreate({ ...form, review_status: 'draft', enabled: true }); };
  return (
    <>
      <h2>Alert rules</h2>
      <div className="table-scroll"><table><thead><tr><th>Rule</th><th>Condition</th><th>Category</th><th>Zones</th><th>Suppression</th><th>Enabled</th><th /></tr></thead><tbody>
        {rules.map((r) => <tr key={r.id}><td><strong>{r.name}</strong><br /><small className="muted">{r.id}</small></td><td>{datasetLabel(r.dataset)} {r.operator} {r.threshold} {r.unit}</td><td>{r.category ?? '-'}</td><td>{r.zones?.length ? r.zones.join(', ') : 'all'}</td><td>{r.suppression_hours} h</td><td><label className="switch"><input type="checkbox" checked={r.enabled} disabled={!canEdit} onChange={(e) => onPatch(r.id, { enabled: e.target.checked })} /><span /></label></td><td><button className="btn btn-sm btn-danger" disabled={!canEdit} onClick={() => onDelete(r.id)}>Delete</button></td></tr>)}
        {!rules.length && <tr><td colSpan={7}>No rules configured.</td></tr>}
      </tbody></table></div>
      {canEdit && datasets.length > 0 && <section className="card form-card"><h3><Plus size={18} aria-hidden /> New rule</h3><form className="grid-form" onSubmit={submit}>
        <label>ID<input required value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value.replace(/[^a-z0-9_-]/gi, '').toLowerCase() })} placeholder="high-wave-advisory" /></label>
        <label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Dataset<select value={form.dataset} onChange={(e) => { const dataset = datasets.find((d) => d.key === e.target.value); setForm({ ...form, dataset: e.target.value as DatasetMeta['key'], unit: dataset?.unit ?? form.unit }); }}>{datasets.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</select></label>
        <label>Operator<select value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value as '>=' | '<=' })}><option value=">=">&gt;=</option><option value="<=">&lt;=</option></select></label>
        <label>Threshold<input type="number" step="0.1" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })} /></label>
        <label>Unit<input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></label>
        <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as AlertCategory })}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
        <label>Zones<select multiple value={form.zones} onChange={(e) => setForm({ ...form, zones: Array.from(e.target.selectedOptions).map((o) => o.value as typeof ZONES[number]) })}>{ZONES.map((z) => <option key={z} value={z}>{z}</option>)}</select></label>
        <label>Suppression (h)<input type="number" min={0} value={form.suppression_hours} onChange={(e) => setForm({ ...form, suppression_hours: Number(e.target.value) })} /></label>
        <label>Validity (h)<input type="number" min={1} value={form.validity_hours} onChange={(e) => setForm({ ...form, validity_hours: Number(e.target.value) })} /></label>
        <button className="btn btn-primary" type="submit">Create rule</button>
      </form><p className="muted small">{locations.length} locations are available for this rule.</p></section>}
    </>
  );
}

function Locations({ locations, canEdit, onCreate, onPatch, onDelete }: { locations: AdminLocation[]; canEdit: boolean; onCreate: (b: AdminLocation) => void; onPatch: (id: string, p: Parameters<typeof adminUpdateLocation>[1]) => void; onDelete: (id: string) => void }) {
  const [form, setForm] = useState({ id: '', name: '', area: '', lat: 0, lng: 0, zone: 'coastal' as 'coastal' | 'waterway' | 'offshore' });
  const submit = (e: FormEvent) => { e.preventDefault(); onCreate(form); };
  return (
    <>
      <h2>Coverage locations</h2>
      <div className="table-scroll"><table><thead><tr><th>ID</th><th>Name</th><th>Area</th><th>Lat</th><th>Lng</th><th>Zone</th><th /></tr></thead><tbody>
        {locations.map((l) => <tr key={l.id}><td><code>{l.id}</code></td><td>{l.name}</td><td>{l.area}</td><td>{l.lat}</td><td>{l.lng}</td><td><select className="input-sm" value={l.zone} disabled={!canEdit} onChange={(e) => onPatch(l.id, { zone: e.target.value as typeof ZONES[number] })}>{ZONES.map((z) => <option key={z} value={z}>{z}</option>)}</select></td><td><button className="btn btn-sm btn-danger" disabled={!canEdit} onClick={() => onDelete(l.id)}>Delete</button></td></tr>)}
        {!locations.length && <tr><td colSpan={7}>No locations.</td></tr>}
      </tbody></table></div>
      {canEdit && <section className="card form-card"><h3><Plus size={18} aria-hidden /> New location</h3><form className="grid-form" onSubmit={submit}>
        <label>ID<input required value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value.replace(/[^a-z0-9_-]/gi, '').toLowerCase() })} placeholder="location-id" /></label>
        <label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Area<input required value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></label>
        <label>Latitude<input required type="number" step="0.0001" value={form.lat} onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })} /></label>
        <label>Longitude<input required type="number" step="0.0001" value={form.lng} onChange={(e) => setForm({ ...form, lng: Number(e.target.value) })} /></label>
        <label>Zone<select value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value as typeof ZONES[number] })}>{ZONES.map((z) => <option key={z} value={z}>{z}</option>)}</select></label>
        <button className="btn btn-primary" type="submit">Create location</button>
      </form></section>}
    </>
  );
}

function Notifications({ targets, notifications, canEdit, onCreate, onToggle, onTest, onDelete, onDispatch }: { targets: AdminTarget[]; notifications: AdminNotification[]; canEdit: boolean; onCreate: (b: Parameters<typeof adminCreateTarget>[0]) => void; onToggle: (id: number, active: boolean) => void; onTest: (id: number) => void; onDelete: (id: number) => void; onDispatch: () => void }) {
  const [form, setForm] = useState({ name: '', channel: 'email' as 'email' | 'sms' | 'webhook', address: '', event_types: 'alert.created' });
  const submit = (e: FormEvent) => { e.preventDefault(); onCreate({ ...form, active: true }); };
  return (
    <>
      <div className="row-between"><h2>Notification targets</h2><button className="btn" onClick={onDispatch} disabled={!canEdit}><Send size={16} aria-hidden /> Dispatch pending</button></div>
      <div className="table-scroll"><table><thead><tr><th>Name</th><th>Channel</th><th>Address</th><th>Events</th><th>Active</th><th /></tr></thead><tbody>
        {targets.map((t) => <tr key={t.id}><td>{t.name}</td><td>{t.channel}</td><td><code>{t.address}</code></td><td>{t.event_types}</td><td><label className="switch"><input type="checkbox" checked={t.active} disabled={!canEdit} onChange={(e) => onToggle(t.id, e.target.checked)} /><span /></label></td><td className="cmd-actions"><button className="btn btn-sm" disabled={!canEdit} onClick={() => onTest(t.id)}>Test</button><button className="btn btn-sm btn-danger" disabled={!canEdit} onClick={() => onDelete(t.id)}>Delete</button></td></tr>)}
        {!targets.length && <tr><td colSpan={6}>No targets. SMTP/SMS/webhook credentials are configured on the server.</td></tr>}
      </tbody></table></div>
      {canEdit && <section className="card form-card"><h3><Plus size={18} aria-hidden /> New target</h3><form className="grid-form" onSubmit={submit}>
        <label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Channel<select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as typeof form.channel })}><option value="email">Email</option><option value="sms">SMS</option><option value="webhook">Webhook</option></select></label>
        <label>Address<input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="ops@example.org or https://..." /></label>
        <label>Event types<input value={form.event_types} onChange={(e) => setForm({ ...form, event_types: e.target.value })} /></label>
        <button className="btn btn-primary" type="submit">Create target</button>
      </form></section>}
      <h2>Notification outbox</h2>
      <div className="table-scroll"><table><thead><tr><th>Created</th><th>Event</th><th>Channel</th><th>Destination</th><th>Status</th><th>Attempts</th><th>Error</th></tr></thead><tbody>
        {notifications.map((n) => <tr key={n.id}><td>{when(n.created_at)}</td><td>{n.event_type}</td><td>{n.channel}</td><td>{n.destination}</td><td>{n.status}</td><td>{n.attempts}</td><td>{n.error ?? '-'}</td></tr>)}
        {!notifications.length && <tr><td colSpan={7}>Outbox is empty.</td></tr>}
      </tbody></table></div>
    </>
  );
}

function Developers({ keys, rawKey, canEdit, onCreate, onRotate, onToggle }: { keys: AdminKey[]; rawKey?: string; canEdit: boolean; onCreate: (name: string, email: string, quota: number, environment: 'test' | 'production') => void; onRotate: (id: number) => void; onToggle: (id: number, active: boolean) => void }) {
  const [form, setForm] = useState({ name: '', email: '', quota: 1000, environment: 'test' as 'test' | 'production' });
  const submit = (e: FormEvent) => { e.preventDefault(); onCreate(form.name, form.email, form.quota, form.environment); };
  return (
    <>
      <h2>API keys</h2>
      {rawKey && <div className="notice notice-info"><KeyRound size={18} aria-hidden /><div><strong>New key (shown once):</strong><div className="code-row"><code>{rawKey}</code><button className="btn btn-sm" onClick={() => void navigator.clipboard?.writeText(rawKey)}><Copy size={14} aria-hidden /> Copy</button></div></div></div>}
      <div className="table-scroll"><table><thead><tr><th>Name</th><th>Environment</th><th>Prefix</th><th>Owner</th><th>Quota/day</th><th>Last used</th><th>Active</th><th /></tr></thead><tbody>
        {keys.map((k) => <tr key={k.id}><td>{k.name}</td><td>{k.environment}</td><td><code>{k.prefix}</code></td><td>{k.owner_email ?? '-'}</td><td>{k.quota_per_day.toLocaleString()}</td><td>{k.last_used_at ? when(k.last_used_at) : 'never'}</td><td><label className="switch"><input type="checkbox" checked={k.active} disabled={!canEdit} onChange={(e) => window.confirm(`${e.target.checked ? 'Activate' : 'Revoke'} this API key?`) && onToggle(k.id, e.target.checked)} /><span /></label></td><td><button className="btn btn-sm" disabled={!canEdit} onClick={() => window.confirm('Rotate this key? The current key will stop working immediately.') && onRotate(k.id)}>Rotate</button></td></tr>)}
        {!keys.length && <tr><td colSpan={8}>No API keys issued.</td></tr>}
      </tbody></table></div>
      {canEdit && <section className="card form-card"><h3><Plus size={18} aria-hidden /> Issue a key</h3><form className="grid-form" onSubmit={submit}>
        <label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Owner email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Daily quota<input type="number" min={1} value={form.quota} onChange={(e) => setForm({ ...form, quota: Number(e.target.value) })} /></label>
        <label>Environment<select value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value as typeof form.environment })}><option value="test">Test</option><option value="production">Production</option></select></label>
        <button className="btn btn-primary" type="submit">Create key</button>
      </form></section>}
    </>
  );
}

function Jobs({ jobs, quality, canEdit, onCreate, onRun }: { jobs: AdminJob[]; quality?: QualitySummary; canEdit: boolean; onCreate: (kind: 'ingestion' | 'notification_dispatch' | 'retention' | 'quality_scan') => void; onRun: () => void }) {
  const [kind, setKind] = useState<'ingestion' | 'notification_dispatch' | 'retention' | 'quality_scan'>('quality_scan');
  return (
    <>
      {quality && <><h2>Data quality</h2><div className="card"><p><strong>Completeness: {quality.completeness_pct}%</strong> — generated {when(quality.generated_at)}</p><div className="bar"><i style={{ width: `${quality.completeness_pct}%` }} /></div><dl className="stat-list"><div><dt>Locations</dt><dd>{quality.locations}</dd></div><div><dt>Datasets</dt><dd>{quality.datasets}</dd></div><div><dt>Observations</dt><dd>{quality.observations.toLocaleString()}</dd></div><div><dt>Stale feeds</dt><dd>{quality.stale_feeds}</dd></div><div><dt>Empty feeds</dt><dd>{quality.empty_feeds}</dd></div><div><dt>Rejected (7d)</dt><dd>{quality.rejected_last_7d}</dd></div><div><dt>Active alerts</dt><dd>{quality.active_alerts}</dd></div><div><dt>Gaps (48h)</dt><dd>{quality.gap_count_48h}</dd></div></dl>{quality.notes.map((n) => <p key={n} className="muted small">{n}</p>)}</div></>}
      <div className="row-between"><h2>Durable jobs</h2><div className="cmd-actions"><button className="btn" disabled={!canEdit} onClick={onRun}><Play size={16} aria-hidden /> Run pending</button></div></div>
      {canEdit && <div className="cmd-actions inline-form"><select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}><option value="quality_scan">quality_scan</option><option value="ingestion">ingestion</option><option value="notification_dispatch">notification_dispatch</option><option value="retention">retention</option></select><button className="btn" onClick={() => onCreate(kind)}><Plus size={16} aria-hidden /> Queue job</button></div>}
      <div className="table-scroll"><table><thead><tr><th>ID</th><th>Kind</th><th>Status</th><th>Scheduled</th><th>Completed</th><th>Attempts</th><th>Error</th></tr></thead><tbody>
        {jobs.map((j) => <tr key={j.id}><td>{j.id}</td><td>{j.kind}</td><td>{j.status}</td><td>{when(j.scheduled_at)}</td><td>{when(j.completed_at)}</td><td>{j.attempts}</td><td>{j.error ?? '-'}</td></tr>)}
        {!jobs.length && <tr><td colSpan={7}>No jobs queued.</td></tr>}
      </tbody></table></div>
    </>
  );
}

function Staff({ staff, me, onCreate, onPatch }: { staff: AdminStaffUser[]; me?: AdminUser; onCreate: (email: string, password: string, role: 'admin' | 'operator' | 'viewer') => void; onPatch: (id: number, p: Parameters<typeof adminUpdateStaffRole>[1]) => void }) {
  const [form, setForm] = useState({ email: '', password: '', role: 'operator' as 'admin' | 'operator' | 'viewer' });
  const submit = (e: FormEvent) => { e.preventDefault(); onCreate(form.email, form.password, form.role); };
  return (
    <>
      <h2>Staff accounts</h2>
      <div className="table-scroll"><table><thead><tr><th>Email</th><th>Role</th><th>MFA</th><th>Active</th><th>Last sign-in</th></tr></thead><tbody>
        {staff.map((s) => <tr key={s.id}><td>{s.email}{s.id === me?.id ? ' (you)' : ''}</td><td><select className="input-sm" value={s.role} disabled={s.id === me?.id} onChange={(e) => onPatch(s.id, { role: e.target.value as typeof s.role })}><option value="admin">admin</option><option value="operator">operator</option><option value="viewer">viewer</option></select></td><td>{s.mfa_enabled ? 'Enabled' : 'Off'}</td><td><label className="switch"><input type="checkbox" checked={s.active} disabled={s.id === me?.id} onChange={(e) => window.confirm(`${e.target.checked ? 'Activate' : 'Deactivate'} ${s.email}?`) && onPatch(s.id, { active: e.target.checked })} /><span /></label></td><td>{s.last_login_at ? when(s.last_login_at) : 'never'}</td></tr>)}
      </tbody></table></div>
      <section className="card form-card"><h3><Plus size={18} aria-hidden /> New staff account</h3><form className="grid-form" onSubmit={submit}>
        <label>Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Temporary password<input required type="password" minLength={12} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <label>Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}><option value="operator">operator</option><option value="viewer">viewer</option><option value="admin">admin</option></select></label>
        <button className="btn btn-primary" type="submit">Create account</button>
      </form><p className="muted small">Admin: everything. Operator: edit feeds/rules/content. Viewer: read-only.</p></section>
    </>
  );
}

function Profile({ user, onPassword, onMfaSetup, onMfaEnable, onMfaDisable }: { user?: AdminUser; onPassword: (current: string, next: string) => void; onMfaSetup: () => void; onMfaEnable: (code: string) => void; onMfaDisable: (password: string) => void }) {
  const [pw, setPw] = useState({ current: '', next: '' });
  const [code, setCode] = useState('');
  const [disablePw, setDisablePw] = useState('');
  return (
    <>
      <h2>My account</h2>
      <div className="card"><h3>Profile</h3><p>{user?.email ?? 'Not signed in'} — role <strong>{user?.role ?? 'viewer'}</strong> — MFA {user?.mfa_enabled ? 'enabled' : 'disabled'}</p></div>
      <section className="card form-card"><h3><KeyRound size={18} aria-hidden /> Change password</h3><form className="grid-form" onSubmit={(e) => { e.preventDefault(); onPassword(pw.current, pw.next); setPw({ current: '', next: '' }); }}>
        <label>Current password<input type="password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></label>
        <label>New password<input type="password" required minLength={12} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></label>
        <button className="btn btn-primary" type="submit">Update password</button>
      </form></section>
      <section className="card form-card"><h3><ShieldCheck size={18} aria-hidden /> Two-factor authentication</h3>
        {!user?.mfa_enabled ? <>
          <p className="muted">Generate a TOTP secret, add it to your authenticator app, then enter a code to enable MFA.</p>
          <button className="btn" onClick={onMfaSetup}>Generate secret</button>
          <div className="cmd-actions inline-form"><input inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /><button className="btn btn-primary" disabled={code.length !== 6} onClick={() => onMfaEnable(code)}>Enable MFA</button></div>
        </> : <>
          <p className="muted">MFA is active. Disable it by confirming your password.</p>
          <div className="cmd-actions inline-form"><input type="password" placeholder="Password" value={disablePw} onChange={(e) => setDisablePw(e.target.value)} /><button className="btn btn-danger" onClick={() => onMfaDisable(disablePw)}>Disable MFA</button></div>
        </>}
      </section>
    </>
  );
}

function Audit({ rows }: { rows: AdminAudit[] }) {
  return <><h2>Audit trail</h2><div className="table-scroll"><table><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th></tr></thead><tbody>
    {rows.map((a, i) => <tr key={`${a.at}:${i}`}><td>{when(a.at)}</td><td>{a.actor}</td><td>{a.action}</td><td>{a.target ?? '-'}</td></tr>)}
    {!rows.length && <tr><td colSpan={4}>No audited changes yet.</td></tr>}
  </tbody></table></div></>;
}

