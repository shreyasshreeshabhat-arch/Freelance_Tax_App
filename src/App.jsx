import { useEffect, useRef } from 'react';
import { PROTECTED_ROUTES, PUBLIC_ROUTES, useRouter } from './context/RouterContext';
import { useAuth } from './context/AuthContext';
import { useSystem } from './context/SystemContext';
import AppShell from './components/AppShell';
import AuditLogPanel from './components/AuditLogPanel';
import ToastStack from './components/ToastStack';
import ConfirmResetModal from './components/modals/ConfirmResetModal';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import InvoicesPage from './pages/InvoicesPage';
import WorkflowPage from './pages/WorkflowPage';

const PAGES = {
  '/dashboard': DashboardPage,
  '/transactions': TransactionsPage,
  '/invoices': InvoicesPage,
  '/workflow': WorkflowPage,
};

export default function App() {
  const { path, navigate } = useRouter();
  const { session, hasStoredToken, setAuthNotice } = useAuth();
  const { log } = useSystem();
  const wasSignedIn = useRef(Boolean(session));
  const lastBlock = useRef({ key: '', at: 0 });

  const isProtected = PROTECTED_ROUTES.includes(path);
  const isPublic = PUBLIC_ROUTES.includes(path);

  // Route protection: every protected view requires a valid, unexpired session token.
  useEffect(() => {
    if (session) {
      wasSignedIn.current = true;
      if (!isProtected) navigate('/dashboard', { replace: true });
      return;
    }
    const hadSession = wasSignedIn.current;
    wasSignedIn.current = false;

    if (isProtected) {
      const reason = hadSession
        ? 'session token was removed or expired'
        : hasStoredToken()
          ? 'stored session token is invalid or expired'
          : 'no session token present';
      const now = Date.now();
      // De-dupe (React StrictMode runs effects twice in development).
      if (lastBlock.current.key !== `${path}|${reason}` || now - lastBlock.current.at > 1000) {
        log('SECURITY', `401 Unauthorized: blocked access to #${path} — ${reason}. Redirecting to login.`, 'error');
      }
      lastBlock.current = { key: `${path}|${reason}`, at: now };
      setAuthNotice({ kind: 'error', text: '401 Unauthorized — please sign in to continue.' });
      navigate('/login', { replace: true });
    } else if (!isPublic) {
      navigate('/login', { replace: true });
    }
  }, [session, path, isProtected, isPublic, navigate, log, hasStoredToken, setAuthNotice]);

  let content = null;
  if (session && isProtected) {
    const Page = PAGES[path];
    content = (
      <AppShell>
        <Page />
      </AppShell>
    );
  } else if (!session && path === '/register') {
    content = <RegisterPage />;
  } else if (!session && path === '/login') {
    content = <LoginPage />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">{content}</div>
      <AuditLogPanel />
      <ToastStack />
      <ConfirmResetModal />
    </div>
  );
}
