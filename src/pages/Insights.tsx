import { Bot, Lock, ShieldCheck } from 'lucide-react';

const GUARDRAILS = [
  'Answers only from retrieved platform data and approved documentation.',
  'Cites the datasets and records used in every answer.',
  'States clearly when data is missing, stale, uncertain or outside coverage.',
  'Never gives navigation instructions, emergency advice or safety guarantees.',
  'Never presents generated text as an official warning.',
  'The map, charts and alerts keep working if the AI service is unavailable.',
];

export default function Insights() {
  return (
    <div className="container section page narrow">
      <span className="badge kind-forecast">Planned · post-MVP</span>
      <h1>AI-assisted insights</h1>
      <p className="lead">
        A future feature that will answer questions about the data shown on this platform, grounded in the displayed values and their sources. It is not active in this release.
      </p>

      <div className="card ask-disabled" aria-disabled="true">
        <div className="ask-row">
          <Bot aria-hidden />
          <input disabled placeholder="Ask a question about conditions (available after validation)" aria-label="Question (disabled)" />
          <button className="btn" disabled><Lock size={14} aria-hidden /> Unavailable</button>
        </div>
      </div>

      <h2><ShieldCheck size={22} aria-hidden /> Guardrails planned from day one</h2>
      <ul className="checks">{GUARDRAILS.map((g) => <li key={g}>{g}</li>)}</ul>
      <p className="muted">AI will be enabled only after it is evaluated with a human-reviewed question set covering correct answers, stale data, missing data, ambiguous questions and safety-sensitive prompts.</p>
    </div>
  );
}
