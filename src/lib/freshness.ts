import type { Freshness, Point, Series } from '../types';

export function ageMinutes(sourceTimestamp: number | null, now: number): number | null {
  return sourceTimestamp == null ? null : Math.max(0, Math.round((now - sourceTimestamp) / 60000));
}

/**
 * One shared freshness policy for the whole UI (NFR-004).
 * A value exactly at the threshold is still fresh; anything older is stale.
 */
export function getFreshness(sourceTimestamp: number | null, staleAfterMinutes: number, now: number): Freshness {
  if (sourceTimestamp == null) return 'empty';
  return (now - sourceTimestamp) / 60000 > staleAfterMinutes ? 'stale' : 'fresh';
}

/** Latest non-missing, non-forecast point at or before `now`. */
export function latestValid(series: Series | undefined, now: number): Point | undefined {
  if (!series) return undefined;
  for (let i = series.points.length - 1; i >= 0; i--) {
    const p = series.points[i];
    if (p.kind !== 'forecast' && p.value != null && Number.isFinite(p.value) && p.t <= now) return p;
  }
  return undefined;
}
