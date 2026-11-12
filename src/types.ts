export type DataKind = 'observation' | 'forecast' | 'model_estimate' | 'derived';
export type Freshness = 'fresh' | 'stale' | 'empty';
export type DatasetKey = 'wave_height' | 'wind_speed' | 'sst' | 'visibility' | 'current_speed';
export type Zone = 'coastal' | 'waterway' | 'offshore';

export interface Location {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  zone: Zone;
}

export interface DatasetMeta {
  key: DatasetKey;
  label: string;
  unit: string;
  decimals: number;
  kind: DataKind;
  sourceId: string;
  refreshMinutes: number;
  staleAfterMinutes: number;
  hasForecast: boolean;
  /** Ascending value thresholds used to colour the map layer (4 thresholds -> 5 colours). */
  ramp: number[];
  description: string;
}

export interface SourceMeta {
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
  licence: string;
  attribution: string;
  documentationUrl?: string;
  note: string;
}

/** Timestamps are epoch milliseconds (UTC). They are formatted as ISO 8601 for export and as WAT for display. */
export interface Point {
  t: number;
  value: number | null;
  kind: DataKind;
}

export interface Series {
  locationId: string;
  datasetKey: DatasetKey;
  unit: string;
  sourceId: string;
  points: Point[];
  sourceTimestamp: number | null;
  fetchedAt: number;
}

export interface IngestionRun {
  id: string;
  sourceId: string;
  startedAt: number;
  completedAt: number;
  status: 'success' | 'failed';
  records: number;
  rejected: number;
  errorCategory?: string;
}

export interface Bundle {
  generatedAt: number;
  series: Record<string, Series>;
  runs: IngestionRun[];
  /** Alerts evaluated by the server. */
  alerts?: AlertEvent[];
}

export type AlertCategory = 'coastal' | 'ocean_navigation' | 'waterway_navigation';

export interface AlertRule {
  id: string;
  category?: AlertCategory;
  name: string;
  datasetKey: DatasetKey;
  operator: '>=' | '<=';
  /** Zones the rule applies to. Omitted means all zones. */
  zones?: Zone[];
  threshold: number;
  unit: string;
  suppressionHours: number;
  validityHours: number;
  enabled: boolean;
  reviewStatus: string;
}

export type AlertStatus = 'active' | 'expired' | 'suppressed_stale';

export interface AlertEvent {
  id: string;
  category?: AlertCategory;
  ruleId: string;
  ruleName: string;
  locationId: string;
  datasetKey: DatasetKey;
  triggeredAt: number;
  sourceTimestamp: number;
  validUntil: number;
  value: number;
  threshold: number;
  unit: string;
  dataKind: DataKind;
  sourceId: string;
  status: AlertStatus;
  message: string;
}

export type VesselType = 'cargo' | 'tanker' | 'fishing' | 'patrol' | 'sailing' | string;

export interface Vessel {
  mmsi: string;
  name: string;
  flag: string;
  vessel_type: VesselType;
  call_sign?: string | null;
  active: boolean;
  lat?: number;
  lng?: number;
  sog?: number;
  cog?: number;
  observed_at?: string;
  nav_status?: string;
}

export interface VesselTrackPoint {
  mmsi: string;
  observed_at: string;
  lat: number;
  lng: number;
  sog: number;
  cog: number;
  heading?: number | null;
  nav_status: string;
  source: string;
}

export interface BathymetryPoint {
  lat: number;
  lng: number;
  depth_m: number;
  survey_name: string;
  source: string;
}

export interface TidePoint { time: string; height_m: number; type: 'prediction'; source: string }
export interface TideHighLow { time: string; height_m: number; type: 'high' | 'low' }
export interface Tide {
  location_id: string;
  location: string;
  datum: string;
  source: string;
  simulated: boolean;
  points: TidePoint[];
  high_low: TideHighLow[];
}

export interface QualitySummary {
  generated_at: string;
  locations: number;
  datasets: number;
  observations: number;
  rejected_last_7d: number;
  active_alerts: number;
  stale_feeds: number;
  empty_feeds: number;
  gap_count_48h: number;
  completeness_pct: number;
  notes: string[];
}

export interface ApiKeyInfo {
  id: number;
  name: string;
  prefix: string;
  owner_email?: string | null;
  environment: 'test' | 'production';
  active: boolean;
  scopes: string;
  quota_per_day: number;
  rate_limit_per_minute: number;
  created_at: string;
  last_used_at?: string | null;
  revoked_at?: string | null;
}

export interface ApiKeyCreated extends ApiKeyInfo { key: string; warning: string }
export interface ApiUsage { api_key_id: number; day: string; requests: number; quota: number; remaining: number; last_path?: string | null }
