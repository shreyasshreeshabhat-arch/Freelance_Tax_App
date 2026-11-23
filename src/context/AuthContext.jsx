import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSystem } from './SystemContext';
import { useRouter } from './RouterContext';
import {
  createMagicLink,
  consumeMagicLink as consumeStoredMagicLink,
  createUser,
  ensureDemoUser,
  findUser,
  hasStoredToken,
  issueSession,
  maskToken,
  readMagicLink,
  readSession,
  resetUsers,
  revokeSession,
  verifyCredentials,
  normalizeEmail,
} from '../utils/auth';
import { MESSAGES, isValidEmail, validateRegistration } from '../utils/validators';
import { GOOGLE_ACCOUNT } from '../data/mockData';
import { removeKey, KEYS } from '../utils/storage';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const { log, pushToast } = useSystem();
  const { navigate } = useRouter();
  const [session, setSession] = useState(() => readSession());
  const [authNotice, setAuthNotice] = useState(null);
  const [magicLink, setMagicLink] = useState(() => readMagicLink());
  const demoReady = useRef(ensureDemoUser());
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  /** Re-reads the token from storage so deleting it in DevTools / another tab is noticed. */
  const refreshSession = useCallback(() => {
    const next = readSession();
    setSession((prev) => (prev?.token === next?.token ? prev : next));
    return next;
  }, []);

  useEffect(() => {
    const id = setInterval(refreshSession, 2500);
    const onStorage = (e) => {
      if (e.key === null || e.key === KEYS.session) refreshSession();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', refreshSession);
    return () => {
      clearInterval(id);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', refreshSession);
    };
  }, [refreshSession]);

  const startSession = useCallback(
    (user, method) => {
      const token = issueSession(user, method);
      setSession(readSession());
      setAuthNotice(null);
      log('AUTH', `Login successful (${method}): ${user.email}. Session token issued ${maskToken(token)}, valid 8h.`, 'success');
    },
    [log],
  );

  const login = useCallback(
    async (email, password) => {
      await demoReady.current;
      const user = isValidEmail(email) ? await verifyCredentials(email, password) : null;
      if (!user) {
        log('AUTH', `Login rejected for "${String(email || '(blank)').slice(0, 60)}": invalid credentials (401).`, 'error');
        return { ok: false, error: MESSAGES.loginInvalid };
      }
      startSession(user, 'password');
      navigate('/dashboard');
      return { ok: true };
    },
    [log, navigate, startSession],
  );

  const register = useCallback(
    async ({ name, email, password }) => {
      await demoReady.current;
      const check = validateRegistration({ name, email, password });
      if (!check.ok) {
        log('VALIDATION', `Registration rejected: ${check.error}`, 'error');
        return { ok: false, error: check.error };
      }
      if (findUser(email)) {
        log('VALIDATION', `Registration rejected: ${normalizeEmail(email)} already exists.`, 'warn');
        return { ok: false, error: 'An account with this email already exists. Please sign in.' };
      }
      const user = await createUser({ name, email, password });
      log('AUTH', `User registered: ${user.email} (password stored as salted SHA-256 hash).`, 'success');
      log('EMAIL', `Verification email dispatched to ${user.email} (simulated SMTP, 250 OK).`, 'success');
      return { ok: true, message: MESSAGES.registerSuccess, email: user.email };
    },
    [log],
  );

  const googleSignIn = useCallback(async () => {
    await demoReady.current;
    log('OAUTH', 'Google OAuth 2.0: redirect to accounts.google.com (scopes: openid email profile).', 'info');
    let user = findUser(GOOGLE_ACCOUNT.email);
    if (!user) {
      user = await createUser({ name: GOOGLE_ACCOUNT.name, email: GOOGLE_ACCOUNT.email, password: null, provider: 'google' });
      log('AUTH', `New account provisioned from Google profile: ${user.email}.`, 'success');
    }
    log('OAUTH', 'Google OAuth 2.0: authorization code exchanged for ID token (simulated).', 'success');
    startSession(user, 'google-oauth');
    navigate('/dashboard');
    return { ok: true };
  }, [log, navigate, startSession]);

  const sendMagicLink = useCallback(
    async (email) => {
      await demoReady.current;
      if (!isValidEmail(email)) {
        log('VALIDATION', `Magic link rejected: malformed email "${String(email || '').slice(0, 60)}".`, 'error');
        return { ok: false, error: 'Enter a valid email address to receive a magic link.' };
      }
      if (!findUser(email)) {
        log('AUTH', `Magic link requested for unknown account ${normalizeEmail(email)} — nothing sent.`, 'warn');
        return { ok: false, error: 'No account found for this email. Please register first.' };
      }
      const link = createMagicLink(email);
      setMagicLink(link);
      log('EMAIL', `Passwordless magic link emailed to ${link.email} (single-use, expires in 10 min).`, 'success');
      return { ok: true, link };
    },
    [log],
  );

  const consumeMagicLink = useCallback(
    (token) => {
      const user = consumeStoredMagicLink(token);
      setMagicLink(null);
      if (!user) {
        log('AUTH', 'Magic link rejected: expired or already used (401).', 'error');
        return { ok: false, error: 'This magic link has expired or was already used.' };
      }
      log('AUTH', `Magic link clicked by ${user.email}; one-time token redeemed.`, 'info');
      startSession(user, 'magic-link');
      navigate('/dashboard');
      return { ok: true };
    },
    [log, navigate, startSession],
  );

  const logout = useCallback(() => {
    const who = sessionRef.current?.email ?? 'unknown';
    revokeSession();
    setSession(null);
    setAuthNotice(null);
    log('AUTH', `Logout: session token revoked for ${who}.`, 'info');
    pushToast('info', 'Signed out', 'Your session token was revoked.');
    navigate('/login', { replace: true });
  }, [log, navigate, pushToast]);

  /** Wipes registered users + session, re-creates only the demo account. */
  const resetAuthStore = useCallback(async () => {
    revokeSession();
    resetUsers();
    removeKey(KEYS.magic);
    setMagicLink(null);
    setSession(null);
    demoReady.current = ensureDemoUser();
    await demoReady.current;
    navigate('/login', { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({
      session,
      authNotice,
      setAuthNotice,
      magicLink,
      setMagicLink,
      refreshSession,
      hasStoredToken,
      login,
      register,
      googleSignIn,
      sendMagicLink,
      consumeMagicLink,
      logout,
      resetAuthStore,
    }),
    [session, authNotice, magicLink, refreshSession, login, register, googleSignIn, sendMagicLink, consumeMagicLink, logout, resetAuthStore],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
