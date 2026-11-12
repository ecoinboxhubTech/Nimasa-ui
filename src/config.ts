import type { DataKind } from './types';

export const APP_NAME = 'Orizon Nimasa';
export const TIMEZONE = 'Africa/Lagos';
export const TZ_LABEL = 'WAT';

export const TILE_URL = import.meta.env.VITE_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = import.meta.env.VITE_TILE_ATTRIBUTION ?? '&copy; OpenStreetMap contributors';

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

export const ZONE_LABEL = { coastal: 'Coastal', waterway: 'Waterway', offshore: 'Offshore' } as const;
export const ALERT_CATEGORY_LABEL = {
  coastal: 'Coastal conditions',
  ocean_navigation: 'Ocean navigation',
  waterway_navigation: 'Waterway navigation',
} as const;

export const RAMP_COLOURS = ['#76f3ea', '#2aa6b8', '#0f6cbd', '#6a5acd', '#c2185b'];
export const seriesKey = (locationId: string, datasetKey: string) => `${locationId}:${datasetKey}`;
