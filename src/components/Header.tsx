import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Bell, ChevronDown, Map as MapIcon, Menu, ShieldCheck, X } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import AlertTicker from './AlertTicker';

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/alerts', label: 'Alerts' },
  { to: '/sources', label: 'Data sources' },
  { to: '/insights', label: 'AI insights' },
  { to: '/about', label: 'About & limits' },
  { to: '/feedback', label: 'Pilot feedback' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const { activeEvents } = useData();
  const { isAdmin } = useAuth();

  return (
    <header className="site-header">
      <div className="utility">
        <div className="container utility-inner">
          <Link to="/#map"><MapIcon size={14} aria-hidden /> Map room</Link>
          <Link to="/alerts">
            <Bell size={14} aria-hidden /> Alerts{activeEvents.length > 0 && <span className="count" aria-label={`${activeEvents.length} active`}>{activeEvents.length}</span>}
          </Link>
          <Link to="/admin"><ShieldCheck size={14} aria-hidden /> {isAdmin ? 'Operations' : 'Login'}</Link>
          <span className="lang" title="Other languages to be decided during discovery">English <ChevronDown size={14} aria-hidden /></span>
        </div>
      </div>

      <div className="container mainbar">
        <Link to="/" className="brand" aria-label="BlueIntel Nigeria home">
          <svg width="38" height="38" viewBox="0 0 64 64" aria-hidden="true">
            <rect width="64" height="64" rx="14" fill="#072b45" />
            <path d="M8 38c8-10 14-10 22 0s14 10 26 0" fill="none" stroke="#5ad1d6" strokeWidth="6" strokeLinecap="round" />
            <path d="M8 24c8-10 14-10 22 0s14 10 26 0" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity=".9" />
          </svg>
          <span className="brand-text">
            <span className="brand-name">Blue<em>Intel</em></span>
            <span className="brand-sub">Nigeria · Ocean data intelligence</span>
          </span>
        </Link>

        <button className="menu-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="main-nav" aria-label="Toggle menu">
          {open ? <X /> : <Menu />}
        </button>

        <nav id="main-nav" className={`nav ${open ? 'open' : ''}`} aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <AlertTicker />
    </header>
  );
}
