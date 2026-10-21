export type DataKind = 'observation' | 'forecast' | 'model_estimate' | 'derived';
export type Freshness = 'fresh' | 'stale' | 'empty';
export type FeedMode = 'normal' | 'stale' | 'error';
export type DatasetKey = 'wave_height' | 'wind_speed' | 'sst';

export interface Location {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
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
  status: 'sample' | 'candidate';
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
}

export interface AlertRule {
  id: string;
  name: string;
  datasetKey: DatasetKey;
  operator: '>=';
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
