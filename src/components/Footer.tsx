import { Link } from 'react-router-dom';
import { TILE_ATTRIBUTION } from '../config';

export default function Footer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <footer className="footer footer-compact">
        <p>
          Orizon Nimasa is an informational tool, <strong>not</strong> an official forecast, warning or navigation aid. All values are synthetic sample data.
          <span className="attrib" dangerouslySetInnerHTML={{ __html: ` Map: ${TILE_ATTRIBUTION}` }} />
        </p>
        <Link to="/about">About &amp; limits</Link>
      </footer>
    );
  }
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <strong className="footer-title">Orizon Nimasa</strong>
          <p>
            Source-labelled ocean and coastal information for selected Nigerian waters. This is an informational tool. It is
            <strong> not</strong> an official forecast, warning, navigation aid or emergency service, and it cannot guarantee safe
            travel or fishing outcomes. Follow guidance from official maritime and meteorological authorities.
          </p>
        </div>
        <div>
          <strong className="footer-title">Explore</strong>
          <ul>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><Link to="/alerts">Alerts</Link></li>
            <li><Link to="/sources">Data sources &amp; licences</Link></li>
            <li><Link to="/about">About &amp; limits</Link></li>
            <li><Link to="/feedback">Pilot feedback</Link></li>
          </ul>
        </div>
        <div>
          <strong className="footer-title">Demo build</strong>
          <p>All values are synthetic sample data for design review. No real measurements are shown.</p>
          <p className="attrib" dangerouslySetInnerHTML={{ __html: `Map: ${TILE_ATTRIBUTION}` }} />
          <p><Link to="/admin/login">Staff login</Link></p>
        </div>
      </div>
    </footer>
  );
}
