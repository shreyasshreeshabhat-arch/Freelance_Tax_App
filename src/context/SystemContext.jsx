import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { usePersistedStore } from '../hooks/usePersistedStore';
import { KEYS } from '../utils/storage';

// Audit log (FR-wide), toasts and the notification bell (FR8).

const SystemContext = createContext(null);
export const useSystem = () => useContext(SystemContext);

const MAX_LOG = 300;
const MAX_NOTIFICATIONS = 60;

let uid = 0;
const nextId = (p) => `${p}_${Date.now().toString(36)}_${(uid += 1)}`;

export function SystemProvider({ children }) {
  const [auditLog, updateLog] = usePersistedStore(KEYS.audit, () => [], (v) => (Array.isArray(v) ? v : []));
  const [notifications, updateNotifs, getNotifs] = usePersistedStore(
    KEYS.notifications,
    () => [],
    (v) => (Array.isArray(v) ? v : []),
  );
  const [toasts, setToasts] = useState([]);
  const toastTimers = useRef(new Map());

  /** type: AUTH | OAUTH | SYNC | AUTO-TAG | EMAIL | VALIDATION | SECURITY | TAX | INVOICE | EXPORT | SYSTEM */
  const log = useCallback(
    (type, message, level = 'info') => {
      const entry = { id: nextId('log'), ts: new Date().toISOString(), type, level, message };
      updateLog((prev) => [entry, ...prev].slice(0, MAX_LOG));
      return entry;
    },
    [updateLog],
  );

  const clearLog = useCallback(() => updateLog([]), [updateLog]);

  const dismissToast = useCallback((id) => {
    clearTimeout(toastTimers.current.get(id));
    toastTimers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (kind, title, message = '') => {
      const id = nextId('toast');
      setToasts((prev) => [...prev.slice(-3), { id, kind, title, message }]);
      toastTimers.current.set(
        id,
        setTimeout(() => dismissToast(id), kind === 'error' ? 6500 : 4500),
      );
      return id;
    },
    [dismissToast],
  );

  /** Adds a bell notification (deduped by `key`) and optionally mirrors it as a toast. */
  const notify = useCallback(
    ({ key, kind = 'info', title, message, toast = true }) => {
      if (key && getNotifs().some((n) => n.key === key)) return false;
      const entry = { id: nextId('ntf'), key: key ?? null, kind, title, message, ts: new Date().toISOString(), read: false };
      updateNotifs((prev) => [entry, ...prev].slice(0, MAX_NOTIFICATIONS));
      if (toast) pushToast(kind, title, message);
      return true;
    },
    [getNotifs, updateNotifs, pushToast],
  );

  const markAllRead = useCallback(
    () => updateNotifs((prev) => prev.map((n) => ({ ...n, read: true }))),
    [updateNotifs],
  );
  const clearNotifications = useCallback(() => updateNotifs([]), [updateNotifs]);

  const resetSystem = useCallback(() => {
    updateLog([]);
    updateNotifs([]);
    setToasts([]);
  }, [updateLog, updateNotifs]);

  const value = useMemo(
    () => ({
      auditLog,
      log,
      clearLog,
      toasts,
      pushToast,
      dismissToast,
      notifications,
      notify,
      markAllRead,
      clearNotifications,
      resetSystem,
    }),
    [auditLog, log, clearLog, toasts, pushToast, dismissToast, notifications, notify, markAllRead, clearNotifications, resetSystem],
  );

  return <SystemContext.Provider value={value}>{children}</SystemContext.Provider>;
}
