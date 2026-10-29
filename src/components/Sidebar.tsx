import { Link, NavLink } from 'react-router-dom';
import { ArrowLeft, Bell, Database, LayoutGrid, Radio, Sparkles, X } from 'lucide-react';
import { useData } from '../context/DataContext';
import { DATASETS } from '../config';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/alerts', label: 'Alerts', icon: Bell, count: true },
  { to: '/sources', label: 'Data sources', icon: Database },
  { to: '/insights', label: 'AI insights', icon: Sparkles },
];

export function BrandMark({ size = 36 }: { size?: number }) {
  return <img src="/nimasa-logo.png" width={size} height={size} alt="" aria-hidden="true" className="brand-mark" />;
}

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activeEvents, staleKeys, status, locationId, getFresh } = useData();
  const stale = staleKeys.length > 0 || DATASETS.some((d) => getFresh(locationId, d.key) === 'stale');
  const empty = DATASETS.some((d) => getFresh(locationId, d.key) === 'empty');
  const down = status === 'error';
  const tone = down ? 'bad' : stale || empty ? 'warn' : 'ok';
  const linkText = down ? 'Data service unavailable' : empty ? 'No data received yet' : stale ? 'Some feeds are stale' : 'All feeds up to date';

  return (
    <>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Primary">
        <div className="sidebar-top">
          <Link to="/dashboard" className="brand" aria-label="Orizon Nimasa dashboard" onClick={onClose}>
            <BrandMark />
            <span className="brand-text">
              <span className="brand-name">Orizon Nimasa</span>
              <span className="brand-sub">Nigeria · Ocean data</span>
            </span>
          </Link>
          <button className="icon-btn sidebar-close" onClick={onClose} aria-label="Close menu"><X size={18} /></button>
        </div>

        <nav className="side-nav" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, end, count }) => (
            <NavLink key={to} to={to} end={end} onClick={onClose} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
              <span className="side-link-main"><Icon size={20} aria-hidden /> {label}</span>
              {count && activeEvents.length > 0 && <span className="count" aria-label={`${activeEvents.length} active alerts`}>{activeEvents.length}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className={`link-card ${tone}`} role="status">
            <span className="pulse" aria-hidden><i /><i /></span>
            <div>
              <span className="label">Data link</span>
              <span className="link-text">{linkText}</span>
            </div>
            <Radio size={18} aria-hidden />
          </div>
          <Link to="/" onClick={onClose} className="side-link">
            <span className="side-link-main"><ArrowLeft size={20} aria-hidden /> Back to website</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
