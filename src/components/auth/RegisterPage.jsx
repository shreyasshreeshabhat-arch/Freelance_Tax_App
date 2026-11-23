import { useState } from 'react';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import AuthShell, { GoogleLogo } from './AuthShell';
import { Alert, Spinner } from '../ui';
import GoogleConsentModal from '../modals/GoogleConsentModal';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { useSystem } from '../../context/SystemContext';

export default function RegisterPage() {
  const { register, googleSignIn, setAuthNotice } = useAuth();
  const { navigate } = useRouter();
  const { pushToast } = useSystem();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);
    const res = await register(form);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSuccess(res.message);
    pushToast('success', res.message);
    setAuthNotice({ kind: 'success', text: res.message, email: res.email });
    setTimeout(() => navigate('/login'), 1400);
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start tracking income, expenses and overdue invoices in minutes."
      footer={
        <>
          Already registered?{' '}
          <a href="#/login" className="font-semibold text-brand hover:underline">
            Sign in
          </a>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        {success && <Alert kind="success">{success}</Alert>}

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="reg-name" className="label">Full name</label>
            <input id="reg-name" className="input" autoComplete="name" value={form.name} onChange={set('name')} placeholder="Shreyas Bhat" />
          </div>
          <div>
            <label htmlFor="reg-email" className="label">Email ID</label>
            <input id="reg-email" type="email" className="input" autoComplete="email" value={form.email} onChange={set('email')} placeholder="you@company.com" />
          </div>
          <div>
            <label htmlFor="reg-password" className="label">Password</label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPw ? 'text' : 'password'}
                className="input pr-10"
                autoComplete="new-password"
                value={form.password}
                onChange={set('password')}
                placeholder="Min. 8 characters, letters + numbers"
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
            <p className="mt-1 text-xs text-slate-500">At least 8 characters with both letters and numbers.</p>
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={busy || Boolean(success)}>
            {busy ? <Spinner /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
            Register
          </button>
        </form>

        <div className="relative py-1 text-center text-xs uppercase tracking-wide text-slate-400">
          <span className="absolute inset-x-0 top-1/2 h-px bg-slate-200" aria-hidden="true" />
          <span className="relative bg-white px-3">or</span>
        </div>

        <button type="button" onClick={() => setGoogleOpen(true)} className="btn btn-secondary w-full" disabled={busy}>
          <GoogleLogo />
          Continue with Google (OAuth 2.0)
        </button>
      </div>

      <GoogleConsentModal open={googleOpen} onClose={() => setGoogleOpen(false)} onAllow={googleSignIn} />
    </AuthShell>
  );
}
