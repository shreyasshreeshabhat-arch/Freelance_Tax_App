import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Minimal hash router — keeps the app a pure static bundle (no server rewrites needed).

const RouterContext = createContext(null);
export const useRouter = () => useContext(RouterContext);

export const PUBLIC_ROUTES = ['/login', '/register'];
export const PROTECTED_ROUTES = ['/dashboard', '/transactions', '/invoices', '/workflow'];

const readPath = () => {
  const raw = window.location.hash.replace(/^#/, '').split('?')[0] || '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
};

export function RouterProvider({ children }) {
  const [path, setPath] = useState(readPath);

  useEffect(() => {
    const onHash = () => setPath(readPath());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((to, { replace = false } = {}) => {
    if (replace) {
      window.history.replaceState(null, '', `#${to}`);
      setPath(to);
    } else if (readPath() === to) {
      setPath(to);
    } else {
      window.location.hash = to; // fires hashchange → setPath
    }
  }, []);

  const value = useMemo(() => ({ path, navigate }), [path, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}
