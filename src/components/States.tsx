import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

export function Loading({ label = 'Loading data…' }: { label?: string }) {
  return (
    <div className="state" role="status">
      <div className="spinner" aria-hidden />
      <span>{label}</span>
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
