import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Eye, FileSearch, Layers, Navigation, Thermometer, Waves, Wind } from 'lucide-react';
import { useData } from '../context/DataContext';
import { latestValid } from '../lib/freshness';
import { formatDateTime } from '../lib/time';
import { FreshBadge, KindBadge } from '../components/Badges';
import type { DatasetKey } from '../types';

const ICONS: Record<DatasetKey, typeof Waves> = { wave_height: Waves, wind_speed: Wind, sst: Thermometer, visibility: Eye, current_speed: Navigation };

const PILLARS = [
  { icon: FileSearch, title: 'Source on every value', body: 'Each number names its provider, dataset and unit, and links to its licence and attribution.' },
  { icon: Clock, title: 'Time you can check', body: 'Source timestamps are shown in WAT. Old data is labelled stale, never passed off as current.' },
  { icon: Layers, title: 'Observed is not forecast', body: 'Observations, forecasts, model estimates and derived values each carry their own label.' },
  { icon: Eye, title: 'Gaps stay visible', body: 'Missing readings appear as gaps. We never fill them with invented values.' },
];

export default function Landing() {
  const { bundle, now, locationId, getSeries, getFresh, locations, sources, datasets } = useData();
  const loc = locations.find((l) => l.id === locationId) ?? locations[0];
  const candidates = sources.filter((s) => !s.enabled);

  return (
    <>
      <section className="land-hero">
        <div className="land-wrap hero-grid-land">
          <div className="hero-copy">
            <span className="tag">Live data</span>
            <h1>
              Clear coastal conditions.<br />
              <span className="grad">Trusted, labelled data.</span>
            </h1>
            <p className="lead">
              Orizon Nimasa brings selected, legally accessible marine and weather data into one mobile-friendly dashboard, so you can see what a value is,
              where it came from and how current it is.
            </p>
            <div className="hero-cta">
              <Link to="/dashboard" className="btn btn-primary btn-lg">Open dashboard <ArrowRight size={18} aria-hidden /></Link>
              <Link to="/about" className="btn btn-lg">About &amp; limits</Link>
            </div>
          </div>

          <div className="snap card glass-card" aria-label="Live snapshot">
            <div className="card-head">
              <div>
                <span className="label">Snapshot</span>
                <h2>{loc?.name ?? 'Selected location'}</h2>
              </div>
              <span className="live"><span className="pulse" aria-hidden><i /><i /></span> API data</span>
            </div>
            {bundle ? (
              <ul className="snap-list">
                {datasets.map((ds) => {
                  const p = latestValid(getSeries(locationId, ds.key), now);
                  const Icon = ICONS[ds.key] ?? Waves;
                  return (
                    <li key={ds.key}>
                      <span className="snap-name"><span className="icon-badge"><Icon size={18} aria-hidden /></span> {ds.label}</span>
                      <span className="snap-val">{p ? `${p.value} ${ds.unit}` : '–'}</span>
                      <span className="snap-badges"><KindBadge kind={ds.kind} /> <FreshBadge status={getFresh(locationId, ds.key)} /></span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="muted">Loading latest values…</p>
            )}
            <p className="muted small">Latest values from configured sources{bundle ? `, updated ${formatDateTime(now)}` : ''}.</p>
            <Link to="/dashboard" className="inline-link">See the full dashboard →</Link>
          </div>
        </div>
      </section>

      <section className="land-wrap land-section">
        <div className="land-head">
          <span className="label">Built on trust</span>
          <h2>Four rules every value follows</h2>
        </div>
        <div className="pillars">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <div className="pillar" key={title}>
              <span className="icon-badge"><Icon size={20} aria-hidden /></span>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="land-band">
        <div className="land-wrap">
          <div className="land-head">
            <span className="label">Data sources</span>
            <h2>Sources under review</h2>
            <p className="muted">Disabled or unapproved sources are listed with their current licence status. Each must be confirmed before operational use.</p>
          </div>
          <div className="src-strip">
            {candidates.map((s) => (
              <div className="src-chip" key={s.id}>
                <strong>{s.name}</strong>
                <span className="muted">{s.provider}</span>
              </div>
            ))}
            {!candidates.length && <p className="muted">No sources are currently under review.</p>}
            <Link to="/sources" className="src-chip src-link">View all sources &amp; licences <ArrowRight size={16} aria-hidden /></Link>
          </div>
        </div>
      </section>

      <section className="land-wrap land-section">
        <div className="notice notice-warn">
          <div>
            <strong>What this tool is not.</strong> Orizon Nimasa is an informational tool. It is not an official forecast, warning, navigation aid or emergency service, and it cannot guarantee
            safe travel or fishing outcomes. Follow guidance from official maritime and meteorological authorities.
          </div>
        </div>
      </section>

      <section className="land-wrap land-section">
        <div className="cta-banner">
          <div>
            <span className="label">Take part in the pilot</span>
            <h2>See it, then tell us what is missing</h2>
            <p>Explore the dashboard and send feedback on what you needed and could not find.</p>
          </div>
          <div className="hero-cta">
            <Link to="/dashboard" className="btn btn-lg cta-light">Open dashboard</Link>
            <Link to="/feedback" className="btn btn-lg cta-ghost">Send feedback</Link>
          </div>
        </div>
      </section>
    </>
  );
}


