import type { AlertRule, DatasetMeta, Location, SourceMeta, DataKind } from './types';

export const APP_NAME = 'BlueIntel Nigeria';
export const TIMEZONE = 'Africa/Lagos';
export const TZ_LABEL = 'WAT';

export const TILE_URL = import.meta.env.VITE_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = import.meta.env.VITE_TILE_ATTRIBUTION ?? '&copy; OpenStreetMap contributors';

/** MVP coverage area: Lagos coastline (placeholder until the product owner confirms the pilot area). FR-024. */
export const COVERAGE_BOUNDS: [[number, number], [number, number]] = [
  [6.25, 2.75],
  [6.6, 3.95],
];
export const MAP_CENTER: [number, number] = [6.42, 3.35];
export const MAP_ZOOM = 9;

export const LOCATIONS: Location[] = [
  { id: 'badagry', name: 'Badagry', area: 'Western Lagos coast', lat: 6.38, lng: 2.88 },
  { id: 'apapa', name: 'Lagos Harbour (Apapa)', area: 'Lagos Harbour approaches', lat: 6.4, lng: 3.34 },
  { id: 'bar-beach', name: 'Bar Beach (Victoria Island)', area: 'Central Lagos coast', lat: 6.41, lng: 3.41 },
  { id: 'lekki', name: 'Lekki', area: 'Eastern Lagos coast', lat: 6.43, lng: 3.54 },
  { id: 'eleko', name: 'Eleko', area: 'Ibeju-Lekki coast', lat: 6.43, lng: 3.8 },
];

export const DEFAULT_LOCATION_ID = 'lekki';

export const KIND_LABEL: Record<DataKind, string> = {
  observation: 'Observed',
  forecast: 'Forecast',
  model_estimate: 'Model estimate',
  derived: 'Derived',
};

export const KIND_HELP: Record<DataKind, string> = {
  observation: 'Measured value reported by a source.',
  forecast: 'Predicted future value. Uncertainty increases with lead time.',
  model_estimate: 'Value estimated by a numerical model, not measured at this exact spot.',
  derived: 'Calculated by BlueIntel from other values using a documented rule.',
};

export const SOURCES: SourceMeta[] = [
  {
    id: 'demo-sample',
    name: 'BlueIntel sample generator',
    provider: 'BlueIntel (internal, demo only)',
    status: 'sample',
    licence: 'Not applicable: synthetic values, not real measurements',
    attribution: 'Generated sample data for interface demonstration',
    note: 'Produces plausible but fictional values so the interface, states and alert logic can be reviewed. It must be replaced by an approved real source before any pilot.',
  },
  {
    id: 'cand-nimet',
    name: 'Nigerian Meteorological Agency (NiMet)',
    provider: 'NiMet',
    status: 'candidate',
    licence: 'Not reviewed',
    attribution: 'To be confirmed',
    documentationUrl: 'https://nimet.gov.ng',
    note: 'Candidate for weather observations, forecasts and warnings. Access method, coverage and re-use terms must be confirmed with the agency.',
  },
  {
    id: 'cand-cmems',
    name: 'Copernicus Marine Service',
    provider: 'European Union / Copernicus',
    status: 'candidate',
    licence: 'Not reviewed',
    attribution: 'To be confirmed',
    documentationUrl: 'https://marine.copernicus.eu',
    note: 'Candidate for model-based wave and sea-surface data. Check variables, resolution, licence and attribution.',
  },
  {
    id: 'cand-openmeteo',
    name: 'Open-Meteo Marine API',
    provider: 'Open-Meteo',
    status: 'candidate',
    licence: 'Not reviewed',
    attribution: 'To be confirmed',
    documentationUrl: 'https://open-meteo.com',
    note: 'Candidate for marine forecast data. Confirm commercial-use terms, limits and coverage before relying on it.',
  },
];

export const DATASETS: DatasetMeta[] = [
  {
    key: 'wave_height',
    label: 'Wave height',
    unit: 'm',
    decimals: 1,
    kind: 'model_estimate',
    sourceId: 'demo-sample',
    refreshMinutes: 60,
    staleAfterMinutes: 180,
    hasForecast: true,
    ramp: [0.8, 1.3, 1.8, 2.3],
    description: 'Significant wave height (sample values).',
  },
  {
    key: 'wind_speed',
    label: 'Wind speed',
    unit: 'km/h',
    decimals: 0,
    kind: 'observation',
    sourceId: 'demo-sample',
    refreshMinutes: 60,
    staleAfterMinutes: 120,
    hasForecast: true,
    ramp: [10, 16, 22, 28],
    description: 'Mean 10 m wind speed (sample values).',
  },
  {
    key: 'sst',
    label: 'Sea surface temperature',
    unit: '°C',
    decimals: 1,
    kind: 'model_estimate',
    sourceId: 'demo-sample',
    refreshMinutes: 360,
    staleAfterMinutes: 720,
    hasForecast: false,
    ramp: [27, 27.6, 28.2, 28.8],
    description: 'Sea surface temperature (sample values).',
  },
];

/** Illustrative thresholds only. Real thresholds need review by a qualified marine or meteorological specialist. */
export const ALERT_RULES: AlertRule[] = [
  {
    id: 'wave-high',
    name: 'High wave height advisory',
    datasetKey: 'wave_height',
    operator: '>=',
    threshold: 2.0,
    unit: 'm',
    suppressionHours: 6,
    validityHours: 6,
    enabled: true,
    reviewStatus: 'Illustrative threshold. Domain review pending',
  },
  {
    id: 'wind-strong',
    name: 'Strong wind advisory',
    datasetKey: 'wind_speed',
    operator: '>=',
    threshold: 28,
    unit: 'km/h',
    suppressionHours: 3,
    validityHours: 3,
    enabled: true,
    reviewStatus: 'Illustrative threshold. Domain review pending',
  },
];

export const RAMP_COLOURS = ['#4cc9c0', '#2aa6b8', '#2f7fc1', '#6a5acd', '#c2185b'];

export const getDataset = (key: string) => DATASETS.find((d) => d.key === key)!;
export const getLocation = (id: string) => LOCATIONS.find((l) => l.id === id)!;
export const getSource = (id: string) => SOURCES.find((s) => s.id === id)!;
export const seriesKey = (locationId: string, datasetKey: string) => `${locationId}:${datasetKey}`;
