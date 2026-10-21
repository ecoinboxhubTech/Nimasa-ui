import { AlertTriangle, CheckCircle2, CircleSlash } from 'lucide-react';
import type { DataKind, Freshness } from '../types';
import { KIND_HELP, KIND_LABEL } from '../config';

export function KindBadge({ kind }: { kind: DataKind }) {
  return (
    <span className={`badge kind-${kind}`} title={KIND_HELP[kind]}>
      {KIND_LABEL[kind]}
    </span>
  );
}

const FRESH_TEXT: Record<Freshness, string> = { fresh: 'Up to date', stale: 'Stale', empty: 'No data' };

/** Status is conveyed by icon + text, never colour alone (NFR-010). */
export function FreshBadge({ status }: { status: Freshness }) {
  const Icon = status === 'fresh' ? CheckCircle2 : status === 'stale' ? AlertTriangle : CircleSlash;
  return (
    <span className={`badge fresh-${status}`}>
      <Icon size={12} aria-hidden /> {FRESH_TEXT[status]}
    </span>
  );
}
