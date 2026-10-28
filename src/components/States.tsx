import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

const Sk = ({ w, h = '1rem', r }: { w?: string; h?: string; r?: string }) => <span className="sk" style={{ width: w, height: h, borderRadius: r }} />;

/** Generic skeleton card used for admin sections and other small panels. */
export function Loading({ label = 'Loading data…' }: { label?: string }) {
  return (
    <div className="card sk-card" role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div aria-hidden className="sk-stack">
        <Sk w="40%" h="1.25rem" />
        <Sk w="100%" />
        <Sk w="90%" />
        <Sk w="75%" />
      </div>
    </div>
  );
}

/** Mirrors the dashboard layout: heading, KPI cards, map, chart and side panels. */
export function DashboardSkeleton({ label = 'Loading coastal conditions…' }: { label?: string }) {
  return (
    <div className="container section dash" role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div aria-hidden className="sk-stack">
        <Sk w="9rem" h="1.25rem" r="999px" />
        <Sk w="min(22rem, 70%)" h="2.25rem" />
        <Sk w="min(16rem, 50%)" />
      </div>
      <div aria-hidden className="kpis">
        {Array.from({ length: 4 }, (_, i) => (
          <div className="kpi" key={i}>
            <div className="sk-row"><Sk w="2.25rem" h="2.25rem" r="12px" /><Sk w="40%" /></div>
            <Sk w="55%" h="2.25rem" />
            <Sk w="100%" h=".375rem" r="999px" />
            <Sk w="35%" h="1.25rem" r="999px" />
          </div>
        ))}
      </div>
      <div aria-hidden className="dash-grid">
        <div className="dash-main">
          <div className="card sk-card"><Sk w="30%" h="1.25rem" /><Sk w="100%" h="18rem" r="16px" /><Sk w="70%" /></div>
          <div className="card sk-card"><Sk w="45%" h="1.25rem" /><Sk w="100%" h="14rem" r="16px" /></div>
        </div>
        <aside className="dash-side">
          <div className="card sk-card"><Sk w="50%" h="1.25rem" /><Sk w="100%" h="2.5rem" /><Sk w="100%" h="2.5rem" /><Sk w="100%" h="2.5rem" /></div>
          <div className="card sk-card"><Sk w="40%" h="1.25rem" /><Sk w="100%" h="2rem" /><Sk w="100%" h="2rem" /><Sk w="100%" h="2rem" /></div>
        </aside>
      </div>
    </div>
  );
}

/** Mirrors the alerts page: title, filters and a few alert rows. */
export function AlertsSkeleton() {
  return (
    <div className="container section page" role="status" aria-busy="true">
      <span className="sr-only">Loading alerts…</span>
      <div aria-hidden className="sk-stack">
        <Sk w="min(20rem, 70%)" h="2.25rem" />
        <Sk w="min(36rem, 100%)" />
        <div className="sk-row"><Sk w="10rem" h="2.25rem" r="12px" /><Sk w="10rem" h="2.25rem" r="12px" /></div>
        {Array.from({ length: 3 }, (_, i) => (
          <div className="card sk-card sk-row" key={i}>
            <Sk w="2.5rem" h="2.5rem" r="50%" />
            <div className="sk-stack" style={{ flex: 1 }}><Sk w="50%" h="1.25rem" /><Sk w="80%" /><Sk w="65%" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="state state-error" role="alert">
      <AlertTriangle aria-hidden />
      <strong>Data unavailable</strong>
      <span>{message}</span>
      <button className="btn" onClick={onRetry}><RefreshCw size={14} aria-hidden /> Try again</button>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state">
      <Inbox aria-hidden />
      <strong>{title}</strong>
      {children && <span>{children}</span>}
    </div>
  );
}
