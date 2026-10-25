import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import AlertTicker from '../components/AlertTicker';
import Footer from '../components/Footer';

/** The public data dashboard: sidebar, top bar and live alert ticker. */
export default function DashboardLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <div className="app">
      <a href="#content" className="skip">Skip to content</a>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="app-main">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main id="content">
          <AlertTicker />
          <Outlet />
        </main>
        <Footer compact />
      </div>
    </div>
  );
}
