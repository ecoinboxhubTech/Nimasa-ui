/**
 * Real API client for the Orizon Nimasa FastAPI service (`VITE_API_BASE_URL`, e.g. `/api/v1`).
 * It adapts the API's snake_case/ISO responses to the shapes the UI already uses (`Bundle`, `AlertEvent`).
 * When `VITE_API_BASE_URL` is unset the app falls back to the synthetic mock in `mockApi.ts`.
 */
import type { AlertCategory, AlertEvent, AlertStatus, Bundle, DataKind, DatasetKey, Point, Series } from '../types';
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
const SOURCE_ID: Record<string, string> = { demo: 'demo-sample', open_meteo: 'cand-openmeteo', meteosource: 'cand-meteosource' };
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
  category?: AlertCategory;
  zone?: string;
  condition?: string;
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
  category: a.category,
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
    // The API expects one comma-separated value (max 20). Repeated params would keep only the last location.
    const p = new URLSearchParams({ dataset, locations: LOCATIONS.map((l) => l.id).join(',') });
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

/** Backend export (CSV/PNG/JPG/PDF) for one location and dataset. Plain download link: no fetch needed. Times must carry a timezone. */
export type ExportKind = 'csv' | 'png' | 'jpg' | 'pdf';
export function exportUrl(kind: ExportKind, locationId: string, dataset: string, startMs?: number, endMs?: number): string {
  const p = new URLSearchParams({ dataset });
  if (startMs != null) p.set('start', new Date(startMs).toISOString());
  if (endMs != null) p.set('end', new Date(endMs).toISOString());
  return `${API_BASE}/locations/${encodeURIComponent(locationId)}/series.${kind}?${p}`;
}

/* ---------- public reference endpoints ---------- */
export interface LocationDto { id: string; name: string; area: string; lat: number; lng: number; zone: 'coastal' | 'waterway' | 'offshore' }
export interface DatasetDto { key: string; label: string; description: string; unit: string; source_id: string; refresh_minutes: number; stale_after_minutes: number; has_forecast: boolean }
export interface SourceDto { id: string; name: string; provider: string; licence_status: string; licence_url: string | null; attribution: string; documentation_url: string | null; refresh_interval_minutes: number; enabled: boolean; note: string }
export interface SummaryIndicator {
  dataset: string; label: string; unit: string; value: number | null; data_type: DataKind; observed_at: string | null; age_minutes: number | null;
  status: 'fresh' | 'stale' | 'empty'; source: { id: string; name: string; attribution: string };
}
export interface LocationSummary { location: LocationDto; generated_at: string; timezone_note: string; indicators: SummaryIndicator[]; active_alerts: number; warnings: string[] }
export interface AlertRuleDto { id: string; name: string; category: AlertCategory; dataset: string; condition: string; suppression_hours: number; validity_hours: number; enabled: boolean; review_status: string }

export const fetchLocations = () => request<LocationDto[]>('/locations');
export const fetchDatasets = () => request<DatasetDto[]>('/datasets');
export const fetchSources = () => request<SourceDto[]>('/sources');
export const fetchSummary = (locationId: string) => request<LocationSummary>(`/locations/${encodeURIComponent(locationId)}/summary`);
export const fetchSummaries = (locationIds?: string[]) => request<LocationSummary[]>(`/summaries${locationIds?.length ? `?locations=${locationIds.join(',')}` : ''}`);
export const fetchAlertRules = () => request<AlertRuleDto[]>('/alert-rules');
export const fetchAlerts = (f: { locationId?: string; status?: AlertStatus; category?: AlertCategory; includeExpired?: boolean } = {}) => {
  const p = new URLSearchParams();
  if (f.locationId) p.set('location_id', f.locationId);
  if (f.status) p.set('status', f.status);
  if (f.category) p.set('category', f.category);
  if (f.includeExpired) p.set('include_expired', 'true');
  return request<AlertDto[]>(`/alerts${p.size ? `?${p}` : ''}`).then((l) => l.map(toAlert));
};

export interface InsightCitation { id: string; location: string; dataset: string; value: number; unit: string; data_type: DataKind; observed_at: string; freshness: string; source: string }
export interface InsightAnswer { answer_type: string; answer: string; citations: InsightCitation[]; limitations: string[]; model: string; disclaimer: string }
export const askInsight = (question: string, locationId?: string) =>
  request<InsightAnswer>('/insights/query', { method: 'POST', body: { question, location_id: locationId } });

export interface FeedbackPayload {
  found_information?: 'yes_easily' | 'yes_with_difficulty' | 'no' | null;
  source_clarity?: 'yes' | 'partly' | 'no' | null;
  comments?: string | null;
}
export const sendFeedback = (body: FeedbackPayload) => request<unknown>('/feedback', { method: 'POST', body });

/* ---------- admin ---------- */
export interface AdminUser { id: number; email: string; active: boolean; created_at?: string; last_login_at?: string | null }
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
export interface AdminRule { id: string; name: string; category?: AlertCategory; dataset: string; operator: string; threshold: number; unit: string; suppression_hours: number; validity_hours: number; enabled: boolean; review_status: string }
export interface AdminAudit { at: string; actor: string; action: string; target: string | null; before?: unknown; after?: unknown }

export const adminFeeds = () => request<{ feeds: AdminFeed[]; recent_runs: AdminRun[] }>('/admin/feeds', { auth: true });
export const adminRules = () => request<AdminRule[]>('/admin/alert-rules', { auth: true });
export const adminAudit = (limit = 100) => request<AdminAudit[]>(`/admin/audit-log?limit=${limit}`, { auth: true });
export const adminRuns = (limit = 50) => request<AdminRun[]>(`/admin/ingestion-runs?limit=${limit}`, { auth: true });
export const adminSetSource = (id: string, enabled: boolean) => request<unknown>(`/admin/sources/${encodeURIComponent(id)}`, { method: 'PATCH', body: { enabled }, auth: true });
export const adminSetStaleAfter = (key: string, staleAfterMinutes: number) => request<unknown>(`/admin/datasets/${encodeURIComponent(key)}`, { method: 'PATCH', body: { stale_after_minutes: staleAfterMinutes }, auth: true });
export const adminPatchRule = (id: string, patch: Partial<Pick<AdminRule, 'threshold' | 'enabled' | 'suppression_hours' | 'validity_hours' | 'review_status'>>) =>
  request<AdminRule>(`/admin/alert-rules/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch, auth: true });
export const adminChangePassword = (current_password: string, new_password: string) => request<unknown>('/admin/auth/change-password', { method: 'POST', body: { current_password, new_password }, auth: true });
export const adminFeedback = (limit = 100) => request<{ at: string; found_information: string | null; source_clarity: string | null; comments: string | null }[]>(`/admin/feedback?limit=${limit}`, { auth: true });
export const adminStaff = () => request<AdminUser[]>('/admin/staff', { auth: true });
export const adminCreateStaff = (email: string, password: string) => request<AdminUser>('/admin/staff', { method: 'POST', body: { email, password }, auth: true });
export const adminUpdateStaff = (id: number, patch: { active?: boolean; password?: string }) => request<AdminUser>(`/admin/staff/${id}`, { method: 'PATCH', body: patch, auth: true });
export const adminRunIngestion = (source?: string) => request<AdminRun[]>(`/admin/ingestion/run${source ? `?source=${encodeURIComponent(source)}` : ''}`, { method: 'POST', auth: true });
export interface HealthSource { source_id: string; status: string; last_successful_sync: string | null; last_run_status: string | null; stale_datasets: string[] }
export interface Health { status: string; app: Record<string, string>; feeds: { status: string; sources: HealthSource[] }; time: string }
export const adminHealth = () => request<Health>('/health');
