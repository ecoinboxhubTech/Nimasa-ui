import { describe, expect, it } from 'vitest';
import { evaluateRule } from '../lib/alerts';
import type { AlertRule, Point, Series } from '../types';

const H = 3600000;
const NOW = 1_700_000_000_000;
const rule: AlertRule = {
  id: 'r', name: 'Test rule', datasetKey: 'wave_height', operator: '>=', threshold: 2.0, unit: 'm',
  suppressionHours: 6, validityHours: 6, enabled: true, reviewStatus: 'test',
};
const mk = (points: Point[]): Series => ({ locationId: 'l', datasetKey: 'wave_height', unit: 'm', sourceId: 's', sourceTimestamp: NOW, fetchedAt: NOW, points });
const p = (hoursAgo: number, value: number | null, kind: Point['kind'] = 'model_estimate'): Point => ({ t: NOW - hoursAgo * H, value, kind });

describe('evaluateRule', () => {
  it('triggers when above threshold (positive)', () => {
    const ev = evaluateRule(rule, mk([p(1, 2.4)]), 'fresh', NOW);
    expect(ev).toHaveLength(1);
    expect(ev[0].status).toBe('active');
  });
  it('does not trigger below threshold (negative)', () => {
    expect(evaluateRule(rule, mk([p(1, 1.9)]), 'fresh', NOW)).toHaveLength(0);
  });
  it('triggers exactly at the threshold (boundary, inclusive)', () => {
    expect(evaluateRule(rule, mk([p(1, 2.0)]), 'fresh', NOW)).toHaveLength(1);
  });
  it('ignores missing values and forecasts', () => {
    expect(evaluateRule(rule, mk([p(1, null), p(-2, 5, 'forecast')]), 'fresh', NOW)).toHaveLength(0);
  });
  it('ignores non-finite values', () => {
    expect(evaluateRule(rule, mk([p(1, NaN)]), 'fresh', NOW)).toHaveLength(0);
  });
  it('suppresses duplicates inside the window and re-triggers after it', () => {
    const ev = evaluateRule(rule, mk([p(10, 2.2), p(8, 2.3), p(5, 2.4), p(3, 2.5)]), 'fresh', NOW);
    expect(ev.map((e) => e.triggeredAt)).toEqual([NOW - 10 * H, NOW - 3 * H]); // 8 and 5 suppressed (<6 h); 3 is 7 h after 10
  });
  it('marks expired alerts as expired', () => {
    expect(evaluateRule(rule, mk([p(7, 2.5)]), 'fresh', NOW)[0].status).toBe('expired');
  });
  it('never marks an alert active when data is stale', () => {
    expect(evaluateRule(rule, mk([p(1, 2.5)]), 'stale', NOW)[0].status).toBe('suppressed_stale');
  });
  it('returns nothing when the rule is disabled or there is no data', () => {
    expect(evaluateRule({ ...rule, enabled: false }, mk([p(1, 3)]), 'fresh', NOW)).toHaveLength(0);
    expect(evaluateRule(rule, mk([]), 'empty', NOW)).toHaveLength(0);
  });
});
