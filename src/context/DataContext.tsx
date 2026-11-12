import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AlertEvent, AlertRule, Bundle, DatasetMeta, Freshness, Location, Point, Series, SourceMeta } from '../types';
import { seriesKey } from '../config';
import { fetchAlertRules, fetchDatasets, fetchLiveBundle, fetchLocations, fetchSources } from '../api/client';
import { getFreshness } from '../lib/freshness';

interface DataState {
  status: 'loading' | 'ready' | 'error';
  error?: string;
  bundle?: Bundle;
  now: number;
  reload: () => void;
  locationId: string;
  setLocationId: (id: string) => void;
  getSeries: (loc: string, ds: string) => Series | undefined;
  getFresh: (loc: string, ds: string) => Freshness;
  events: AlertEvent[];
  activeEvents: AlertEvent[];
  staleKeys: string[];
  locations: Location[];
  datasets: DatasetMeta[];
  sources: SourceMeta[];
  alertRules: AlertRule[];
  metadataError?: string;
}

const Ctx = createContext<DataState | null>(null);

const decimalsOf = (values: number[]): number => {
  let max = 0;
  for (const v of values) {
    const dot = String(v).indexOf('.');
    if (dot >= 0) max = Math.max(max, Math.min(2, String(v).length - dot - 1));
  }
  return max;
};

/** Four ascending thresholds derived from the values actually on screen, used for the map colour scale. */
const rampOf = (values: number[]): number[] => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return [];
  const lo = sorted[0];
  const hi = sorted[sorted.length - 1];
  if (lo === hi) return [lo, lo, lo, lo];
  const span = hi - lo;
  return [0.2, 0.4, 0.6, 0.8].map((factor) => Number((lo + span * factor).toFixed(2)));
};

/** Adds display-only metadata (data type, decimals, colour ramp) from the API's values. */
function deriveDatasets(base: DatasetMeta[], bundle?: Bundle): DatasetMeta[] {
  return base.map((dataset) => {
    const points = bundle
      ? Object.values(bundle.series)
          .filter((series) => series.datasetKey === dataset.key)
          .flatMap((series) => series.points)
          .filter((point) => point.value != null && Number.isFinite(point.value) && point.kind !== 'forecast')
      : [];
    const values = points.map((point) => point.value as number);
    const latest = points.reduce<Point | undefined>((acc, point) => (!acc || point.t > acc.t ? point : acc), undefined);
    const decimals = decimalsOf(values);
    return {
      ...dataset,
      decimals: decimals > 0 ? decimals : 1,
      kind: latest?.kind ?? dataset.kind,
      ramp: rampOf(values),
    };
  });
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<DataState['status']>('loading');
  const [error, setError] = useState<string>();
  const [bundle, setBundle] = useState<Bundle>();
  const [locationId, setLocationId] = useState('');
  const [now, setNow] = useState(Date.now());
  const [tick, setTick] = useState(0);
  const [metadataTick, setMetadataTick] = useState(0);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [baseDatasets, setBaseDatasets] = useState<DatasetMeta[]>([]);
  const [sources, setSources] = useState<SourceMeta[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [metadataError, setMetadataError] = useState<string>();

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMetadataLoading(true);
    Promise.all([fetchLocations(), fetchDatasets(), fetchSources(), fetchAlertRules()])
      .then(([ls, ds, ss, rules]) => {
        if (cancelled) return;
        setLocations(ls.map((l) => ({ id: l.id, name: l.name, area: l.area, lat: l.lat, lng: l.lng, zone: l.zone })));
        setBaseDatasets(ds.map((d) => ({
          key: d.key as DatasetMeta['key'], label: d.label, unit: d.unit, decimals: 1, kind: 'observation' as const,
          sourceId: d.source_id, refreshMinutes: d.refresh_minutes, staleAfterMinutes: d.stale_after_minutes,
          hasForecast: d.has_forecast, ramp: [], description: d.description,
        })));
        setSources(ss.map((s) => ({
          id: s.id, name: s.name, provider: s.provider, enabled: s.enabled,
          licence: s.licence_status === 'not_applicable' ? 'Not applicable' : s.licence_status.replace(/_/g, ' '),
          attribution: s.attribution, documentationUrl: s.documentation_url ?? undefined, note: s.note,
        })));
        setAlertRules(rules.map((r) => ({
          id: r.id, name: r.name, category: r.category, datasetKey: r.dataset as AlertRule['datasetKey'],
          operator: r.operator, threshold: r.threshold, unit: r.unit, zones: r.zones ?? undefined,
          suppressionHours: r.suppression_hours, validityHours: r.validity_hours, enabled: r.enabled,
          reviewStatus: r.review_status,
        })));
        setMetadataError(undefined);
      })
      .catch((e: Error) => { if (!cancelled) setMetadataError(e.message); })
      .finally(() => { if (!cancelled) setMetadataLoading(false); });
    return () => { cancelled = true; };
  }, [metadataTick]);

  useEffect(() => {
    if (metadataLoading) return;
    if (!locations.length || !baseDatasets.length) {
      setError(metadataError ?? 'The API returned no locations or datasets.');
      setStatus('error');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    fetchLiveBundle(locations, baseDatasets)
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
    return () => { cancelled = true; };
  }, [tick, locations, baseDatasets, metadataLoading, metadataError]);

  const reload = useCallback(() => {
    setTick((t) => t + 1);
    setMetadataTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (locations.length && !locations.some((location) => location.id === locationId)) {
      setLocationId(locations[0].id);
    }
  }, [locationId, locations]);

  // Keep the API-backed data and public reference metadata warm without coupling them to page navigation.
  useEffect(() => {
    const dataTimer = setInterval(() => setTick((t) => t + 1), 5 * 60000);
    const metadataTimer = setInterval(() => setMetadataTick((t) => t + 1), 10 * 60000);
    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') {
        setTick((t) => t + 1);
        setMetadataTick((t) => t + 1);
      }
    };
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      clearInterval(dataTimer);
      clearInterval(metadataTimer);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, []);

  const datasets = useMemo(() => deriveDatasets(baseDatasets, bundle), [baseDatasets, bundle]);

  const getSeries = useCallback((loc: string, ds: string) => bundle?.series[seriesKey(loc, ds)], [bundle]);

  const getFresh = useCallback(
    (loc: string, ds: string): Freshness => {
      const s = bundle?.series[seriesKey(loc, ds)];
      const meta = datasets.find((d) => d.key === ds);
      if (!s || !meta) return 'empty';
      return getFreshness(s.sourceTimestamp, meta.staleAfterMinutes, now);
    },
    [bundle, datasets, now],
  );

  const { events, staleKeys } = useMemo(() => {
    const stale: string[] = [];
    if (bundle) {
      for (const l of locations) {
        for (const d of datasets) {
          const s = bundle.series[seriesKey(l.id, d.key)];
          if (getFreshness(s?.sourceTimestamp ?? null, d.staleAfterMinutes, now) === 'stale') stale.push(d.key);
        }
      }
    }
    const ev = [...(bundle?.alerts ?? [])].sort((a, b) => b.triggeredAt - a.triggeredAt);
    return { events: ev, staleKeys: Array.from(new Set(stale)) };
  }, [bundle, datasets, locations, now]);

  const activeEvents = useMemo(() => events.filter((e) => e.status === 'active'), [events]);

  const value: DataState = {
    status, error, bundle, now, reload, locationId, setLocationId,
    getSeries, getFresh, events, activeEvents, staleKeys, locations, datasets, sources, alertRules, metadataError,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData must be used inside DataProvider');
  return v;
}
