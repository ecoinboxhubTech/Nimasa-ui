import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Code2, Database, ExternalLink, Gauge, HeartPulse, ListChecks, LogOut, MapPin, Menu, ScrollText, ShieldCheck, Users, X } from 'lucide-react';
import { BrandMark } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const SECTIONS = [
  { id: 'operations', label: 'Operations', icon: HeartPulse },
  { id: 'sources', label: 'Sources', icon: Database },
  { id: 'rules', label: 'Alert rules', icon: ListChecks },
  { id: 'locations', label: 'Locations', icon: MapPin },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'developers', label: 'API keys', icon: Code2 },
  { id: 'jobs', label: 'Jobs & quality', icon: Gauge },
  { id: 'staff', label: 'Staff', icon: Users, admin: true },
  { id: 'profile', label: 'My account', icon: ShieldCheck },
  { id: 'audit', label: 'Audit trail', icon: ScrollText },
];

/** Operations console. Signed-out visitors are sent to the login page. */
export default function AdminLayout() {
  const { isAdmin, signOut, canAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => setOpen(false), [pathname]);

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
          {SECTIONS.filter((s) => !s.admin || canAdmin).map(({ id, label, icon: Icon }) => (
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
            <span className="label">Signed in</span>
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
