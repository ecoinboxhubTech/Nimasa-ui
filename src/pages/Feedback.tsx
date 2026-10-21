import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function Feedback() {
  const [sent, setSent] = useState(false);
  const [rating, setRating] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');

  if (sent) {
    return (
      <div className="container section page narrow">
        <div className="state"><CheckCircle2 aria-hidden /><strong>Thank you</strong><span>Demo build: your answers stayed in this browser and were not transmitted.</span></div>
      </div>
    );
  }

  return (
    <div className="container section page narrow">
      <h1>Pilot feedback</h1>
      <p className="lead">Help us test whether this platform is clear and useful. Answers are optional and no personal details are needed.</p>
      <form className="form" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
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
        <button className="btn btn-primary" type="submit">Send feedback</button>
        <p className="muted">Demo form. A production version would POST to <code>/api/v1/feedback</code> with data minimisation and a privacy notice.</p>
      </form>
    </div>
  );
}
