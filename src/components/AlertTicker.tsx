import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { ALERT_CATEGORY_LABEL, DATASETS, getLocation } from '../config';
import { formatTime } from '../lib/time';

export default function AlertTicker() {
  const { activeEvents, staleKeys, status, error, bundle, getFresh, locationId } = useData();

  const items = useMemo(() => {
    const out: string[] = [];
    if (status === 'error') out.push(`Data service unavailable${bundle ? ': showing last loaded values, which may be out of date' : ': no current values can be shown'}.`);
    if (staleKeys.length) {
      const names = staleKeys.map((k) => DATASETS.find((d) => d.key === k)!.label.toLowerCase()).join(', ');
      out.push(`Data-quality warning: ${names} feed is stale. Alerts for stale data are suppressed.`);
    }
    for (const e of activeEvents) {
      out.push(`${e.category && e.category !== 'coastal' ? `[${ALERT_CATEGORY_LABEL[e.category]}] ` : ''}${e.ruleName}, ${getLocation(e.locationId).name}: ${e.value} ${e.unit} (threshold ${e.threshold} ${e.unit}). Issued ${formatTime(e.triggeredAt)}, valid to ${formatTime(e.validUntil)}.`);
    }
    const noData = !!bundle && DATASETS.every((d) => getFresh(locationId, d.key) === 'empty');
    if (noData) out.push('No data has been received yet, so conditions and alerts cannot be assessed. Check back after the next data update.');
    if (!out.length && status !== 'loading') out.push('No active alerts. Always check the source, time and data type shown with each value. Orizon Nimasa is not an official warning service.');
    if (status === 'loading' && !bundle) out.push('Loading latest data…');
    return out;
  }, [activeEvents, staleKeys, status, bundle, error, getFresh, locationId]);

  const text = items.join('    •    ');
  return (
    <div className="ticker" role="region" aria-label="Alert and data status feed">
      <div className="ticker-label">Alerts</div>
      <div className="ticker-track" aria-live="polite">
        <div className="ticker-move">
          <span>{text}</span>
          <span aria-hidden="true">{text}</span>
        </div>
      </div>
    </div>
  );
}
