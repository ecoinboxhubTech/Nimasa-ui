/**
 * API client for the Orizon Nimasa FastAPI service (`VITE_API_BASE_URL`, default `/api/v1`).
 * It adapts the API's snake_case/ISO responses to the shapes the UI uses (`Bundle`, `AlertEvent`).
 */
import type { AlertCategory, AlertEvent, AlertStatus, BathymetryPoint, Bundle, DataKind, DatasetKey, DatasetMeta, Location, Point, Series, Tide, Vessel, VesselTrackPoint } from '../types';
import { seriesKey } from '../config';

export const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1').replace(/\/$/, '');

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

function toSeries(s: SeriesDto, fetchedAt: number, metaDatasets: DatasetMeta[]): Series {
  const ds = metaDatasets.find((d) => d.key === s.dataset) ?? {
    key: s.dataset as DatasetKey, label: s.dataset, unit: s.unit, decimals: 1,
    kind: (s.points.find((p) => p.value != null)?.data_type ?? 'observation') as DataKind,
    sourceId: s.source?.id ?? 'unknown',
    refreshMinutes: s.expected_interval_minutes || 60, staleAfterMinutes: 180, hasForecast: false, ramp: [], description: '',
  };
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
    sourceId: s.source?.id ?? ds.sourceId,
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
  sourceId: a.source_id,
  status: (['active', 'expired', 'suppressed_stale'].includes(a.status) ? a.status : 'expired') as AlertStatus,
  message: a.message,
});

export async function fetchLiveBundle(locations: Location[], datasets: DatasetMeta[]): Promise<Bundle> {
  const now = Date.now();
  const q = (dataset: string) => {
    // The API expects one comma-separated value (max 20). Repeated params would keep only the last location.
    const p = new URLSearchParams({ dataset, locations: locations.map((l) => l.id).join(',') });
    return `/series?${p}`;
  };
  const [lists, alerts, summaries] = await Promise.all([
    Promise.all(datasets.map((d) => request<SeriesDto[]>(q(d.key)))),
    request<AlertDto[]>('/alerts?include_expired=true'),
    fetchSummaries(locations.map((location) => location.id)),
  ]);
  const series: Record<string, Series> = {};
  for (const s of lists.flat()) series[seriesKey(s.location_id, s.dataset)] = toSeries(s, now, datasets);
  for (const summary of summaries) {
    for (const indicator of summary.indicators) {
      if (indicator.value == null || !indicator.observed_at || !indicator.data_type) continue;
      const key = seriesKey(summary.location.id, indicator.dataset);
      if (series[key]?.sourceTimestamp != null) continue;
      const dataset = datasets.find((item) => item.key === indicator.dataset);
      const observedAt = parseUtc(indicator.observed_at);
      series[key] = {
        locationId: summary.location.id,
        datasetKey: indicator.dataset as DatasetKey,
        unit: indicator.unit,
        sourceId: indicator.source?.id ?? dataset?.sourceId ?? 'unknown',
        points: [{ t: observedAt, value: indicator.value, kind: indicator.data_type }],
        sourceTimestamp: observedAt,
        fetchedAt: now,
      };
    }
  }
  // Locations the API did not return still need an (empty) series so every screen can render a "No data" state.
  for (const l of locations) {
    for (const d of datasets) {
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
export interface AlertRuleDto {
  id: string; name: string; category: AlertCategory; dataset: string; operator: '>=' | '<='; threshold: number; unit: string;
  zones: import('../types').Zone[] | null; suppression_hours: number; validity_hours: number; enabled: boolean; review_status: string;
}

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
export interface AdminUser { id: number; email: string; role?: 'admin' | 'operator' | 'viewer'; active: boolean; mfa_enabled?: boolean; created_at?: string; last_login_at?: string | null }
export const adminLogin = async (email: string, password: string, totpCode?: string) => {
  const r = await request<{ access_token: string; user: AdminUser }>('/admin/auth/login', { method: 'POST', body: { email, password, ...(totpCode ? { totp_code: totpCode } : {}) } });
  setToken(r.access_token);
  return r.user;
};
export const adminMe = () => request<AdminUser>('/admin/auth/me', { auth: true });
export const adminLogout = async () => {
  try { await request('/admin/auth/logout', { method: 'POST', auth: true }); } finally { setToken(null); }
};

export interface AdminFeed { location_id: string; dataset: string; status: 'fresh' | 'stale' | 'empty'; limit_minutes: number; source_timestamp: string | null; age_minutes: number | null }
export interface AdminRun { run_id: string; source_id: string; started_at: string; completed_at: string | null; status: string; records: number; rejected: number; error_category: string | null; error_summary: string | null }
export interface AdminRule { id: string; name: string; category?: AlertCategory; dataset: string; operator: string; threshold: number; unit: string; zones?: import('../types').Zone[] | null; suppression_hours: number; validity_hours: number; enabled: boolean; review_status: string }
export interface AdminAudit { at: string; actor: string; action: string; target: string | null; before?: unknown; after?: unknown }

export const adminFeeds = () => request<{ feeds: AdminFeed[]; recent_runs: AdminRun[] }>('/admin/feeds', { auth: true });
export const adminRules = () => request<AdminRule[]>('/admin/alert-rules', { auth: true });
export const adminAudit = (limit = 100) => request<AdminAudit[]>(`/admin/audit-log?limit=${limit}`, { auth: true });
export const adminRuns = (limit = 50) => request<AdminRun[]>(`/admin/ingestion-runs?limit=${limit}`, { auth: true });
export const adminSetSource = (id: string, enabled: boolean) => request<unknown>(`/admin/sources/${encodeURIComponent(id)}`, { method: 'PATCH', body: { enabled }, auth: true });
export const adminUpdateDataset = (key: string, patch: { stale_after_minutes?: number; source_id?: string }) =>
  request<unknown>(`/admin/datasets/${encodeURIComponent(key)}`, { method: 'PATCH', body: patch, auth: true });
export const adminSetStaleAfter = (key: string, staleAfterMinutes: number) => adminUpdateDataset(key, { stale_after_minutes: staleAfterMinutes });
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


/* ---------- marine sandbox: vessels, bathymetry, tides, quality ---------- */
/** Public marine endpoints are open, but an X-API-Key adds quota/usage tracking. */
async function requestWithKey<T>(path: string, rawKey?: string, method = 'GET'): Promise<T> {
  if (!rawKey) return request<T>(path, { method });
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers: { Accept: 'application/json', 'X-API-Key': rawKey } });
  } catch {
    throw new HttpError('UPSTREAM_UNAVAILABLE', 'The data service could not be reached.');
  }
  const text = await res.text();
  let data: unknown;
  try { data = text ? JSON.parse(text) : undefined; } catch { data = undefined; }
  if (!res.ok) {
    const error = (data as { error?: { code?: string; message?: string } } | undefined)?.error;
    throw new HttpError(error?.code ?? `HTTP_${res.status}`, error?.message ?? 'The data service returned an error.', res.status);
  }
  return data as T;
}

export interface VesselTrackDto { vessel: Vessel; points: VesselTrackPoint[] }
export const fetchVessels = (rawKey?: string) => requestWithKey<Vessel[]>('/vessels', rawKey);
export const fetchVesselTrack = (mmsi: string, hours = 48, rawKey?: string) =>
  requestWithKey<VesselTrackDto>(`/vessels/${encodeURIComponent(mmsi)}/track?hours=${hours}`, rawKey);
export const fetchBathymetry = (bbox?: string, rawKey?: string) =>
  requestWithKey<BathymetryPoint[]>(`/bathymetry${bbox ? `?bbox=${encodeURIComponent(bbox)}` : ''}`, rawKey);
export const fetchTides = (locationId: string, hours = 48, rawKey?: string) =>
  requestWithKey<Tide>(`/tides?location_id=${encodeURIComponent(locationId)}&hours=${hours}`, rawKey);
export const fetchQuality = () => request<import('../types').QualitySummary>('/data-quality');
export type ApiKeyEnvironment = 'test' | 'production';
export const developerCreateKey = (name = 'Sandbox key', owner_email?: string, environment: ApiKeyEnvironment = 'test') =>
  request<import('../types').ApiKeyCreated>('/developer/keys', { method: 'POST', body: { name, owner_email, environment } });
export const developerUsage = (rawKey: string) =>
  requestWithKey<import('../types').ApiUsage>('/developer/usage', rawKey);
export const developerRevokeKey = (rawKey: string) => requestWithKey<void>('/developer/keys/current', rawKey, 'DELETE');
export const developerTestRequest = (path: string, rawKey: string) => requestWithKey<unknown>(path, rawKey);
export const developerRecipes = () => request<{
  base_url: string; auth: { header: string; create: string }; endpoints: { method: string; path: string; example: string }[];
  curl: string; javascript: string; python: string; note: string;
}>('/developer/recipes');

/* ---------- admin: locations, rules, keys, notifications, jobs, quality, staff ---------- */
export interface AdminLocation { id: string; name: string; area: string; lat: number; lng: number; zone: 'coastal' | 'waterway' | 'offshore' }
export type AdminKey = import('../types').ApiKeyInfo & { key?: string; warning?: string };
export type ApiUsage = import('../types').ApiUsage;
export interface AdminTarget { id: number; name: string; channel: 'email' | 'sms' | 'webhook'; address: string; event_types: string; active: boolean; created_at: string }
export interface AdminNotification { id: number; target_id: number | null; event_type: string; channel: string; destination: string; subject: string; body: string; status: string; attempts: number; created_at: string; sent_at: string | null; error: string | null }
export interface AdminJob { id: number; kind: string; status: string; payload: unknown; scheduled_at: string; started_at: string | null; completed_at: string | null; attempts: number; error: string | null; created_at: string }
export interface AdminStaffUser { id: number; email: string; role: 'admin' | 'operator' | 'viewer'; active: boolean; mfa_enabled: boolean; created_at: string; last_login_at: string | null }

export const adminLocations = () => request<AdminLocation[]>('/admin/locations', { auth: true });
export const adminCreateLocation = (body: AdminLocation) => request<AdminLocation>('/admin/locations', { method: 'POST', body, auth: true });
export const adminUpdateLocation = (id: string, body: Partial<Omit<AdminLocation, 'id'>>) => request<AdminLocation>(`/admin/locations/${encodeURIComponent(id)}`, { method: 'PATCH', body, auth: true });
export const adminDeleteLocation = (id: string) => request<void>(`/admin/locations/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true });
export const adminCreateRule = (body: { id: string; name: string; dataset: string; operator: '>=' | '<='; threshold: number; unit: string; category: AlertCategory; zones?: ('coastal' | 'waterway' | 'offshore')[]; suppression_hours: number; validity_hours: number; enabled?: boolean; review_status?: string }) =>
  request<AdminRule>('/admin/alert-rules', { method: 'POST', body, auth: true });
export const adminDeleteRule = (id: string) => request<void>(`/admin/alert-rules/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true });
export const adminKeys = () => request<AdminKey[]>('/admin/api-keys', { auth: true });
export const adminCreateKey = (body: { name: string; owner_email?: string; quota_per_day?: number; environment?: ApiKeyEnvironment }) => request<AdminKey>('/admin/api-keys', { method: 'POST', body, auth: true });
export const adminUpdateKey = (id: number, body: { name?: string; active?: boolean; quota_per_day?: number }) => request<AdminKey>(`/admin/api-keys/${id}`, { method: 'PATCH', body, auth: true });
export const adminRotateKey = (id: number) => request<AdminKey>(`/admin/api-keys/${id}/rotate`, { method: 'POST', auth: true });
export const adminTargets = () => request<AdminTarget[]>('/admin/notification-targets', { auth: true });
export const adminCreateTarget = (body: { name: string; channel: 'email' | 'sms' | 'webhook'; address: string; event_types?: string; active?: boolean }) => request<AdminTarget>('/admin/notification-targets', { method: 'POST', body, auth: true });
export const adminUpdateTarget = (id: number, body: Partial<Pick<AdminTarget, 'name' | 'address' | 'event_types' | 'active'>>) => request<AdminTarget>(`/admin/notification-targets/${id}`, { method: 'PATCH', body, auth: true });
export const adminDeleteTarget = (id: number) => request<void>(`/admin/notification-targets/${id}`, { method: 'DELETE', auth: true });
export const adminTestTarget = (id: number) => request<{ id: number; status: string; error: string | null }>(`/admin/notification-targets/${id}/test`, { method: 'POST', auth: true });
export const adminNotifications = () => request<AdminNotification[]>('/admin/notifications', { auth: true });
export const adminDispatchNotifications = () => request<{ processed: number }>('/admin/notifications/dispatch', { method: 'POST', auth: true });
export const adminJobs = () => request<AdminJob[]>('/admin/jobs', { auth: true });
export const adminCreateJob = (kind: 'ingestion' | 'notification_dispatch' | 'retention' | 'quality_scan') => request<AdminJob>('/admin/jobs', { method: 'POST', body: { kind }, auth: true });
export const adminRunJobs = () => request<{ processed: number }>('/admin/jobs/run', { method: 'POST', auth: true });
export const adminQuality = () => request<import('../types').QualitySummary>('/admin/quality', { auth: true });
export const adminStaffUsers = () => request<AdminStaffUser[]>('/admin/staff', { auth: true });
export const adminCreateStaffRole = (email: string, password: string, role: 'admin' | 'operator' | 'viewer') => request<AdminStaffUser>('/admin/staff', { method: 'POST', body: { email, password, role }, auth: true });
export const adminUpdateStaffRole = (id: number, body: { active?: boolean; password?: string; role?: 'admin' | 'operator' | 'viewer' }) => request<AdminStaffUser>(`/admin/staff/${id}`, { method: 'PATCH', body, auth: true });
export const adminMfaSetup = () => request<{ secret: string; otpauth_uri: string }>('/admin/auth/mfa/setup', { method: 'POST', auth: true });
export const adminMfaEnable = (code: string) => request<unknown>('/admin/auth/mfa/enable', { method: 'POST', body: { code }, auth: true });
export const adminMfaDisable = (password: string) => request<unknown>('/admin/auth/mfa/disable', { method: 'POST', body: { password }, auth: true });
export const adminRequestReset = (email: string) => request<{ status: string; reset_token?: string }>('/admin/auth/password-reset/request', { method: 'POST', body: { email } });
export const adminConfirmReset = (token: string, new_password: string) => request<unknown>('/admin/auth/password-reset/confirm', { method: 'POST', body: { token, new_password } });
