import { useState, type FormEvent } from 'react';
import { HttpError, adminConfirmReset, adminRequestReset } from '../api/client';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, KeyRound, Lock, Mail, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BrandMark } from '../components/Sidebar';

type Mode = 'login' | 'forgot' | 'reset';

export default function AdminLogin() {
  const { isAdmin, signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const resetToken = params.get('reset') ?? '';
  const [mode, setMode] = useState<Mode>(resetToken ? 'reset' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [needMfa, setNeedMfa] = useState(false);
  const [token, setToken] = useState(resetToken);
  const [newPassword, setNewPassword] = useState('');
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  if (isAdmin && mode === 'login') return <Navigate to="/admin" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined); setNotice(undefined); setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(email, password, totp || undefined);
        navigate('/admin', { replace: true });
      } else if (mode === 'forgot') {
        const r = await adminRequestReset(email);
        setNotice(r.reset_token ? `Development reset token: ${r.reset_token}` : 'If the account exists, a reset link has been sent.');
        if (r.reset_token) { setToken(r.reset_token); setMode('reset'); }
      } else {
        await adminConfirmReset(token.trim(), newPassword);
        setNotice('Password updated. Sign in with your new password.');
        setMode('login'); setPassword(''); setNewPassword(''); setTotp('');
      }
    } catch (err) {
      if (err instanceof HttpError && err.code === 'MFA_REQUIRED') {
        setNeedMfa(true);
        setError('Enter the six-digit code from your authenticator app.');
      } else setError(err instanceof Error ? err.message : 'Request failed.');
    } finally { setBusy(false); }
  };

  return (
    <div className="login">
      <aside className="login-art" aria-hidden="true">
        <BrandMark size={44} />
        <h2>Operations console</h2>
        <p>Monitor feed health, ingestion runs and alert rules for Orizon Nimasa.</p>
      </aside>

      <main className="login-main" id="content">
        <div className="login-card card glass-card">
          <Link to="/" className="inline-link back"><ArrowLeft size={14} aria-hidden /> Back to website</Link>
          <h1>{mode === 'login' ? 'Staff sign in' : mode === 'forgot' ? 'Reset your password' : 'Choose a new password'}</h1>
          <p className="muted">Authorised operations staff only.</p>

          {notice && <div className="notice notice-info" role="status"><ShieldCheck size={18} aria-hidden /><div>{notice}</div></div>}
          {error && <div className="notice notice-warn" role="alert"><ShieldAlert size={18} aria-hidden /><div>{error}</div></div>}

          <form onSubmit={submit} className="login-form">
            {mode !== 'reset' && (
              <label className="field">Email
                <span className="input-icon"><Mail size={18} aria-hidden /><input type="text" inputMode="email" autoComplete="username" placeholder="name@organisation.ng" value={email} onChange={(e) => setEmail(e.target.value)} required /></span>
              </label>
            )}
            {mode === 'login' && (
              <label className="field">Password
                <span className="input-icon"><Lock size={18} aria-hidden /><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></span>
              </label>
            )}
            {mode === 'login' && (needMfa || totp) && (
              <label className="field">Authenticator code
                <span className="input-icon"><ShieldCheck size={18} aria-hidden /><input inputMode="numeric" pattern="[0-9]*" maxLength={6} autoComplete="one-time-code" placeholder="123456" value={totp} onChange={(e) => setTotp(e.target.value.replace(/\D/g, ''))} /></span>
              </label>
            )}
            {mode === 'reset' && (
              <>
                <label className="field">Reset token
                  <span className="input-icon"><KeyRound size={18} aria-hidden /><input value={token} onChange={(e) => setToken(e.target.value)} required /></span>
                </label>
                <label className="field">New password
                  <span className="input-icon"><Lock size={18} aria-hidden /><input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></span>
                </label>
              </>
            )}
            <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
              {busy ? 'Working.' : mode === 'login' ? 'Sign in' : mode === 'forgot' ? 'Send reset link' : 'Set new password'}
            </button>
          </form>

          <p className="muted small auth-links">
            {mode === 'login' ? <button className="linklike" onClick={() => { setMode('forgot'); setError(undefined); setNotice(undefined); }}>Forgot password?</button>
              : <button className="linklike" onClick={() => { setMode('login'); setError(undefined); setNotice(undefined); }}>Back to sign in</button>}
          </p>
        </div>
      </main>
    </div>
  );
}
