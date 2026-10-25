import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Mail, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BrandMark } from '../components/Sidebar';

export default function AdminLogin() {
  const { isAdmin, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (isAdmin) return <Navigate to="/admin" replace />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    signIn();
    navigate('/admin', { replace: true });
  };

  return (
    <div className="login">
      <aside className="login-art" aria-hidden="true">
        <BrandMark size={44} />
        <h2>Operations console</h2>
        <p>Monitor feed health, ingestion runs and alert rules for BlueIntel Nigeria.</p>
      </aside>

      <main className="login-main" id="content">
        <div className="login-card card glass-card">
          <Link to="/" className="inline-link back"><ArrowLeft size={14} aria-hidden /> Back to website</Link>
          <h1>Staff sign in</h1>
          <p className="muted">Authorised operations staff only.</p>

          <div className="notice notice-warn">
            <ShieldAlert size={18} aria-hidden />
            <div><strong>Demo placeholder.</strong> There is no real authentication in this build, so any details will sign you in. Production must enforce server-side authentication and role-based authorisation (NFR-006, FR-023).</div>
          </div>

          <form onSubmit={submit} className="login-form">
            <label className="field">Email
              <span className="input-icon"><Mail size={18} aria-hidden /><input type="text" inputMode="email" autoComplete="username" placeholder="name@organisation.ng" value={email} onChange={(e) => setEmail(e.target.value)} /></span>
            </label>
            <label className="field">Password
              <span className="input-icon"><Lock size={18} aria-hidden /><input type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} /></span>
            </label>
            <button className="btn btn-primary btn-lg" type="submit">Sign in</button>
          </form>
        </div>
      </main>
    </div>
  );
}
