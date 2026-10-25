import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { BrandMark } from '../components/Sidebar';
import Footer from '../components/Footer';

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/about', label: 'About & limits' },
  { to: '/feedback', label: 'Pilot feedback' },
];

/** The public marketing website: top navigation, no dashboard sidebar. */
export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="site">
      <a href="#content" className="skip">Skip to content</a>
      <header className="site-header">
        <div className="site-header-inner">
          <Link to="/" className="brand" aria-label="BlueIntel Nigeria home">
            <BrandMark />
            <span className="brand-text">
              <span className="brand-name">BlueIntel</span>
              <span className="brand-sub">Nigeria · Ocean data</span>
            </span>
          </Link>

          <nav id="site-nav" className={`site-nav ${open ? 'open' : ''}`} aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)} className={({ isActive }) => (isActive ? 'active' : '')}>{n.label}</NavLink>
            ))}
            <Link to="/dashboard" className="btn btn-primary nav-cta" onClick={() => setOpen(false)}>Open dashboard <ArrowRight size={16} aria-hidden /></Link>
          </nav>

          <button className="icon-btn site-menu" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="site-nav" aria-label="Toggle menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
      <main id="content"><Outlet /></main>
      <Footer />
    </div>
  );
}
