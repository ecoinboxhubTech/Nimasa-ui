/**
 * Demo data layer. This stands in for the future FastAPI backend (GET /api/v1/...).
 * Swap `fetchBundle` for real calls once an approved data source is ingested.
 * Values are SYNTHETIC. They are deterministic per location/dataset/hour so the UI is stable between reloads.
 */
import type { Bundle, DatasetKey, FeedMode, IngestionRun, Point, Series } from '../types';
import { DATASETS, LOCATIONS, seriesKey } from '../config';

const HOUR = 3600000;
const PAST_HOURS = 168; // 7 days
const FORECAST_HOURS = 72;

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function strHash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}
function rnd(seed: number, i: number) {
  const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const BASE: Record<string, { wave: number; wind: number; sst: number; vis: number; cur: number }> = {
  badagry: { wave: 1.35, wind: 15, sst: 27.9, vis: 8, cur: 1.8 },
  apapa: { wave: 1.0, wind: 13, sst: 28.2, vis: 6.5, cur: 2.2 },
  'bar-beach': { wave: 1.5, wind: 16, sst: 28.0, vis: 8.5, cur: 2.0 },
  lekki: { wave: 1.75, wind: 17, sst: 28.1, vis: 7.5, cur: 2.4 },
  eleko: { wave: 1.6, wind: 18, sst: 27.8, vis: 8, cur: 2.6 },
  'lagos-lagoon': { wave: 0.4, wind: 14, sst: 29.0, vis: 4.5, cur: 1.5 },
  'badagry-creek': { wave: 0.3, wind: 12, sst: 29.2, vis: 4, cur: 1.2 },
  'lagos-offshore': { wave: 2.1, wind: 24, sst: 27.6, vis: 9.5, cur: 3.6 },
};

function valueAt(ds: DatasetKey, loc: string, t: number): number {
  const h = t / HOUR;
  const hourUtc = ((h % 24) + 24) % 24;
  const seed = strHash(loc + ds);
  const n = rnd(seed, Math.floor(h)) - 0.5;
  const b = BASE[loc];
  switch (ds) {
    case 'wave_height':
      return Math.max(0.3, b.wave + 0.35 * Math.sin(h / 9.3 + (seed % 7)) + 0.28 * Math.sin(h / 57) + 0.16 * n);
    case 'wind_speed':
      return Math.max(2, b.wind + 6 * Math.sin(((hourUtc - 8) / 24) * 2 * Math.PI) + 4 * Math.sin(h / 41) + 5 * n);
    case 'sst':
      return b.sst + 0.35 * Math.sin(((hourUtc - 9) / 24) * 2 * Math.PI) + 0.2 * Math.sin(h / 90) + 0.1 * n;
    case 'visibility':
      return Math.max(0.5, b.vis + 2 * Math.sin(((hourUtc - 14) / 24) * 2 * Math.PI) + 1.2 * Math.sin(h / 33) + 1.2 * n);
    case 'current_speed':
      return Math.max(0.2, b.cur + 0.8 * Math.sin(h / 6.2 + (seed % 5)) + 0.4 * Math.sin(h / 47) + 0.3 * n);
  }
}

function round(v: number, d: number) {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function buildSeries(loc: string, dsKey: DatasetKey, now: number, mode: FeedMode): Series {
  const ds = DATASETS.find((d) => d.key === dsKey)!;
  const lag = mode === 'stale' ? 8 * HOUR : 0;
  const last = Math.floor(now / HOUR) * HOUR - lag;
  const seed = strHash(loc + dsKey + 'gap');
  const points: Point[] = [];

  for (let i = -(PAST_HOURS - 1); i <= 0; i++) {
    const t = last + i * HOUR;
    let missing = rnd(seed, i) < 0.025 && i !== 0;
    if (dsKey === 'wind_speed' && loc === 'eleko' && i >= -60 && i <= -56) missing = true; // a visible multi-hour gap
    points.push({ t, value: missing ? null : round(valueAt(dsKey, loc, t), ds.decimals), kind: ds.kind });
  }
  if (ds.hasForecast) {
    for (let i = 1; i <= FORECAST_HOURS; i++) {
      const t = last + i * HOUR;
      points.push({ t, value: round(valueAt(dsKey, loc, t), ds.decimals), kind: 'forecast' });
    }
  }
  const lastValid = [...points].reverse().find((p) => p.kind !== 'forecast' && p.value != null);
  return {
    locationId: loc,
    datasetKey: dsKey,
    unit: ds.unit,
    sourceId: ds.sourceId,
    points,
    sourceTimestamp: lastValid ? lastValid.t : null,
    fetchedAt: now,
  };
}

function buildRuns(now: number, mode: FeedMode): IngestionRun[] {
  const runs: IngestionRun[] = [];
  const current = Math.floor(now / HOUR) * HOUR;
  const nLocations = LOCATIONS.length * DATASETS.length;
  for (let i = 0; i < 24; i++) {
    const startedAt = current - i * HOUR + 4 * 60000;
    const failed = (mode === 'stale' && i < 8) || i === 11;
    runs.push({
      id: `run-${(startedAt / HOUR).toFixed(0)}`,
      sourceId: 'demo-sample',
      startedAt,
      completedAt: startedAt + (failed ? 30000 : 2400),
      status: failed ? 'failed' : 'success',
      records: failed ? 0 : nLocations * 1,
      rejected: failed ? 0 : i % 7 === 3 ? 2 : 0,
      errorCategory: failed ? 'UPSTREAM_TIMEOUT' : undefined,
    });
  }
  return runs;
}

export async function fetchBundle(mode: FeedMode): Promise<Bundle> {
  await new Promise((r) => setTimeout(r, 500));
  if (mode === 'error') {
    throw new ApiError('UPSTREAM_UNAVAILABLE', 'The data service could not be reached. No current values can be shown.');
  }
  const now = Date.now();
  const series: Record<string, Series> = {};
  for (const l of LOCATIONS) for (const d of DATASETS) series[seriesKey(l.id, d.key)] = buildSeries(l.id, d.key, now, mode);
  return { generatedAt: now, series, runs: buildRuns(now, mode) };
}
