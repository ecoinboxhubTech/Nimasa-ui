import { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { USE_API, sendFeedback } from '../api/client';

const FOUND = { 'Yes, easily': 'yes_easily', 'Yes, with difficulty': 'yes_with_difficulty', No: 'no' } as const;
const CLEAR = { 'Yes: source and time were clear': 'yes', Partly: 'partly', No: 'no' } as const;

export default function Feedback() {
  const [sent, setSent] = useState(false);
  const [rating, setRating] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!USE_API) { setSent(true); return; }
    setBusy(true);
    setError(undefined);
    try {
      await sendFeedback({
        found_information: FOUND[rating as keyof typeof FOUND] ?? null,
        source_clarity: CLEAR[source as keyof typeof CLEAR] ?? null,
        comments: notes.trim() || null,
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send feedback.');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="container section page narrow">
        <div className="state"><CheckCircle2 aria-hidden /><strong>Thank you</strong><span>{USE_API ? 'Your feedback was sent. We read every response.' : 'Demo build: your answers stayed in this browser and were not transmitted.'}</span></div>
      </div>
    );
  }

  return (
    <div className="container section page narrow">
      <h1>Pilot feedback</h1>
      <p className="lead">Help us test whether this platform is clear and useful. Answers are optional and no personal details are needed.</p>
      <form className="form" onSubmit={submit}>
        <fieldset>
          <legend>Did you find the information you needed?</legend>
          {['Yes, easily', 'Yes, with difficulty', 'No'].map((o) => (
            <label key={o} className="check"><input type="radio" name="rating" value={o} checked={rating === o} onChange={() => setRating(o)} /> {o}</label>
          ))}
        </fieldset>
        <fieldset>
          <legend>For the value you looked at, could you tell where it came from?</legend>
          {['Yes: source and time were clear', 'Partly', 'No'].map((o) => (
            <label key={o} className="check"><input type="radio" name="source" value={o} checked={source === o} onChange={() => setSource(o)} /> {o}</label>
          ))}
        </fieldset>
        <label className="field">What would make this more useful?
          <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
        </label>
        {error && <div className="notice notice-warn" role="alert"><AlertTriangle size={18} aria-hidden /><div>{error}</div></div>}
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send feedback'}</button>
      </form>
    </div>
  );
}
