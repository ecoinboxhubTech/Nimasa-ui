import { useData } from '../context/DataContext';
import { KindBadge } from '../components/Badges';

export default function Sources() {
  const { sources, datasets, metadataError } = useData();
  return (
    <div className="container section page">
      <h1>Data sources &amp; licences</h1>
      <p className="lead">
        Transparency about where data comes from. Each source and dataset is loaded from the platform API, including licence and attribution details.
        Candidate providers must be approved before operational use.
      </p>
      {metadataError && <div className="notice notice-warn" role="alert">Could not refresh source metadata; showing the last loaded configuration. {metadataError}</div>}

      <h2>Sources</h2>
      <div className="source-grid">
        {sources.map((s) => (
          <article key={s.id} className={`card source ${s.enabled ? 'enabled' : 'candidate'}`}>
            <div className="source-top">
              <h3>{s.name}</h3>
              <span className={`badge ${s.enabled ? 'fresh-fresh' : 'fresh-stale'}`}>{s.enabled ? 'Enabled' : 'Disabled / candidate'}</span>
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
        {!sources.length && <p className="muted">No sources are configured.</p>}
      </div>

      <h2>Datasets in the dashboard</h2>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Indicator</th><th>Unit</th><th>Data type</th><th>Source</th><th>Expected refresh</th><th>Marked stale after</th></tr></thead>
          <tbody>
            {datasets.map((d) => (
              <tr key={d.key}>
                <td>{d.label}</td>
                <td>{d.unit}</td>
                <td><KindBadge kind={d.kind} />{d.hasForecast && <> <KindBadge kind="forecast" /></>}</td>
                <td>{sources.find((s) => s.id === d.sourceId)?.name ?? d.sourceId}</td>
                <td>{d.refreshMinutes >= 60 ? `${d.refreshMinutes / 60} h` : `${d.refreshMinutes} min`}</td>
                <td>{d.staleAfterMinutes >= 60 ? `${d.staleAfterMinutes / 60} h` : `${d.staleAfterMinutes} min`}</td>
              </tr>
            ))}
            {!datasets.length && <tr><td colSpan={6}>No datasets are configured.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="muted">Freshness limits are set per dataset from its real update cadence, not one universal threshold.</p>
    </div>
  );
}
