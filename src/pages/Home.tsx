import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, AlertTriangle, Download, Eye, Gauge, MapPin, Search, Thermometer, Waves, Wind } from 'lucide-react';
import { useData } from '../context/DataContext';
import { ALERT_RULES, DATASETS, KIND_LABEL, LOCATIONS, getDataset, getLocation, getSource, seriesKey } from '../config';
import { latestValid, ageMinutes } from '../lib/freshness';
import { dayKey, formatDateTime, formatDayLabel, formatDayMonth, timeAgo } from '../lib/time';
import { buildCsv, downloadText } from '../lib/csv';
import { FreshBadge, KindBadge } from '../components/Badges';
import { EmptyState, ErrorState, Loading } from '../components/States';
import MapView, { MapLegend } from '../components/MapView';
import TrendChart from '../components/TrendChart';
import type { DatasetKey } from '../types';

const ICONS: Record<DatasetKey, typeof Waves> = { wave_height: Waves, wind_speed: Wind, sst: Thermometer };
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

  if (status === 'loading' && !bundle) return <div className="container section"><Loading label="Loading coastal conditions…" /></div>;
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
        <div className="notice notice-warn" role="alert">
          <AlertTriangle size={18} aria-hidden />
          <div>
            {status === 'error' ? (
              <><strong>Data service unavailable.</strong> {error} The values below are the last ones loaded and may be out of date. <button className="linklike" onClick={reload}>Retry</button></>
            ) : (
              <><strong>Source feed is delayed.</strong> Values marked “Stale” are older than their freshness limit and are not treated as current.</>
            )}
          </div>
        </div>
      )}

      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero-grid">
          <div className="panel glass">
            <h1 id="hero-title" className="hero-heading">Coastal Conditions</h1>

            <div className="searchbox">
              <label htmlFor="loc" className="sr-only">Choose a location</label>
              <select id="loc" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                {LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <Search size={20} aria-hidden />
            </div>

            <h2 className="place"><MapPin aria-hidden /> {loc.name} <span>~ {formatDayMonth(now)}</span></h2>
            <p className="muted-light">{loc.area} · Sample data for demonstration</p>

            <div className="tiles">
              {DATASETS.map((ds) => {
                const p = latestValid(getSeries(locationId, ds.key), now);
                const f = getFresh(locationId, ds.key);
                const Icon = ICONS[ds.key];
                return (
                  <div className="tile" key={ds.key}>
                    <Icon aria-hidden size={26} />
                    <div className="tile-label">{ds.label}</div>
                    <div className="tile-value">{p ? p.value : '–'}<small>{p ? ` ${ds.unit}` : ''}</small></div>
                    <div className="tile-meta"><KindBadge kind={ds.kind} /> <FreshBadge status={f} /></div>
                  </div>
                );
              })}
              <div className={`tile aqi ${locEvents.length ? 'aqi-alert' : ''}`}>
                <Activity aria-hidden size={26} />
                <div className="tile-label">Advisories</div>
                <div className="tile-value small">{anyStale ? 'Not assessed' : locEvents.length ? `${locEvents.length} active` : 'None active'}</div>
                <div className="tile-meta"><Link to="/alerts">{anyStale ? 'Data stale' : 'View alerts'}</Link></div>
              </div>
            </div>

            <h3 className="outlook-title">3-day outlook <span className="badge kind-forecast">Forecast</span></h3>
            {outlook.length === 0 ? (
              <EmptyState title="No forecast available">Forecast values are not available for this location.</EmptyState>
            ) : (
              <div className="outlook">
                {outlook.map((o) => (
                  <div key={o.t} className="outlook-card">
                    <span className="pill">{formatDayLabel(o.t)}</span>
                    <div className="outlook-row"><Waves size={16} aria-hidden /> {o.wave != null ? `${o.wave.toFixed(1)} m` : '–'}</div>
                    <div className="outlook-row"><Wind size={16} aria-hidden /> {o.wind != null ? `${Math.round(o.wind)} km/h` : '–'}</div>
                    <small>Daily maximum</small>
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="panel obs" aria-labelledby="obs-title">
            <h2 id="obs-title" className="obs-title">Latest Values</h2>
            <div className="obs-head">
              <span><Eye size={20} aria-hidden /> Latest source<br />timestamp</span>
              <span className="pill grey">{obsStamp ? formatDateTime(obsStamp) : 'n/a'}</span>
            </div>
            <dl className="obs-list">
              {DATASETS.map((ds) => {
                const p = latestValid(getSeries(locationId, ds.key), now);
                const s = getSeries(locationId, ds.key);
                const Icon = ICONS[ds.key];
                return (
                  <div className="obs-row" key={ds.key}>
                    <dt><Icon size={20} aria-hidden /> {ds.label}</dt>
                    <dd>
                      <strong>{p ? `${p.value} ${ds.unit}` : 'No data'}</strong>
                      {s?.sourceTimestamp != null && <small>{KIND_LABEL[ds.kind]} · {timeAgo(s.sourceTimestamp, now)}</small>}
                    </dd>
                  </div>
                );
              })}
              <div className="obs-row">
                <dt><Gauge size={20} aria-hidden /> Source</dt>
                <dd><strong>{getSource('demo-sample').name}</strong><small>Synthetic sample data</small></dd>
              </div>
              <div className="obs-row">
                <dt><Activity size={20} aria-hidden /> Data status</dt>
                <dd>
                  {(() => {
                    const mins = ageMinutes(getSeries(locationId, 'wave_height')?.sourceTimestamp ?? null, now);
                    return <><strong>{anyStale ? 'Some data stale' : 'All up to date'}</strong><small>{mins != null ? `Wave feed age: ${mins} min` : 'No timestamp'}</small></>;
                  })()}
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

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

      <section className="container section" id="map" aria-labelledby="map-title">
        <div className="section-head">
          <h2 id="map-title">Map room &amp; trends</h2>
          <p>Select a marker or a location chip to update the chart. Marked locations are the only places with data; the dashed box is the MVP coverage area.</p>
        </div>

        <div className="map-grid">
          <div className="card">
            <div className="tabs" role="tablist" aria-label="Map layer">
              {DATASETS.map((ds) => (
                <button key={ds.key} role="tab" aria-selected={mapLayer === ds.key} className={mapLayer === ds.key ? 'tab on' : 'tab'} onClick={() => setMapLayer(ds.key)}>{ds.label}</button>
              ))}
            </div>
            <MapView ds={getDataset(mapLayer)} />
            <MapLegend ds={getDataset(mapLayer)} />
            <p className="meta-line">
              <KindBadge kind={getDataset(mapLayer).kind} /> Source: {getSource(getDataset(mapLayer).sourceId).name} · Latest at {loc.name}:{' '}
              {(() => { const s = getSeries(locationId, mapLayer); return s?.sourceTimestamp ? formatDateTime(s.sourceTimestamp) : 'no data'; })()}
            </p>
            <div className="chips" aria-label="Locations">
              {LOCATIONS.map((l) => (
                <button key={l.id} className={l.id === locationId ? 'chip on' : 'chip'} onClick={() => setLocationId(l.id)} aria-pressed={l.id === locationId}>{l.name}</button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="tabs" role="tablist" aria-label="Indicator">
              {DATASETS.map((ds) => (
                <button key={ds.key} role="tab" aria-selected={chartKey === ds.key} className={chartKey === ds.key ? 'tab on' : 'tab'} onClick={() => setChartKey(ds.key)}>{ds.label}</button>
              ))}
            </div>
            <div className="chart-toolbar">
              <div>
                <h3>{chartDs.label} · {loc.name}</h3>
                <p className="muted">{chartDs.description}</p>
              </div>
              <div className="range" role="group" aria-label="Time range">
                {RANGES.map((r) => (
                  <button key={r.key} className={range === r.key ? 'chip on' : 'chip'} aria-pressed={range === r.key} onClick={() => setRange(r.key)}>{r.label}</button>
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

            <div className="chart-foot">
              <p className="meta-line">
                <KindBadge kind={chartDs.kind} /> <FreshBadge status={chartFresh} /> Source: {getSource(chartDs.sourceId).name} · Units: {chartDs.unit} · Times in WAT (UTC+1)
              </p>
              <button
                className="btn"
                disabled={!chartSeries}
                onClick={() => chartSeries && downloadText(`blueintel_${locationId}_${chartKey}.csv`, buildCsv(chartPoints, chartDs, loc, getSource(chartDs.sourceId).name))}
              >
                <Download size={14} aria-hidden /> Export CSV
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="section-head">
          <h2>How to read this platform</h2>
          <p>Built on trust before novelty: every value tells you where it came from and how current it is.</p>
        </div>
        <div className="trust-grid">
          {[
            ['Source on every value', 'Each number names its provider, dataset and unit, and links to its licence and attribution.'],
            ['Time you can check', 'Source timestamps are shown in WAT. Old data is labelled stale, never passed off as current.'],
            ['Observed ≠ forecast', 'Observations, forecasts, model estimates and derived values each carry their own label.'],
            ['Gaps stay visible', 'Missing readings appear as gaps. We never fill them with invented values.'],
          ].map(([t, b]) => (
            <div className="trust" key={t}><h3>{t}</h3><p>{b}</p></div>
          ))}
        </div>
      </section>
    </>
  );
}
