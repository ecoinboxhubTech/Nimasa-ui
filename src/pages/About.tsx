const PRINCIPLES = [
  ['Trust before novelty', 'Show data source, observation or forecast time, units and limitations.'],
  ['Useful before broad', 'Solve one validated user problem before adding more audiences and datasets.'],
  ['Mobile-first, low-bandwidth', 'Keep core pages light and make stale or offline data status clear.'],
  ['Human decision support', 'Communicate uncertainty. Never imply the app guarantees safe travel or fishing outcomes.'],
  ['Responsible data use', 'Respect source licences, terms, privacy and attribution requirements.'],
  ['Evidence-led AI', 'AI summaries must be grounded in available data and separate fact from interpretation.'],
];
export default function About() {
  return (
    <div className="container section page">
      <h1>About Orizon Nimasa</h1>
      <p className="lead">
        Orizon Nimasa aims to make relevant ocean and coastal information easier to find, understand and use, by combining selected, legally accessible
        marine, meteorological and environmental datasets in a mobile-friendly web application.
      </p>

      <div className="notice notice-warn">
        <div>
          <strong>What this tool is not.</strong> Orizon Nimasa does not guarantee safe voyages, navigation, fishing success or emergency response. It does not replace official
          warnings, maritime authorities, navigational charts or professional advice. It does not predict fish locations.
        </div>
      </div>

      <h2>Product principles</h2>
      <div className="trust-grid">{PRINCIPLES.map(([t, b]) => <div className="trust" key={t}><h3>{t}</h3><p>{b}</p></div>)}</div>

      <h2>Privacy</h2>
      <p>
        The public MVP requires no account and collects no personal information. Feedback is optional and collects only what is needed. A full privacy notice and a review
        against Nigerian data-protection obligations are required before production launch.
      </p>
    </div>
  );
}
