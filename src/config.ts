import type { AlertCategory, AlertRule, Zone, DatasetMeta, Location, SourceMeta, DataKind } from './types';

export const APP_NAME = 'Orizon Nimasa';
export const TIMEZONE = 'Africa/Lagos';
export const TZ_LABEL = 'WAT';

export const TILE_URL = import.meta.env.VITE_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = import.meta.env.VITE_TILE_ATTRIBUTION ?? '&copy; OpenStreetMap contributors';

/** MVP coverage area: Lagos coastline (placeholder until the product owner confirms the pilot area). FR-024. */
export const COVERAGE_BOUNDS: [[number, number], [number, number]] = [
  [6.1, 2.75],
  [6.6, 3.95],
];
export const MAP_CENTER: [number, number] = [6.42, 3.35];
export const MAP_ZOOM = 9;

export const LOCATIONS: Location[] = [
  { id: 'badagry', name: 'Badagry', area: 'Western Lagos coast', lat: 6.38, lng: 2.88, zone: 'coastal' },
  { id: 'apapa', name: 'Lagos Harbour (Apapa)', area: 'Lagos Harbour approaches', lat: 6.4, lng: 3.34, zone: 'coastal' },
  { id: 'bar-beach', name: 'Bar Beach (Victoria Island)', area: 'Central Lagos coast', lat: 6.41, lng: 3.41, zone: 'coastal' },
  { id: 'lekki', name: 'Lekki', area: 'Eastern Lagos coast', lat: 6.43, lng: 3.54, zone: 'coastal' },
  { id: 'eleko', name: 'Eleko', area: 'Ibeju-Lekki coast', lat: 6.43, lng: 3.8, zone: 'coastal' },
  { id: 'lagos-lagoon', name: 'Lagos Lagoon', area: 'Inland waterway (lagoon)', lat: 6.47, lng: 3.45, zone: 'waterway' },
  // Coordinates approximate: replace with the values from GET /locations.
  { id: 'badagry-creek', name: 'Badagry Creek', area: 'Inland waterway (creek)', lat: 6.44, lng: 2.93, zone: 'waterway' },
  { id: 'lagos-offshore', name: 'Lagos Offshore Approach', area: 'Offshore shipping approaches', lat: 6.2, lng: 3.35, zone: 'offshore' },
];

export const ZONE_LABEL: Record<Zone, string> = { coastal: 'Coastal', waterway: 'Waterway', offshore: 'Offshore' };

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
  derived: 'Calculated by Orizon Nimasa from other values using a documented rule.',
};

export const SOURCES: SourceMeta[] = [
  {
    id: 'demo-sample',
    name: 'Orizon Nimasa sample generator',
    provider: 'Orizon Nimasa (internal, demo only)',
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
  {
    id: 'cand-meteosource',
    name: 'Meteosource',
    provider: 'Meteosource',
    status: 'candidate',
    licence: 'Not reviewed',
    attribution: 'To be confirmed',
    documentationUrl: 'https://www.meteosource.com',
    note: 'Candidate weather provider, to be fetched by the backend only (the API key never reaches the browser). Marine variables such as wave height and sea temperature must be verified for the chosen plan and the Nigerian coast; anything unavailable is shown as unavailable. Confirm quota, caching, attribution and commercial terms first.',
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
  {
    key: 'visibility',
    label: 'Visibility',
    unit: 'km',
    decimals: 1,
    kind: 'model_estimate',
    sourceId: 'demo-sample',
    refreshMinutes: 60,
    staleAfterMinutes: 180,
    hasForecast: true,
    ramp: [2, 4, 7, 10],
    description: 'Horizontal visibility (sample values).',
  },
  {
    key: 'current_speed',
    label: 'Current speed',
    unit: 'km/h',
    decimals: 1,
    kind: 'model_estimate',
    sourceId: 'demo-sample',
    refreshMinutes: 60,
    staleAfterMinutes: 180,
    hasForecast: true,
    ramp: [1, 2, 3.5, 5],
    description: 'Surface current speed (sample values).',
  },
];

/** Illustrative thresholds only. Real thresholds need review by a qualified marine or meteorological specialist. */
export const ALERT_RULES: AlertRule[] = [
  {
    id: 'wave-high',
    category: 'coastal',
    name: 'High wave height advisory',
    datasetKey: 'wave_height',
    operator: '>=',
    threshold: 2,
    unit: 'm',
    zones: ['coastal', 'offshore'],
    suppressionHours: 6,
    validityHours: 6,
    enabled: true,
    reviewStatus: 'Illustrative threshold. Domain review pending',
  },
  {
    id: 'wind-strong',
    category: 'coastal',
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
  {
    id: 'nav-ocean-waves',
    category: 'ocean_navigation',
    name: 'Ocean navigation: heavy swell',
    datasetKey: 'wave_height',
    operator: '>=',
    threshold: 2.5,
    unit: 'm',
    zones: ['coastal', 'offshore'],
    suppressionHours: 6,
    validityHours: 6,
    enabled: true,
    reviewStatus: 'Illustrative threshold. Domain review pending',
  },
  {
    id: 'nav-ocean-wind',
    category: 'ocean_navigation',
    name: 'Ocean navigation: gale-force wind',
    datasetKey: 'wind_speed',
    operator: '>=',
    threshold: 40,
    unit: 'km/h',
    zones: ['coastal', 'offshore'],
    suppressionHours: 3,
    validityHours: 3,
    enabled: true,
    reviewStatus: 'Illustrative threshold. Domain review pending',
  },
  {
    id: 'nav-ocean-visibility',
    category: 'ocean_navigation',
    name: 'Ocean navigation: reduced visibility',
    datasetKey: 'visibility',
    operator: '<=',
    threshold: 2,
    unit: 'km',
    zones: ['coastal', 'offshore'],
    suppressionHours: 3,
    validityHours: 3,
    enabled: true,
    reviewStatus: 'Illustrative threshold. Domain review pending',
  },
  {
    id: 'nav-ocean-current',
    category: 'ocean_navigation',
    name: 'Ocean navigation: strong current',
    datasetKey: 'current_speed',
    operator: '>=',
    threshold: 5.5,
    unit: 'km/h',
    zones: ['coastal', 'offshore'],
    suppressionHours: 3,
    validityHours: 3,
    enabled: true,
    reviewStatus: 'Illustrative threshold. Domain review pending',
  },
  {
    id: 'nav-waterway-wind',
    category: 'waterway_navigation',
    name: 'Waterway navigation: small-craft wind',
    datasetKey: 'wind_speed',
    operator: '>=',
    threshold: 22,
    unit: 'km/h',
    zones: ['waterway'],
    suppressionHours: 3,
    validityHours: 3,
    enabled: true,
    reviewStatus: 'Illustrative threshold. Domain review pending',
  },
  {
    id: 'nav-waterway-visibility',
    category: 'waterway_navigation',
    name: 'Waterway navigation: reduced visibility',
    datasetKey: 'visibility',
    operator: '<=',
    threshold: 1,
    unit: 'km',
    zones: ['waterway'],
    suppressionHours: 3,
    validityHours: 3,
    enabled: true,
    reviewStatus: 'Illustrative threshold. Domain review pending',
  },
  {
    id: 'nav-waterway-current',
    category: 'waterway_navigation',
    name: 'Waterway navigation: strong current',
    datasetKey: 'current_speed',
    operator: '>=',
    threshold: 4,
    unit: 'km/h',
    zones: ['waterway'],
    suppressionHours: 3,
    validityHours: 3,
    enabled: true,
    reviewStatus: 'Illustrative threshold. Domain review pending',
  },
];

export const ALERT_CATEGORY_LABEL: Record<AlertCategory, string> = {
  coastal: 'Coastal conditions',
  ocean_navigation: 'Ocean navigation',
  waterway_navigation: 'Waterway navigation',
};

export const RAMP_COLOURS = ['#76f3ea', '#2aa6b8', '#0f6cbd', '#6a5acd', '#c2185b'];

export const getDataset = (key: string) => DATASETS.find((d) => d.key === key)!;
export const getLocation = (id: string) => LOCATIONS.find((l) => l.id === id)!;
export const getSource = (id: string): SourceMeta =>
  SOURCES.find((s) => s.id === id) ?? { id, name: id, provider: id, status: 'candidate', licence: 'Not reviewed', attribution: 'To be confirmed', note: '' };
export const seriesKey = (locationId: string, datasetKey: string) => `${locationId}:${datasetKey}`;
