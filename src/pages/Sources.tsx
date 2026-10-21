import { DATASETS, SOURCES, getSource } from '../config';
import { KindBadge } from '../components/Badges';

const INVESTIGATION = [
  ['Weather and warnings', 'Does the provider cover the selected coast? Are current conditions and warnings accessible? Can the data be displayed commercially? What is the update cadence?', 'Provider, endpoint, licence and freshness policy'],
  ['Ocean / wave data', 'Are wave, current or sea-surface variables available at useful resolution? Are values observations or model estimates?', 'Dataset list, limitations and units'],
  ['Geospatial layers', 'Can coastlines, boundaries and base maps be used and attributed? Are tile-use limits compatible with expected traffic?', 'Map library, basemap and attribution plan'],
  ['Environmental indicators', 'Are methods, units, uncertainty and coverage documented? Is the dataset maintained?', 'Indicator definitions and inclusion decision'],
];

export default function Sources() {
  return (
    <div className="container section page">
      <h1>Data sources &amp; licences</h1>
      <p className="lead">
        Transparency about where data comes from. The demo build uses <strong>synthetic sample data only</strong>. Real providers appear below as
        <em> candidates</em>: none is approved until its licence, coverage and terms are reviewed.
      </p>

      <h2>Sources</h2>
      <div className="source-grid">
        {SOURCES.map((s) => (
          <article key={s.id} className={`card source ${s.status}`}>
            <div className="source-top">
              <h3>{s.name}</h3>
              <span className={`badge ${s.status === 'sample' ? 'kind-derived' : 'fresh-stale'}`}>{s.status === 'sample' ? 'In use (demo)' : 'Candidate: not approved'}</span>
            </div>
            <dl>
              <div><dt>Provider</dt><dd>{s.provider}</dd></div>
              <div><dt>Licence</dt><dd>{s.licence}</dd></div>
              <div><dt>Attribution</dt><dd>{s.attribution}</dd></div>
            </dl>
            <p>{s.note}</p>
            {s.documentationUrl && <a className="inline-link" href={s.documentationUrl} target="_blank" rel="noreferrer">Provider website ↗</a>}
          </article>
        ))}
      </div>

      <h2>Datasets in the dashboard</h2>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Indicator</th><th>Unit</th><th>Data type</th><th>Source</th><th>Expected refresh</th><th>Marked stale after</th></tr></thead>
          <tbody>
            {DATASETS.map((d) => (
              <tr key={d.key}>
                <td>{d.label}</td>
                <td>{d.unit}</td>
                <td><KindBadge kind={d.kind} />{d.hasForecast && <> <KindBadge kind="forecast" /></>}</td>
                <td>{getSource(d.sourceId).name}</td>
                <td>{d.refreshMinutes >= 60 ? `${d.refreshMinutes / 60} h` : `${d.refreshMinutes} min`}</td>
                <td>{d.staleAfterMinutes >= 60 ? `${d.staleAfterMinutes / 60} h` : `${d.staleAfterMinutes} min`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">Freshness limits are set per dataset from its real update cadence, not one universal threshold.</p>

      <h2>Source investigation checklist</h2>
      <p className="muted">Checked before any provider is approved. This is a checklist, not an endorsement of availability.</p>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Data category</th><th>Questions to answer</th><th>Decision output</th></tr></thead>
          <tbody>
            {INVESTIGATION.map(([a, b, c]) => <tr key={a}><td>{a}</td><td>{b}</td><td>{c}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
