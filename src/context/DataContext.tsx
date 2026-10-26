import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AlertEvent, Bundle, Freshness, FeedMode, Series } from '../types';
import { ALERT_RULES, DATASETS, DEFAULT_LOCATION_ID, LOCATIONS, seriesKey } from '../config';
import { fetchBundle } from '../api/mockApi';
import { USE_API, fetchLiveBundle } from '../api/client';
import { getFreshness } from '../lib/freshness';
import { evaluateRule } from '../lib/alerts';

interface DataState {
  status: 'loading' | 'ready' | 'error';
  error?: string;
  bundle?: Bundle;
  now: number;
  mode: FeedMode;
  setMode: (m: FeedMode) => void;
  reload: () => void;
  locationId: string;
  setLocationId: (id: string) => void;
  getSeries: (loc: string, ds: string) => Series | undefined;
  getFresh: (loc: string, ds: string) => Freshness;
  events: AlertEvent[];
  activeEvents: AlertEvent[];
  staleKeys: string[];
}

const Ctx = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<FeedMode>('normal');
  const [status, setStatus] = useState<DataState['status']>('loading');
  const [error, setError] = useState<string>();
  const [bundle, setBundle] = useState<Bundle>();
  const [locationId, setLocationId] = useState(DEFAULT_LOCATION_ID);
  const [now, setNow] = useState(Date.now());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    (USE_API ? fetchLiveBundle() : fetchBundle(mode))
      .then((b) => {
        if (cancelled) return;
        setBundle(b);
        setError(undefined);
        setNow(Date.now());
        setStatus('ready');
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message); // keep the last bundle, if any, so cached data can be shown and labelled
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [mode, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  // Live data is ingested on a schedule, so poll gently instead of fetching on every view.
  useEffect(() => {
    if (!USE_API) return;
    const id = setInterval(() => setTick((t) => t + 1), 5 * 60000);
    return () => clearInterval(id);
  }, []);

  const getSeries = useCallback((loc: string, ds: string) => bundle?.series[seriesKey(loc, ds)], [bundle]);

  const getFresh = useCallback(
    (loc: string, ds: string): Freshness => {
      const s = bundle?.series[seriesKey(loc, ds)];
      const meta = DATASETS.find((d) => d.key === ds);
      if (!s || !meta) return 'empty';
      return getFreshness(s.sourceTimestamp, meta.staleAfterMinutes, now);
    },
    [bundle, now],
  );

  const { events, staleKeys } = useMemo(() => {
    const ev: AlertEvent[] = [];
    const stale: string[] = [];
    if (bundle) {
      for (const l of LOCATIONS) {
        for (const d of DATASETS) {
          const s = bundle.series[seriesKey(l.id, d.key)];
          const f = getFreshness(s.sourceTimestamp, d.staleAfterMinutes, now);
          if (f === 'stale') stale.push(d.key);
          if (!bundle.alerts) for (const r of ALERT_RULES.filter((r) => r.datasetKey === d.key)) ev.push(...evaluateRule(r, s, f, now));
        }
      }
    }
    if (bundle?.alerts) ev.push(...bundle.alerts);
    ev.sort((a, b) => b.triggeredAt - a.triggeredAt);
    return { events: ev, staleKeys: Array.from(new Set(stale)) };
  }, [bundle, now]);

  const activeEvents = useMemo(() => events.filter((e) => e.status === 'active'), [events]);

  const value: DataState = {
    status, error, bundle, now, mode, setMode, reload, locationId, setLocationId,
    getSeries, getFresh, events, activeEvents, staleKeys,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData must be used inside DataProvider');
  return v;
}
