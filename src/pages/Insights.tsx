import { useState } from 'react';
import { Bot, Clock3, ExternalLink, Send, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react';
import { API_BASE, askInsight, HttpError, parseUtc, type InsightAnswer } from '../api/client';
import { useData } from '../context/DataContext';
import { formatDateTime } from '../lib/time';
import { KindBadge } from '../components/Badges';

const GUARDRAILS = [
  'Answers only from retrieved platform data and approved documentation.',
  'Cites the datasets and records used in every answer.',
  'States clearly when data is missing, stale, uncertain or outside coverage.',
  'Never gives navigation instructions, emergency advice or safety guarantees.',
  'Never presents generated text as an official warning.',
  'The map, charts and alerts keep working if the AI service is unavailable.',
];

export default function Insights() {
  const { locationId, locations } = useData();
  const [question, setQuestion] = useState('');
  const [selected, setSelected] = useState(locationId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [answer, setAnswer] = useState<InsightAnswer>();
  const [history, setHistory] = useState<{ q: string; at: number }[]>([]);

  const suggestions = [
    'Which locations have the strongest wind right now?',
    'Are any active advisories dependent on stale data?',
    ...locations.slice(0, 2).map((l) => `What is the latest wave height at ${l.name}, and how old is it?`),
  ];
  const docsUrl = API_BASE.startsWith('http') ? `${new URL(API_BASE).origin}/docs` : `${API_BASE}/health`;

  const submit = async (q = question) => {
    const text = q.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await askInsight(text, selected || undefined);
      setAnswer(result);
      setHistory((h) => [{ q: text, at: Date.now() }, ...h].slice(0, 6));
      setQuestion('');
    } catch (e) {
      setError(e instanceof HttpError ? e.message : 'The insight service is unavailable. The map and data remain available.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container section page narrow">
      <span className="badge kind-model">Grounded AI � source-cited</span>
      <h1>AI-assisted insights</h1>
      <p className="lead">
        Ask a question about the data on this platform. Answers are generated only from retrieved readings and cite the
        records used. AI is optional: every map, chart and alert keeps working when the model is unavailable.
      </p>

      <div className="card ask-card">
        <div className="ask-row">
          <Bot aria-hidden />
          <label className="sr-only" htmlFor="insight-question">Your question</label>
          <input id="insight-question" value={question} maxLength={500} placeholder="Ask about conditions, trends or data quality."
                 onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }} disabled={busy} />
          <select aria-label="Location context" value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">All locations</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => void submit()} disabled={busy || !question.trim()}>
            <Send size={16} aria-hidden /> {busy ? 'Thinking.' : 'Ask'}
          </button>
        </div>
        <div className="chips">
          {suggestions.map((s) => <button key={s} className="chip" onClick={() => void submit(s)} disabled={busy}>{s}</button>)}
        </div>
      </div>

      {error && <div className="notice notice-warn" role="alert"><TriangleAlert size={18} aria-hidden /><div><strong>No answer returned.</strong> {error}</div></div>}

      {answer && (
        <section className="card insight-answer" aria-live="polite">
          <div className="card-head">
            <h2><Sparkles size={20} aria-hidden /> Answer</h2>
            <span className="badge">{answer.answer_type.replace(/_/g, ' ')}</span>
          </div>
          <p className="insight-text">{answer.answer}</p>
          <h3>Citations</h3>
          {answer.citations.length ? (
            <div className="table-scroll">
              <table>
                <thead><tr><th>Location</th><th>Dataset</th><th>Value</th><th>Type</th><th>Source time</th><th>Freshness</th><th>Source</th></tr></thead>
                <tbody>
                  {answer.citations.map((c) => (
                    <tr key={c.id}>
                      <td>{c.location}</td><td>{c.dataset}</td><td>{c.value} {c.unit}</td><td><KindBadge kind={c.data_type} /></td>
                      <td>{formatDateTime(parseUtc(c.observed_at))}</td><td>{c.freshness}</td><td>{c.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="muted">No matching records were retrieved, so no factual answer is asserted.</p>}
          {answer.limitations.length > 0 && <ul className="checks">{answer.limitations.map((l) => <li key={l}>{l}</li>)}</ul>}
          <p className="muted small">{answer.disclaimer} Model: {answer.model ?? 'not configured'}.</p>
        </section>
      )}

      {history.length > 0 && (
        <section className="card">
          <h2><Clock3 size={20} aria-hidden /> Recent questions</h2>
          <ul className="history-list">{history.map((h) => <li key={`${h.at}`}><button className="linklike" onClick={() => void submit(h.q)}>{h.q}</button><small>{formatDateTime(h.at)}</small></li>)}</ul>
        </section>
      )}

      <h2><ShieldCheck size={22} aria-hidden /> Guardrails in force</h2>
      <ul className="checks">{GUARDRAILS.map((g) => <li key={g}>{g}</li>)}</ul>
      <p className="muted">If the model is down or disabled, the API returns a clear unavailable state instead of inventing an answer. <a className="inline-link" href={docsUrl} target="_blank" rel="noreferrer">API reference <ExternalLink size={12} aria-hidden /></a></p>
    </div>
  );
}

