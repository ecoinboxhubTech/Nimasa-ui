import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Alerts from './pages/Alerts';
import Sources from './pages/Sources';
import Admin from './pages/Admin';
import About from './pages/About';
import Insights from './pages/Insights';
import Feedback from './pages/Feedback';

function ScrollTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => { if (!hash) window.scrollTo(0, 0); }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <>
      <a href="#content" className="skip">Skip to content</a>
      <Header />
      <ScrollTop />
      <main id="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/about" element={<About />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<div className="container section page"><h1>Page not found</h1><a href="/">Back to dashboard</a></div>} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
