import { useState } from 'react';
import { Eye, EyeOff, KeyRound, LogIn, MailCheck, Sparkles } from 'lucide-react';
import AuthShell, { GoogleLogo } from './AuthShell';
import { Alert, Spinner } from '../ui';
import GoogleConsentModal from '../modals/GoogleConsentModal';
import { useAuth } from '../../context/AuthContext';
import { DEMO_USER } from '../../data/mockData';
import { formatTime } from '../../utils/format';

export default function LoginPage() {
  const { login, googleSignIn, sendMagicLink, consumeMagicLink, magicLink, authNotice, setAuthNotice } = useAuth();
  const [email, setEmail] = useState(authNotice?.email ?? '');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [googleOpen, setGoogleOpen] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setAuthNotice(null);
    setBusy('login');
    const res = await login(email, password);
    setBusy('');
    if (!res.ok) setError(res.error);
  };

  const requestMagic = async () => {
    setError('');
    setAuthNotice(null);
    setBusy('magic');
    const res = await sendMagicLink(email);
    setBusy('');
    if (!res.ok) setError(res.error);
  };

  const openMagic = () => {
    const res = consumeMagicLink(magicLink.token);
    if (!res.ok) setError(res.error);
  };

  const fillDemo = () => {
    setEmail(DEMO_USER.email);
    setPassword(DEMO_USER.password);
    setError('');
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see your quarterly tax position and chase overdue invoices."
      footer={
        <>
          New here?{' '}
          <a href="#/register" className="font-semibold text-brand hover:underline">
            Create an account
          </a>
        </>
      }
    >
      <div className="space-y-4">
        {authNotice && <Alert kind={authNotice.kind}>{authNotice.text}</Alert>}
        {error && <Alert kind="error">{error}</Alert>}

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="login-email" className="label">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="label">Password</label>
            <div className="relative">
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                className="input pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-700"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={Boolean(busy)}>
            {busy === 'login' ? <Spinner /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
            Sign in
          </button>
        </form>

        <div className="relative py-1 text-center text-xs uppercase tracking-wide text-slate-400">
          <span className="absolute inset-x-0 top-1/2 h-px bg-slate-200" aria-hidden="true" />
          <span className="relative bg-white px-3">or</span>
        </div>

        <div className="space-y-2.5">
          <button type="button" onClick={requestMagic} className="btn btn-secondary w-full" disabled={Boolean(busy)}>
            {busy === 'magic' ? <Spinner /> : <Sparkles className="h-4 w-4 text-brand" aria-hidden="true" />}
            Send Passwordless Magic Link
          </button>
          <button type="button" onClick={() => setGoogleOpen(true)} className="btn btn-secondary w-full" disabled={Boolean(busy)}>
            <GoogleLogo />
            Continue with Google (OAuth 2.0)
          </button>
        </div>

        {magicLink && (
          <div className="animate-fade-in rounded-lg border border-teal-200 bg-brand-soft p-3.5 text-sm" aria-live="polite">
            <p className="flex items-center gap-2 font-semibold text-teal-900">
              <MailCheck className="h-4 w-4" aria-hidden="true" />
              Simulated inbox · new email
            </p>
            <p className="mt-1.5 break-words text-slate-700">
              <span className="font-medium">To:</span> {magicLink.email}
              <br />
              <span className="font-medium">Subject:</span> Your sign-in link for Tax &amp; Invoice Chaser
            </p>
            <p className="mt-1 text-xs text-slate-500">Single-use · expires at {formatTime(new Date(magicLink.expires).toISOString())}</p>
            <button type="button" onClick={openMagic} className="btn btn-primary btn-sm mt-3">
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              Click magic link to sign in
            </button>
          </div>
        )}

        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">Demo account</p>
          <p className="mt-1 break-all font-mono">{DEMO_USER.email}</p>
          <p className="break-all font-mono">{DEMO_USER.password}</p>
          <button type="button" onClick={fillDemo} className="mt-2 font-semibold text-brand hover:underline">
            Fill demo credentials
          </button>
        </div>
      </div>

      <GoogleConsentModal open={googleOpen} onClose={() => setGoogleOpen(false)} onAllow={googleSignIn} />
    </AuthShell>
  );
}
