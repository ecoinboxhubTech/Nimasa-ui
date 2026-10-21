import type { AlertEvent, AlertRule, Freshness, Series } from '../types';
import { KIND_LABEL } from '../config';

const HOUR = 3600000;

/**
 * Evaluate one rule against one validated series.
 * - Missing/invalid values and forecast points never trigger (FR-007, FR-012).
 * - Threshold comparison is inclusive (>=).
 * - Repeat triggers inside the suppression window are dropped (FR-014).
 * - If the feed is stale the alert is marked suppressed instead of active (FR-015).
 */
export function evaluateRule(rule: AlertRule, series: Series, freshness: Freshness, now: number): AlertEvent[] {
  if (!rule.enabled || freshness === 'empty') return [];
  const events: AlertEvent[] = [];
  let lastTrigger: number | null = null;

  const points = [...series.points].sort((a, b) => a.t - b.t);
  for (const p of points) {
    if (p.kind === 'forecast' || p.t > now) continue;
    if (p.value == null || !Number.isFinite(p.value)) continue;
    if (p.value < rule.threshold) continue;
    if (lastTrigger != null && p.t - lastTrigger < rule.suppressionHours * HOUR) continue;

    lastTrigger = p.t;
    const validUntil = p.t + rule.validityHours * HOUR;
    const status = now > validUntil ? 'expired' : freshness === 'stale' ? 'suppressed_stale' : 'active';
    events.push({
      id: `${rule.id}:${series.locationId}:${p.t}`,
      ruleId: rule.id,
      ruleName: rule.name,
      locationId: series.locationId,
      datasetKey: series.datasetKey,
      triggeredAt: p.t,
      sourceTimestamp: p.t,
      validUntil,
      value: p.value,
      threshold: rule.threshold,
      unit: rule.unit,
      dataKind: p.kind,
      sourceId: series.sourceId,
      status,
      message: `${rule.name}: ${p.value} ${rule.unit} reached the ${rule.threshold} ${rule.unit} threshold (${KIND_LABEL[p.kind].toLowerCase()}).`,
    });
  }
  return events;
}
