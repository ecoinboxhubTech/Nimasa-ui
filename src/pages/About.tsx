const PRINCIPLES = [
  ['Trust before novelty', 'Show data source, observation or forecast time, units and limitations.'],
  ['Useful before broad', 'Solve one validated user problem before adding more audiences and datasets.'],
  ['Mobile-first, low-bandwidth', 'Keep core pages light and make stale or offline data status clear.'],
  ['Human decision support', 'Communicate uncertainty. Never imply the app guarantees safe travel or fishing outcomes.'],
  ['Responsible data use', 'Respect source licences, terms, privacy and attribution requirements.'],
  ['Evidence-led AI', 'AI summaries must be grounded in available data and separate fact from interpretation.'],
];
const ROADMAP = [
  ['Phase 0: Discovery', 'Interview users, pick one persona and coastal area, verify datasets, licences and cadence.'],
  ['Phase 1: Foundation', 'Repository, React app, FastAPI service, database, basic map and deployment pipeline.'],
  ['Phase 2: Data MVP', 'One or two ingestion adapters, validation, metadata, map layer and charts.'],
  ['Phase 3: Alerts & reliability', 'One alert rule, duplicate suppression, stale-data handling, logs and monitoring.'],
  ['Phase 4: Pilot', 'User tests, feedback, task outcomes and UX revisions.'],
  ['Phase 5: Expansion decision', 'Evaluate AI summaries, accounts, more sources and a revenue model.'],
];

export default function About() {
  return (
    <div className="container section page">
      <h1>About BlueIntel Nigeria</h1>
      <p className="lead">
        BlueIntel Nigeria aims to make relevant ocean and coastal information easier to find, understand and use, by combining selected, legally accessible
        marine, meteorological and environmental datasets in a mobile-friendly web application.
      </p>

      <div className="notice notice-warn">
        <div>
          <strong>What this tool is not.</strong> BlueIntel does not guarantee safe voyages, navigation, fishing success or emergency response. It does not replace official
          warnings, maritime authorities, navigational charts or professional advice. It does not predict fish locations.
        </div>
      </div>

      <h2>Product principles</h2>
      <div className="trust-grid">{PRINCIPLES.map(([t, b]) => <div className="trust" key={t}><h3>{t}</h3><p>{b}</p></div>)}</div>

      <h2>Release scope</h2>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Release</th><th>Included</th><th>Deferred / conditional</th></tr></thead>
          <tbody>
            <tr><td>MVP</td><td>Map, data-source metadata, charts, basic alert, responsive UI, freshness/error states, pilot feedback.</td><td>AI chat, complex user roles, payments, custom sensors, advanced forecasting.</td></tr>
            <tr><td>Release 1.1</td><td>Saved locations, accounts if needed, alert preferences, improved export and usability.</td><td>Only after user feedback and security review.</td></tr>
            <tr><td>Later</td><td>AI-assisted Q&amp;A, more data integrations, organisation dashboards, API access, subscriptions.</td><td>Requires validated demand, source permissions, budget and model evaluation.</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Delivery roadmap</h2>
      <ol className="roadmap">{ROADMAP.map(([t, b]) => <li key={t}><strong>{t}</strong><span>{b}</span></li>)}</ol>

      <h2>Privacy</h2>
      <p>
        The public MVP requires no account and collects no personal information. Feedback is optional and collects only what is needed. A full privacy notice and a review
        against Nigerian data-protection obligations are required before production launch.
      </p>
    </div>
  );
}
