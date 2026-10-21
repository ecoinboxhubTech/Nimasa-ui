import type { DatasetMeta, Location, Point } from '../types';
import { KIND_LABEL, TZ_LABEL } from '../config';
import { formatDateTime, toIso } from './time';

/** CSV with timestamps, units and source metadata (FR-011). Missing values stay empty; nothing is interpolated. */
export function buildCsv(points: Point[], dataset: DatasetMeta, location: Location, sourceName: string): string {
  const header = ['timestamp_utc', `local_time_${TZ_LABEL}`, 'location', 'dataset', 'value', 'unit', 'data_type', 'source', 'note'];
  const rows = points.map((p) => [
    toIso(p.t),
    formatDateTime(p.t),
    location.name,
    dataset.label,
    p.value == null ? '' : String(p.value),
    dataset.unit,
    KIND_LABEL[p.kind],
    sourceName,
    p.value == null ? 'missing value (not estimated)' : '',
  ]);
  return [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
