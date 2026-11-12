import { useEffect, useState } from 'react';
import { Clipboard, KeyRound, RefreshCw, ShieldCheck, Terminal, TriangleAlert } from 'lucide-react';
import { developerCreateKey, developerRecipes, developerUsage, HttpError, type ApiUsage } from '../api/client';
import type { ApiKeyCreated } from '../types';
import { formatDateTime } from '../lib/time';

const STORE = 'orizon-sandbox-key';

export default function Developer() {
  const [key, setKey] = useState<ApiKeyCreated>();
  const [savedKey, setSavedKey] = useState(() => { try { return localStorage.getItem(STORE) ?? ''; } catch { return ''; } });
  const [usage, setUsage] = useState<ApiUsage>();
  const [recipes, setRecipes] = useState<Awaited<ReturnType<typeof developerRecipes>>>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    developerRecipes().then(setRecipes).catch(() => {});
  }, []);

  const create = async () => {
    setBusy(true); setError(undefined);
    try {
      const created = await developerCreateKey('Hackathon sandbox');
      setKey(created);
      setSavedKey(created.key);
      try { localStorage.setItem(STORE, created.key); } catch { /* storage unavailable */ }
    } catch (e) { setError(e instanceof HttpError ? e.message : 'Could not create a sandbox key.'); }
    finally { setBusy(false); }
  };

  const refreshUsage = async () => {
    if (!savedKey) return;
    setBusy(true); setError(undefined);
    try { setUsage(await developerUsage(savedKey)); } catch (e) { setError(e instanceof HttpError ? e.message : 'Usage unavailable.'); }
    finally { setBusy(false); }
  };

  const copy = (value: string) => { void navigator.clipboard?.writeText(value); };

  return (
    <div className="container section page narrow">
      <span className="badge kind-observation">Free sandbox</span>
      <h1>Developer portal</h1>
      <p className="lead">Create a key, call the public data API, and monitor your daily quota.</p>

      {error && <div className="notice notice-warn" role="alert"><TriangleAlert size={18} aria-hidden /> {error}</div>}

      <section className="card">
        <h2><KeyRound size={20} aria-hidden /> Your sandbox key</h2>
        {key ? (
          <>
            <p className="notice notice-info"><ShieldCheck size={16} aria-hidden /> Copy this key now. It is shown once and cannot be recovered.</p>
            <div className="code-row"><code>{key.key}</code><button className="btn" onClick={() => copy(key.key)}><Clipboard size={14} aria-hidden /> Copy</button></div>
            <dl className="stat-list"><div><dt>Prefix</dt><dd>{key.prefix}</dd></div><div><dt>Daily quota</dt><dd>{key.quota_per_day.toLocaleString()}</dd></div><div><dt>Rate limit</dt><dd>{key.rate_limit_per_minute}/min</dd></div><div><dt>Created</dt><dd>{formatDateTime(new Date(key.created_at).getTime())}</dd></div></dl>
          </>
        ) : (
          <>
            {savedKey && <div className="code-row"><code>{savedKey.slice(0, 12)}...</code><span className="muted">saved in this browser</span></div>}
            <button className="btn btn-primary" onClick={() => void create()} disabled={busy}><KeyRound size={16} aria-hidden /> {busy ? 'Creating.' : savedKey ? 'Create another key' : 'Create sandbox key'}</button>
          </>
        )}
        <div className="cmd-actions" style={{ marginTop: '1rem' }}>
          <input aria-label="Sandbox key" value={savedKey} onChange={(e) => setSavedKey(e.target.value.trim())} placeholder="bl_..." />
          <button className="btn" onClick={() => void refreshUsage()} disabled={!savedKey || busy}><RefreshCw size={16} aria-hidden /> Check usage</button>
        </div>
        {usage && <><div className="bar" style={{ marginTop: '1rem' }}><i style={{ width: `${Math.min(100, (usage.requests / usage.quota) * 100)}%` }} /></div><p className="muted">{usage.requests.toLocaleString()} of {usage.quota.toLocaleString()} requests used today � {usage.remaining.toLocaleString()} remaining. Last path: {usage.last_path ?? '-'}</p></>}
      </section>

      <section className="card">
        <h2><Terminal size={20} aria-hidden /> Quickstart</h2>
        {recipes ? (
          <>
            <div className="code-block"><pre>{recipes.curl}</pre><button className="btn" onClick={() => copy(recipes.curl)}><Clipboard size={14} aria-hidden /> Copy cURL</button></div>
            <div className="code-block"><pre>{recipes.javascript}</pre><button className="btn" onClick={() => copy(recipes.javascript)}><Clipboard size={14} aria-hidden /> Copy JS</button></div>
            <div className="table-scroll"><table><thead><tr><th>Method</th><th>Path</th><th>Example</th></tr></thead><tbody>{recipes.endpoints.map((e) => <tr key={`${e.method}:${e.path}`}><td>{e.method}</td><td><code>{e.path}</code></td><td>{e.example}</td></tr>)}</tbody></table></div>
            <p className="muted small">{recipes.note}</p>
          </>
        ) : <p className="muted">Quickstart recipes are unavailable.</p>}
      </section>
    </div>
  );
}
