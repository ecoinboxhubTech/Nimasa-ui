import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, AlertTriangle, Download, Eye, Gauge, MapPin, Navigation, Thermometer, Waves, Wind } from 'lucide-react';
import { useData } from '../context/DataContext';
import { ALERT_RULES, DATASETS, ZONE_LABEL, KIND_LABEL, LOCATIONS, getDataset, getLocation, getSource, seriesKey } from '../config';
import { latestValid, ageMinutes } from '../lib/freshness';
import { dayKey, formatDateTime, formatDayLabel, formatDayMonth, timeAgo } from '../lib/time';
import { buildCsv, downloadText } from '../lib/csv';
import { exportChart, type ExportFormat } from '../lib/export';
import { USE_API, exportUrl } from '../api/client';
import { FreshBadge, KindBadge } from '../components/Badges';
import { DashboardSkeleton, EmptyState, ErrorState } from '../components/States';
import MapView, { MapLegend } from '../components/MapView';
import TrendChart from '../components/TrendChart';
import type { DatasetKey } from '../types';

const ICONS: Record<DatasetKey, typeof Waves> = { wave_height: Waves, wind_speed: Wind, sst: Thermometer, visibility: Eye, current_speed: Navigation };
const RANGES = [
  { key: '24h', hours: 24, label: '24 h' },
  { key: '48h', hours: 48, label: '48 h' },
  { key: '7d', hours: 168, label: '7 days' },
];

export default function Home() {
  const d = useData();
  const { status, bundle, now, locationId, setLocationId, getSeries, getFresh, activeEvents, error, reload, mode } = d;
  const loc = getLocation(locationId);
  const [mapLayer, setMapLayer] = useState<DatasetKey>('wave_height');
  const [chartKey, setChartKey] = useState<DatasetKey>('wave_height');
  const [range, setRange] = useState('48h');
  const routeLoc = useLocation();

  useEffect(() => {
    if (routeLoc.hash === '#map') document.getElementById('map')?.scrollIntoView({ behavior: 'smooth' });
  }, [routeLoc]);

  // 3-day outlook from forecast + observed points, grouped by local day.
  const outlook = useMemo(() => {
    const wave = getSeries(locationId, 'wave_height');
    const wind = getSeries(locationId, 'wind_speed');
    if (!wave || !wind) return [];
    const today = dayKey(now);
    const days = new Map<string, { t: number; wave: number | null; wind: number | null }>();
    const add = (pts: typeof wave.points, field: 'wave' | 'wind') => {
      for (const p of pts) {
        const k = dayKey(p.t);
        if (k < today || p.value == null) continue;
        const e = days.get(k) ?? { t: p.t, wave: null, wind: null };
        e[field] = Math.max(e[field] ?? -Infinity, p.value);
        days.set(k, e);
      }
    };
    add(wave.points, 'wave');
    add(wind.points, 'wind');
    return [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, 3).map(([, v]) => v);
  }, [getSeries, locationId, now]);

  if (status === 'loading' && !bundle) return <DashboardSkeleton />;
  if (!bundle) return <div className="container section"><ErrorState message={error ?? 'Unknown error'} onRetry={reload} /></div>;

  const waveDs = getDataset('wave_height');
  const chartDs = getDataset(chartKey);
  const chartSeries = getSeries(locationId, chartKey);
  const chartFresh = getFresh(locationId, chartKey);
  const hours = RANGES.find((r) => r.key === range)!.hours;
  const chartPoints = (chartSeries?.points ?? []).filter((p) => p.t >= now - hours * 3600000 && p.t <= now + 48 * 3600000);
  const rule = ALERT_RULES.find((r) => r.datasetKey === chartKey);
  const locEvents = activeEvents.filter((e) => e.locationId === locationId);
  const anyStale = DATASETS.some((x) => getFresh(locationId, x.key) === 'stale');
  const anyEmpty = DATASETS.some((x) => getFresh(locationId, x.key) === 'empty');
  const obsStamp = Math.max(0, ...DATASETS.map((x) => getSeries(locationId, x.key)?.sourceTimestamp ?? 0));

  // Rule-based plain-language summary (derived, not AI).
  const wavePoint = latestValid(getSeries(locationId, 'wave_height'), now);
  const wavePrev = (() => {
    const s = getSeries(locationId, 'wave_height');
    if (!s || !wavePoint) return undefined;
    return s.points.find((p) => p.t === wavePoint.t - 6 * 3600000 && p.value != null);
  })();
  const windPoint = latestValid(getSeries(locationId, 'wind_speed'), now);

  return (
    <>
      {(status === 'error' || mode === 'stale') && (
        <div className="container notice-wrap"><div className="notice notice-warn" role="alert">
          <AlertTriangle size={18} aria-hidden />
          <div>
            {status === 'error' ? (
              <><strong>Data service unavailable.</strong> {error} The values below are the last ones loaded and may be out of date. <button className="linklike" onClick={reload}>Retry</button></>
            ) : (
              <><strong>Source feed is delayed.</strong> Values marked “Stale” are older than their freshness limit and are not treated as current.</>
            )}
          </div>
        </div></div>
      )}

      <div className="container section dash">
        <div className="cmd">
          <div>
            <div className="cmd-tags">
              <span className="tag">{loc.area}</span>
              <span className="live"><span className="pulse" aria-hidden><i /><i /></span> Sample data stream</span>
            </div>
            <h1 id="hero-title">Coastal Conditions</h1>
            <p className="muted">{loc.name} · {formatDayMonth(now)} · Sample data for demonstration</p>
          </div>
          <div className="cmd-actions">
            <div className="segmented" role="group" aria-label="Time range">
              {RANGES.map((r) => (
                <button key={r.key} className={range === r.key ? 'on' : ''} aria-pressed={range === r.key} onClick={() => setRange(r.key)}>{r.label}</button>
              ))}
            </div>
            <label className="export-menu">
              <Download size={16} aria-hidden />
              <select
                className="btn"
                disabled={!chartSeries}
                value=""
                aria-label="Export chart data"
                onChange={(e) => {
                  const f = e.target.value;
                  if (!chartSeries || !f) return;
                  const base = `orizon-nimasa_${locationId}_${chartKey}`;
                  if (USE_API) {
                    // Live mode: the backend builds the file (same query as /series; times carry a timezone).
                    const a = document.createElement('a');
                    a.href = exportUrl(f as 'csv' | 'png' | 'jpg' | 'pdf', locationId, chartKey, now - hours * 3600000, now + 48 * 3600000);
                    a.download = `${locationId}_${chartKey}.${f}`;
                    a.click();
                    return;
                  }
                  const sourceName = getSource(chartDs.sourceId).name;
                  if (f === 'csv') downloadText(`${base}.csv`, buildCsv(chartPoints, chartDs, loc, sourceName));
                  else void exportChart(f as ExportFormat, { points: chartPoints, dataset: chartDs, location: loc, sourceName, now, threshold: rule ? { value: rule.threshold, label: `Advisory threshold ${rule.threshold} ${rule.unit} (illustrative)` } : undefined }, base);
                }}
              >
                <option value="">Export…</option>
                <option value="csv">CSV (data)</option>
                <option value="pdf">PDF (chart report)</option>
                <option value="png">PNG (chart image)</option>
                <option value="jpg">JPG (chart image)</option>
              </select>
            </label>
          </div>
        </div>

        <section className="kpis" aria-label="Latest values">
          {DATASETS.map((ds) => {
            const p = latestValid(getSeries(locationId, ds.key), now);
            const f = getFresh(locationId, ds.key);
            const Icon = ICONS[ds.key];
            const pct = p?.value != null ? Math.min(100, Math.max(4, (p.value / (ds.ramp[3] * 1.2)) * 100)) : 0;
            return (
              <div className="kpi" key={ds.key}>
                <div className="kpi-head">
                  <span className="kpi-title"><span className="icon-badge"><Icon size={18} aria-hidden /></span> {ds.label}</span>
                  <KindBadge kind={ds.kind} />
                </div>
                <div className="kpi-value">{p ? p.value : '–'}<small>{p ? ` ${ds.unit}` : ''}</small></div>
                <div className="bar" aria-hidden><i style={{ width: `${pct}%` }} /></div>
                <div className="kpi-foot"><FreshBadge status={f} /></div>
              </div>
            );
          })}
          <div className={`kpi ${locEvents.length ? 'kpi-alert' : ''}`}>
            <div className="kpi-head">
              <span className="kpi-title"><span className="icon-badge"><Activity size={18} aria-hidden /></span> Advisories</span>
            </div>
            <div className="kpi-value kpi-text">{anyStale || anyEmpty ? 'Not assessed' : locEvents.length ? `${locEvents.length} active` : 'None active'}</div>
            <div className="bar" aria-hidden><i style={{ width: locEvents.length ? '100%' : '4%' }} /></div>
            <div className="kpi-foot"><Link to="/alerts" className="inline-link">{anyStale ? 'Data stale: view alerts' : anyEmpty ? 'No data yet: view alerts' : 'View alerts'}</Link></div>
          </div>
        </section>

        <div className="dash-grid">
          <div className="dash-main">
            <section className="card glass-card" id="map" aria-labelledby="map-title">
              <div className="card-head">
                <h2 id="map-title"><span className="icon-badge"><MapPin size={18} aria-hidden /></span> Map room</h2>
                <div className="tabs" role="tablist" aria-label="Map layer">
                  {DATASETS.map((ds) => (
                    <button key={ds.key} role="tab" aria-selected={mapLayer === ds.key} className={mapLayer === ds.key ? 'tab on' : 'tab'} onClick={() => setMapLayer(ds.key)}>{ds.label}</button>
                  ))}
                </div>
              </div>
              <MapView ds={getDataset(mapLayer)} />
              <MapLegend ds={getDataset(mapLayer)} />
              <p className="meta-line">
                <KindBadge kind={getDataset(mapLayer).kind} /> Source: {getSource(getDataset(mapLayer).sourceId).name} · Latest at {loc.name}:{' '}
                {(() => { const s = getSeries(locationId, mapLayer); return s?.sourceTimestamp ? formatDateTime(s.sourceTimestamp) : 'no data'; })()}
              </p>
              <div className="chips" aria-label="Locations">
                {(['coastal', 'waterway', 'offshore'] as const).map((z) => (
                  <span key={z} className="chip-group" role="group" aria-label={`${ZONE_LABEL[z]} locations`}>
                    <small className="muted">{ZONE_LABEL[z]}</small>
                    {LOCATIONS.filter((l) => l.zone === z).map((l) => (
                      <button key={l.id} className={l.id === locationId ? 'chip on' : 'chip'} onClick={() => setLocationId(l.id)} aria-pressed={l.id === locationId}>{l.name}</button>
                    ))}
                  </span>
                ))}
              </div>
              <p className="muted small">Select a marker or chip to update the chart. Only marked locations have data; the dashed box is the MVP coverage area.</p>
            </section>

            <section className="card glass-card" aria-labelledby="trend-title">
              <div className="card-head">
                <div>
                  <h2 id="trend-title">{chartDs.label} · {loc.name}</h2>
                  <p className="muted">{chartDs.description}</p>
                </div>
                <div className="tabs" role="tablist" aria-label="Indicator">
                  {DATASETS.map((ds) => (
                    <button key={ds.key} role="tab" aria-selected={chartKey === ds.key} className={chartKey === ds.key ? 'tab on' : 'tab'} onClick={() => setChartKey(ds.key)}>{ds.label}</button>
                  ))}
                </div>
              </div>

              {chartPoints.some((p) => p.value != null) ? (
                <>
                  <TrendChart
                    points={chartPoints}
                    unit={chartDs.unit}
                    decimals={chartDs.decimals}
                    now={now}
                    label={`${chartDs.label} at ${loc.name}`}
                    threshold={rule ? { value: rule.threshold, label: `Advisory threshold ${rule.threshold} ${rule.unit} (illustrative)` } : undefined}
                    staleSince={chartFresh === 'stale' ? chartSeries?.sourceTimestamp : null}
                  />
                  <details className="table-alt">
                    <summary>View recent values as a table</summary>
                    <div className="table-scroll">
                      <table>
                        <caption className="sr-only">Last 12 values</caption>
                        <thead><tr><th>Time</th><th>Value</th><th>Type</th></tr></thead>
                        <tbody>
                          {chartPoints.filter((p) => p.t <= now).slice(-12).reverse().map((p) => (
                            <tr key={p.t}><td>{formatDateTime(p.t)}</td><td>{p.value == null ? 'Missing' : `${p.value} ${chartDs.unit}`}</td><td>{KIND_LABEL[p.kind]}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </>
              ) : (
                <EmptyState title="No data for this selection">Try another location or a longer time range.</EmptyState>
              )}

              <p className="meta-line">
                <KindBadge kind={chartDs.kind} /> <FreshBadge status={chartFresh} /> Source: {getSource(chartDs.sourceId).name} · Units: {chartDs.unit} · Times in WAT (UTC+1)
              </p>
            </section>
          </div>

          <aside className="dash-side">
            <section className="card glass-card" aria-labelledby="outlook-title">
              <div className="card-head">
                <h2 id="outlook-title"><span className="icon-badge"><Waves size={18} aria-hidden /></span> 3-day outlook</h2>
                <span className="badge kind-forecast">Forecast</span>
              </div>
              {outlook.length === 0 ? (
                <EmptyState title="No forecast available">Forecast values are not available for this location.</EmptyState>
              ) : (
                <ul className="outlook">
                  {outlook.map((o) => (
                    <li key={o.t} className="outlook-row-item">
                      <span className="day">{formatDayLabel(o.t)}</span>
                      <span className="o-val"><Waves size={16} aria-hidden /> {o.wave != null ? `${o.wave.toFixed(1)} m` : '–'}</span>
                      <span className="o-val"><Wind size={16} aria-hidden /> {o.wind != null ? `${Math.round(o.wind)} km/h` : '–'}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="muted small">Daily maximum. Uncertainty grows with lead time.</p>
            </section>

            <section className="card glass-card" aria-labelledby="obs-title">
              <div className="card-head">
                <h2 id="obs-title"><span className="icon-badge"><Eye size={18} aria-hidden /></span> Latest values</h2>
                <span className="pill">{obsStamp ? formatDateTime(obsStamp) : 'n/a'}</span>
              </div>
              <dl className="obs-list">
                {DATASETS.map((ds) => {
                  const p = latestValid(getSeries(locationId, ds.key), now);
                  const s = getSeries(locationId, ds.key);
                  const Icon = ICONS[ds.key];
                  return (
                    <div className="obs-row" key={ds.key}>
                      <dt><Icon size={18} aria-hidden /> {ds.label}</dt>
                      <dd>
                        <strong>{p ? `${p.value} ${ds.unit}` : 'No data'}</strong>
                        {s?.sourceTimestamp != null && <small>{KIND_LABEL[ds.kind]} · {timeAgo(s.sourceTimestamp, now)}</small>}
                      </dd>
                    </div>
                  );
                })}
                <div className="obs-row">
                  <dt><Gauge size={18} aria-hidden /> Source</dt>
                  <dd><strong>{getSource('demo-sample').name}</strong><small>Synthetic sample data</small></dd>
                </div>
                <div className="obs-row">
                  <dt><Activity size={18} aria-hidden /> Data status</dt>
                  <dd>
                    {(() => {
                      const mins = ageMinutes(getSeries(locationId, 'wave_height')?.sourceTimestamp ?? null, now);
                      return <><strong>{anyEmpty ? 'No data received' : anyStale ? 'Some data stale' : 'All up to date'}</strong><small>{mins != null ? `Wave feed age: ${mins} min` : 'No timestamp'}</small></>;
                    })()}
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      </div>

      <section className="container section" id="summary">
        <div className="summary-card">
          <div>
            <KindBadge kind="derived" />
            <h2>Plain-language summary</h2>
            <p>
              {wavePoint && windPoint ? (
                <>
                  At <strong>{loc.name}</strong>, the latest wave-height value is <strong>{wavePoint.value} m</strong>
                  {wavePrev && wavePrev.value != null ? (wavePoint.value! > wavePrev.value ? `, up from ${wavePrev.value} m six hours earlier` : wavePoint.value! < wavePrev.value ? `, down from ${wavePrev.value} m six hours earlier` : ', unchanged from six hours earlier') : ''}
                  {' '}(model estimate, {formatDateTime(wavePoint.t)}), and wind is <strong>{windPoint.value} km/h</strong> (observed, {formatDateTime(windPoint.t)}).
                  {anyStale && ' Some feeds are stale, so treat these values with caution.'}
                </>
              ) : (
                'Not enough valid data is available to summarise this location.'
              )}
            </p>
            <p className="muted">Generated by a fixed rule from the values above, not by AI. It is not a forecast or a safety statement.</p>
          </div>
        </div>
      </section>

    </>
  );
}
