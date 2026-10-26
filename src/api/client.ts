/**
 * Real API client for the Orizon Nimasa FastAPI service (`VITE_API_BASE_URL`, e.g. `/api/v1`).
 * It adapts the API's snake_case/ISO responses to the shapes the UI already uses (`Bundle`, `AlertEvent`).
 * When `VITE_API_BASE_URL` is unset the app falls back to the synthetic mock in `mockApi.ts`.
 */
import type { AlertEvent, AlertStatus, Bundle, DataKind, DatasetKey, Point, Series } from '../types';
import { DATASETS, LOCATIONS, seriesKey } from '../config';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '');
export const USE_API = Boolean(API_BASE);

export class HttpError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const TOKEN_KEY = 'blueintel-admin-token';
export const getToken = () => { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t: string | null) => {
  try { if (t) sessionStorage.setItem(TOKEN_KEY, t); else sessionStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
};

interface Opts { method?: string; body?: unknown; auth?: boolean }

async function request<T>(path: string, { method = 'GET', body, auth = false }: Opts = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new HttpError('UPSTREAM_UNAVAILABLE', 'The data service could not be reached. No current values can be shown.');
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown;
  try { data = text ? JSON.parse(text) : undefined; } catch { data = undefined; }
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } } | undefined)?.error;
    if (res.status === 401 && auth) setToken(null);
    throw new HttpError(err?.code ?? `HTTP_${res.status}`, err?.message ?? `The data service returned an error (${res.status}).`, res.status);
  }
  return data as T;
}

/** The API sends UTC ISO strings, sometimes without a zone designator. Treat those as UTC. */
export function parseUtc(s: string): number {
  return Date.parse(/(Z|[+-]\d\d:?\d\d)$/.test(s) ? s : `${s}Z`);
}

/** The API and config use different source ids for the same sources. */
const SOURCE_ID: Record<string, string> = { demo: 'demo-sample', open_meteo: 'cand-openmeteo' };
export const normaliseSourceId = (id: string) => SOURCE_ID[id] ?? id;

interface SeriesDto {
  location_id: string;
  dataset: string;
  unit: string;
  source_timestamp: string | null;
  expected_interval_minutes: number;
  source: { id: string } | null;
  points: { time: string; value: number | null; data_type: DataKind }[];
  gaps: { start: string; end: string }[];
}

function toSeries(s: SeriesDto, fetchedAt: number): Series {
  const ds = DATASETS.find((d) => d.key === s.dataset)!;
  const points: Point[] = s.points.map((p) => ({ t: parseUtc(p.time), value: p.value, kind: p.data_type }));
  // Missing values stay visible: represent each reported gap as null points so the chart breaks the line.
  const step = Math.max(1, s.expected_interval_minutes) * 60000;
  const have = new Set(points.map((p) => p.t));
  for (const g of s.gaps) {
    const from = parseUtc(g.start);
    const to = parseUtc(g.end);
    for (let t = from, n = 0; t <= to && n < 500; t += step, n++) if (!have.has(t)) points.push({ t, value: null, kind: ds.kind });
  }
  points.sort((a, b) => a.t - b.t);
  return {
    locationId: s.location_id,
    datasetKey: s.dataset as DatasetKey,
    unit: s.unit,
    sourceId: normaliseSourceId(s.source?.id ?? ds.sourceId),
    points,
    sourceTimestamp: s.source_timestamp ? parseUtc(s.source_timestamp) : null,
    fetchedAt,
  };
}

interface AlertDto {
  id: number;
  rule_id: string;
  rule_name: string;
  location_id: string;
  dataset: string;
  value: number;
  threshold: number;
  unit: string;
  data_type: DataKind;
  source_id: string;
  source_timestamp: string;
  issued_at: string;
  valid_until: string;
  status: string;
  message: string;
}

const toAlert = (a: AlertDto): AlertEvent => ({
  id: String(a.id),
  ruleId: a.rule_id,
  ruleName: a.rule_name,
  locationId: a.location_id,
  datasetKey: a.dataset as DatasetKey,
  triggeredAt: parseUtc(a.issued_at),
  sourceTimestamp: parseUtc(a.source_timestamp),
  validUntil: parseUtc(a.valid_until),
  value: a.value,
  threshold: a.threshold,
  unit: a.unit,
  dataKind: a.data_type,
  sourceId: normaliseSourceId(a.source_id),
  status: (['active', 'expired', 'suppressed_stale'].includes(a.status) ? a.status : 'expired') as AlertStatus,
  message: a.message,
});

export async function fetchLiveBundle(): Promise<Bundle> {
  const now = Date.now();
  const q = (dataset: string) => {
    const p = new URLSearchParams({ dataset });
    for (const l of LOCATIONS) p.append('locations', l.id);
    return `/series?${p}`;
  };
  const [lists, alerts] = await Promise.all([
    Promise.all(DATASETS.map((d) => request<SeriesDto[]>(q(d.key)))),
    request<AlertDto[]>('/alerts?include_expired=true'),
  ]);
  const series: Record<string, Series> = {};
  for (const s of lists.flat()) series[seriesKey(s.location_id, s.dataset)] = toSeries(s, now);
  // Locations the API did not return still need an (empty) series so every screen can render a "No data" state.
  for (const l of LOCATIONS) {
    for (const d of DATASETS) {
      const k = seriesKey(l.id, d.key);
      series[k] ??= { locationId: l.id, datasetKey: d.key, unit: d.unit, sourceId: d.sourceId, points: [], sourceTimestamp: null, fetchedAt: now };
    }
  }
  return { generatedAt: now, series, runs: [], alerts: alerts.map(toAlert) };
}

export interface FeedbackPayload {
  found_information?: 'yes_easily' | 'yes_with_difficulty' | 'no' | null;
  source_clarity?: 'yes' | 'partly' | 'no' | null;
  comments?: string | null;
}
export const sendFeedback = (body: FeedbackPayload) => request<unknown>('/feedback', { method: 'POST', body });

/* ---------- admin ---------- */
export interface AdminUser { id: number; email: string; active: boolean }
export const adminLogin = async (email: string, password: string) => {
  const r = await request<{ access_token: string; user: AdminUser }>('/admin/auth/login', { method: 'POST', body: { email, password } });
  setToken(r.access_token);
  return r.user;
};
export const adminMe = () => request<AdminUser>('/admin/auth/me', { auth: true });
export const adminLogout = async () => {
  try { await request('/admin/auth/logout', { method: 'POST', auth: true }); } finally { setToken(null); }
};

export interface AdminFeed { location_id: string; dataset: string; status: 'fresh' | 'stale' | 'empty'; limit_minutes: number; source_timestamp: string | null; age_minutes: number | null }
export interface AdminRun { run_id: string; source_id: string; started_at: string; completed_at: string | null; status: string; records: number; rejected: number; error_category: string | null; error_summary: string | null }
export interface AdminRule { id: string; name: string; dataset: string; operator: string; threshold: number; unit: string; suppression_hours: number; validity_hours: number; enabled: boolean; review_status: string }
export interface AdminAudit { at: string; actor: string; action: string; target: string | null }

export const adminFeeds = () => request<{ feeds: AdminFeed[]; recent_runs: AdminRun[] }>('/admin/feeds', { auth: true });
export const adminRules = () => request<AdminRule[]>('/admin/alert-rules', { auth: true });
export const adminAudit = () => request<AdminAudit[]>('/admin/audit-log?limit=50', { auth: true });
export const adminRunIngestion = () => request<AdminRun[]>('/admin/ingestion/run', { method: 'POST', auth: true });
export const adminHealth = () => request<{ status: string; app: Record<string, string>; feeds: { status: string } }>('/health');
