import { Link } from 'react-router-dom';
import { Bell, ChevronDown, Eye, MapPin, Menu, Navigation, Thermometer, Waves, Wind } from 'lucide-react';
import { useData } from '../context/DataContext';
import { DATASETS, LOCATIONS } from '../config';
import { latestValid } from '../lib/freshness';
import type { DatasetKey } from '../types';

const ICONS: Record<DatasetKey, typeof Waves> = { wave_height: Waves, wind_speed: Wind, sst: Thermometer, visibility: Eye, current_speed: Navigation };

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const { activeEvents, locationId, setLocationId, getSeries, now } = useData();

  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Open menu"><Menu size={20} /></button>

      <div className="loc-pill">
        <MapPin size={20} aria-hidden />
        <label htmlFor="loc" className="sr-only">Choose a location</label>
        <select id="loc" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          {LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <ChevronDown size={16} aria-hidden />
      </div>

      <div className="top-metrics">
        {DATASETS.map((ds, i) => {
          const p = latestValid(getSeries(locationId, ds.key), now);
          const Icon = ICONS[ds.key];
          return (
            <div key={ds.key} className={`metric-pill m${i}`}>
              <Icon size={18} aria-hidden />
              <div>
                <span className="label">{ds.label}</span>
                <strong>{p ? `${p.value} ${ds.unit}` : '–'}</strong>
              </div>
            </div>
          );
        })}
      </div>

      <Link to="/alerts" className={`metric-pill alert-pill ${activeEvents.length ? 'on' : ''}`} aria-label={`Alerts, ${activeEvents.length} active`}>
        <Bell size={18} aria-hidden />
        <div className="hide-sm">
          <span className="label">Alerts</span>
          <strong>{activeEvents.length ? `${activeEvents.length} active` : 'None'}</strong>
        </div>
      </Link>

    </header>
  );
}
