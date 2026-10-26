import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ExternalLink, Gauge, HeartPulse, ListChecks, LogOut, Menu, ScrollText, SlidersHorizontal, X } from 'lucide-react';
import { BrandMark } from '../components/Sidebar';
import { USE_API } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const SECTIONS = [
  { id: 'health', label: 'Health', icon: HeartPulse },
  { id: 'simulate', label: 'Simulate feeds', icon: SlidersHorizontal },
  { id: 'freshness', label: 'Feed freshness', icon: Gauge },
  { id: 'runs', label: 'Ingestion runs', icon: Activity },
  { id: 'rules', label: 'Alert rules', icon: ListChecks },
  { id: 'audit', label: 'Audit trail', icon: ScrollText },
];

/** Operations console. Signed-out visitors are sent to the login page. */
export default function AdminLayout() {
  const { isAdmin, signOut } = useAuth();
  const { setMode } = useData();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => setOpen(false), [pathname]);
  // Feed simulations are a review tool: never let them leak into the public dashboard.
  useEffect(() => () => setMode('normal'), [setMode]);

  if (!isAdmin) return <Navigate to="/admin/login" replace />;

  return (
    <div className="app admin-app">
      <a href="#content" className="skip">Skip to content</a>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Operations">
        <div className="sidebar-top">
          <Link to="/admin" className="brand" aria-label="Operations home">
            <BrandMark />
            <span className="brand-text">
              <span className="brand-name">Orizon Nimasa</span>
              <span className="brand-sub">Operations console</span>
            </span>
          </Link>
          <button className="icon-btn sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <nav className="side-nav" aria-label="Sections">
          {SECTIONS.filter((s) => !(USE_API && s.id === 'simulate')).map(({ id, label, icon: Icon }) => (
            <a key={id} href={`#${id}`} className="side-link" onClick={() => setOpen(false)}>
              <span className="side-link-main"><Icon size={20} aria-hidden /> {label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <Link to="/dashboard" className="side-link"><span className="side-link-main"><ExternalLink size={20} aria-hidden /> View public dashboard</span></Link>
          <button className="side-link side-btn" onClick={() => { signOut(); navigate('/admin/login'); }}>
            <span className="side-link-main"><LogOut size={20} aria-hidden /> Sign out</span>
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="topbar-title">
            <strong>Operations</strong>
            <span className="label">{USE_API ? 'Signed in' : 'Demo administrator · sample data'}</span>
          </div>
          <span className="spacer" />
          <Link to="/dashboard" className="btn hide-sm-btn">Public dashboard</Link>
          <span className="avatar" aria-hidden>AD</span>
        </header>
        <main id="content"><Outlet /></main>
      </div>
    </div>
  );
}
