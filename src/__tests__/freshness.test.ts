import { describe, expect, it } from 'vitest';
import { getFreshness, latestValid } from '../lib/freshness';
import type { Series } from '../types';

const NOW = 1_700_000_000_000;
const MIN = 60000;

describe('getFreshness', () => {
  it('is fresh inside the limit', () => expect(getFreshness(NOW - 30 * MIN, 120, NOW)).toBe('fresh'));
  it('is fresh exactly at the limit (boundary)', () => expect(getFreshness(NOW - 120 * MIN, 120, NOW)).toBe('fresh'));
  it('is stale just past the limit', () => expect(getFreshness(NOW - 121 * MIN, 120, NOW)).toBe('stale'));
  it('is empty without a timestamp', () => expect(getFreshness(null, 120, NOW)).toBe('empty'));
});

describe('latestValid', () => {
  const s: Series = {
    locationId: 'x', datasetKey: 'wave_height', unit: 'm', sourceId: 's', sourceTimestamp: 0, fetchedAt: 0,
    points: [
      { t: NOW - 3 * 3600000, value: 1.1, kind: 'model_estimate' },
      { t: NOW - 1 * 3600000, value: null, kind: 'model_estimate' },
      { t: NOW + 3600000, value: 9, kind: 'forecast' },
    ],
  };
  it('skips gaps and forecasts', () => expect(latestValid(s, NOW)?.value).toBe(1.1));
});
