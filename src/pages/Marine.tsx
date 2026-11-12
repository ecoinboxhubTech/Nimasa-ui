import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import { Anchor, ChevronRight, Droplets, Layers3, Radar, RefreshCw, Waves } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { RAMP_COLOURS, TILE_ATTRIBUTION, TILE_URL } from '../config';
import { useData } from '../context/DataContext';
import {
  fetchBathymetry, fetchTides, fetchVesselTrack, fetchVessels, HttpError,
  type VesselTrackDto,
} from '../api/client';
import type { BathymetryPoint, Tide, Vessel, VesselTrackPoint } from '../types';
import { formatDateTime } from '../lib/time';
import { boundsOf } from '../lib/geo';
import { EmptyState, Loading } from '../components/States';

type Tab = 'vessels' | 'bathymetry' | 'tides';

const DEPTH_STOPS = [10, 25, 50, 90];

function depthColour(depth: number) {
  const i = DEPTH_STOPS.findIndex((stop) => depth < stop);
  return RAMP_COLOURS[i === -1 ? RAMP_COLOURS.length - 1 : i];
}

export default function Marine() {
  const { locations } = useData();
  const [tab, setTab] = useState<Tab>('vessels');
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [track, setTrack] = useState<VesselTrackDto>();
  const [bathymetry, setBathymetry] = useState<BathymetryPoint[]>([]);
  const [tides, setTides] = useState<Tide>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const tideLocation = locations[0]?.id;

  const load = async () => {
    setLoading(true); setError(undefined);
    try {
      if (tab === 'vessels') setVessels(await fetchVessels());
      if (tab === 'bathymetry') setBathymetry(await fetchBathymetry());
      if (tab === 'tides' && tideLocation) setTides(await fetchTides(tideLocation, 48));
    } catch (e) {
      setError(e instanceof HttpError ? e.message : 'Marine data is unavailable.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [tab, tideLocation]);

  const selectVessel = async (v: Vessel) => {
    setError(undefined);
    try { setTrack(await fetchVesselTrack(v.mmsi, 48)); } catch (e) { setError(e instanceof Error ? e.message : 'Track unavailable.'); }
  };

  const coverageBounds = useMemo(() => boundsOf(locations), [locations]);
  const vesselBounds = useMemo(() => boundsOf(vessels.filter((v) => v.lat != null && v.lng != null).map((v) => ({ lat: v.lat as number, lng: v.lng as number }))) ?? coverageBounds, [vessels, coverageBounds]);
  const bathymetryBounds = useMemo(() => boundsOf(bathymetry) ?? coverageBounds, [bathymetry, coverageBounds]);

  const tidePath = useMemo(() => {
    if (!tides?.points.length) return '';
    const hs = tides.points.map((p) => p.height_m);
    const min = Math.min(...hs), max = Math.max(...hs);
    return tides.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i / (tides.points.length - 1)) * 620},${130 - ((p.height_m - min) / (max - min || 1)) * 100}`).join(' ');
  }, [tides]);

  return (
    <div className="container section page">
      <div className="row-between">
        <div>
          <span className="badge kind-model">Marine layers</span>
          <h1>Vessels, bathymetry &amp; tides</h1>
        </div>
        <button className="btn" onClick={() => void load()} disabled={loading}><RefreshCw size={16} aria-hidden /> Refresh</button>
      </div>
      <p className="lead">AIS positions, a depth grid and tide predictions share one map. Source metadata is shown with each layer.</p>

      <div className="tabs" role="tablist" aria-label="Marine layers">
        {([['vessels', 'AIS vessels', Radar], ['bathymetry', 'Bathymetry', Layers3], ['tides', 'Tides', Waves]] as const).map(([id, label, Icon]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'tab on' : 'tab'} onClick={() => { setTab(id); setTrack(undefined); }}>
            <Icon size={16} aria-hidden /> {label}
          </button>
        ))}
      </div>

      {error && <div className="notice notice-warn" role="alert">{error}</div>}
      {loading && <Loading />}

      {tab === 'vessels' && (
        <div className="marine-grid">
          <div className="card glass-card">
            <h2><Anchor size={20} aria-hidden /> Vessel positions</h2>
            {vesselBounds ? (
              <MapContainer bounds={vesselBounds} boundsOptions={{ padding: [30, 30] }} minZoom={8} maxZoom={13} scrollWheelZoom={false} className="map">
                <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
                {vessels.map((v) => v.lat != null && v.lng != null && (
                  <CircleMarker key={v.mmsi} center={[v.lat, v.lng]} radius={8} pathOptions={{ color: '#fff', weight: 2, fillColor: '#0f6cbd', fillOpacity: 0.9 }} eventHandlers={{ click: () => void selectVessel(v) }}>
                    <Tooltip direction="top"><strong>{v.name}</strong><br />{v.vessel_type} · {v.sog?.toFixed(1) ?? '?'} kn</Tooltip>
                  </CircleMarker>
                ))}
                {track && track.points.length > 0 && (
                  <>
                    <Polyline positions={track.points.map((p) => [p.lat, p.lng])} pathOptions={{ color: '#76f3ea', weight: 3, dashArray: '6 5' }} />
                    <CircleMarker center={[track.points[track.points.length - 1].lat, track.points[track.points.length - 1].lng]} radius={11} pathOptions={{ color: '#041d32', weight: 3, fillColor: '#76f3ea', fillOpacity: 1 }} />
                  </>
                )}
              </MapContainer>
            ) : <EmptyState title="No vessel positions">The API returned no vessels with coordinates.</EmptyState>}
            <p className="muted small"><Radar size={12} aria-hidden /> Source: GET /api/v1/vessels. Select a vessel for its 48-hour track.</p>
          </div>
          <div className="card">
            <h2><Anchor size={20} aria-hidden /> Vessels</h2>
            <ul className="vessel-list">
              {vessels.map((v) => (
                <li key={v.mmsi}>
                  <button className={`vessel-row ${track?.vessel.mmsi === v.mmsi ? 'on' : ''}`} onClick={() => void selectVessel(v)}>
                    <span><strong>{v.name}</strong><small>MMSI {v.mmsi} · {v.flag}</small></span>
                    <span className="vessel-meta">{v.vessel_type}<small>{v.sog?.toFixed(1) ?? '-'} kn</small></span>
                    <ChevronRight size={16} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            {!vessels.length && <p className="muted">No vessels reported by the API.</p>}
            {track && <p className="muted small">Track: {track.points.length} positions ending {track.points.length ? formatDateTime(new Date(track.points[track.points.length - 1].observed_at).getTime()) : '-'}.</p>}
          </div>
        </div>
      )}

      {tab === 'bathymetry' && (
        <div className="marine-grid">
          <div className="card glass-card">
            <h2><Layers3 size={20} aria-hidden /> Depth grid</h2>
            {bathymetryBounds ? (
              <MapContainer bounds={bathymetryBounds} boundsOptions={{ padding: [30, 30] }} minZoom={8} maxZoom={13} scrollWheelZoom={false} className="map">
                <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
                {bathymetry.map((p) => <CircleMarker key={`${p.lat}:${p.lng}`} center={[p.lat, p.lng]} radius={4} pathOptions={{ stroke: false, fillColor: depthColour(p.depth_m), fillOpacity: 0.85 }}><Tooltip>{p.depth_m} m · {p.survey_name}</Tooltip></CircleMarker>)}
              </MapContainer>
            ) : <EmptyState title="No bathymetry points">The API returned no depth samples.</EmptyState>}
            <ul className="legend">{['< 10 m', '10-25 m', '25-50 m', '50-90 m', '>= 90 m'].map((l, i) => <li key={l}><i style={{ background: RAMP_COLOURS[i] }} /> {l}</li>)}</ul>
          </div>
          <div className="card">
            <h2><Droplets size={20} aria-hidden /> Survey coverage</h2>
            <dl className="stat-list">
              <div><dt>Points</dt><dd>{bathymetry.length}</dd></div>
              <div><dt>Deepest</dt><dd>{bathymetry.length ? Math.max(...bathymetry.map((p) => p.depth_m)).toFixed(1) : '-'} m</dd></div>
              <div><dt>Shallowest</dt><dd>{bathymetry.length ? Math.min(...bathymetry.map((p) => p.depth_m)).toFixed(1) : '-'} m</dd></div>
            </dl>
            <p className="muted small">Depth values come from the configured bathymetry source. Check the survey name and datum before using them for navigation.</p>
          </div>
        </div>
      )}

      {tab === 'tides' && (
        <div className="card">
          <div className="card-head"><h2><Waves size={20} aria-hidden /> Tide prediction{tides?.location ? ` · ${tides.location}` : ''}</h2>{tides && <span className="badge fresh-stale">{tides.simulated ? 'Simulated model' : 'Provider data'}</span>}</div>
          {tides?.points.length ? (
            <>
              <svg viewBox="0 0 620 150" className="tide-chart" role="img" aria-label="48-hour tide height prediction">
                <path d={tidePath} fill="none" stroke="#0f6cbd" strokeWidth="3" />
                <line x1="0" y1="130" x2="620" y2="130" stroke="#9aa7b2" strokeWidth="1" />
              </svg>
              <div className="tide-meta"><span>Datum: {tides.datum}</span><span>Source: {tides.source}</span><span>{tides.simulated ? 'Simulated: not for navigation' : 'Provider data'}</span></div>
              <h3>Next high / low water</h3>
              <ul className="tide-list">{tides.high_low.map((h) => <li key={h.time}><span className={`badge ${h.type === 'high' ? 'kind-observation' : 'kind-model'}`}>{h.type}</span> {formatDateTime(new Date(h.time).getTime())} <strong>{h.height_m} m</strong></li>)}</ul>
            </>
          ) : <EmptyState title="No tide prediction">{tideLocation ? 'No tide points are available for this location.' : 'No locations are configured.'}</EmptyState>}
          <p className="muted small">Check the datum, station and provider before operational use.</p>
        </div>
      )}
    </div>
  );
}
