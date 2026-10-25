import { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Alerts from './pages/Alerts';
import Sources from './pages/Sources';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';
import About from './pages/About';
import Insights from './pages/Insights';
import Feedback from './pages/Feedback';

function ScrollTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => { if (!hash) window.scrollTo(0, 0); }, [pathname, hash]);
  return null;
}

const NotFound = () => (
  <div className="container section page"><h1>Page not found</h1><Link to="/">Back to home</Link></div>
);

export default function App() {
  return (
    <>
      <ScrollTop />
      <Routes>
        {/* 1. Public website */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* 2. Public dashboard */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Home />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/insights" element={<Insights />} />
        </Route>

        {/* 3. Admin login */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* 4. Admin dashboard (requires sign-in) */}
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Routes>
    </>
  );
}
