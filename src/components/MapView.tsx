import { CircleMarker, MapContainer, Rectangle, TileLayer, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { DatasetMeta } from '../types';
import { RAMP_COLOURS, TILE_ATTRIBUTION, TILE_URL, seriesKey } from '../config';
import { useData } from '../context/DataContext';
import { latestValid } from '../lib/freshness';
import { boundsOf } from '../lib/geo';

export function rampColour(v: number, ds: DatasetMeta) {
  const i = ds.ramp.findIndex((t) => v < t);
  return RAMP_COLOURS[i === -1 ? RAMP_COLOURS.length - 1 : i];
}

export function MapLegend({ ds }: { ds: DatasetMeta }) {
  if (!ds.ramp.length) {
    return <ul className="legend" aria-label="Map legend"><li><i className="nodata" /> No current values to scale</li></ul>;
  }
  const labels = [`< ${ds.ramp[0]}`, `${ds.ramp[0]}–${ds.ramp[1]}`, `${ds.ramp[1]}–${ds.ramp[2]}`, `${ds.ramp[2]}–${ds.ramp[3]}`, `≥ ${ds.ramp[3]}`];
  return (
    <ul className="legend" aria-label={`Legend for ${ds.label} in ${ds.unit}`}>
      {RAMP_COLOURS.map((c, i) => (
        <li key={c}><i style={{ background: c }} /> {labels[i]} {ds.unit}</li>
      ))}
      <li><i className="nodata" /> No data / stale</li>
    </ul>
  );
}

export default function MapView({ ds }: { ds: DatasetMeta }) {
  const { bundle, now, locationId, setLocationId, getFresh, locations } = useData();
  const bounds = boundsOf(locations);

  if (!bounds) {
    return <div className="state"><strong>No coverage locations</strong><span>The API returned no locations to plot.</span></div>;
  }

  return (
    <MapContainer bounds={bounds} boundsOptions={{ padding: [24, 24] }} minZoom={8} maxZoom={13} scrollWheelZoom={false} className="map" aria-label="Map of the configured coverage area">
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <Rectangle bounds={bounds} pathOptions={{ color: '#0f6cbd', weight: 1.5, dashArray: '6 6', fillOpacity: 0.04 }}>
        <Tooltip sticky>Configured coverage area. Only marked locations have data.</Tooltip>
      </Rectangle>
      {locations.map((l) => {
        const s = bundle?.series[seriesKey(l.id, ds.key)];
        const p = latestValid(s, now);
        const fresh = getFresh(l.id, ds.key);
        const usable = p && fresh === 'fresh';
        const selected = l.id === locationId;
        return (
          <CircleMarker
            key={l.id}
            center={[l.lat, l.lng]}
            radius={selected ? 15 : 11}
            pathOptions={{ color: selected ? '#041d32' : '#ffffff', weight: selected ? 3 : 2, fillColor: usable ? rampColour(p!.value as number, ds) : '#9aa7b2', fillOpacity: usable ? 0.92 : 0.7, dashArray: usable ? undefined : '3 3' }}
            eventHandlers={{ click: () => setLocationId(l.id) }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <strong>{l.name}</strong>
              <br />
              {p ? `${p.value} ${ds.unit}` : 'No data'} {fresh === 'stale' ? '(stale)' : ''}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
