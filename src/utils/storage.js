// Defensive localStorage wrapper: private-mode / quota / corrupt-JSON safe.

export const KEYS = {
  users: 'ftx_users',
  session: 'ftx_session',
  data: 'ftx_data',
  audit: 'ftx_audit_log',
  notifications: 'ftx_notifications',
  ui: 'ftx_ui',
  magic: 'ftx_magic_link',
};

export function readJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readRaw(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeRaw(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function clearAppStorage() {
  Object.values(KEYS).forEach(removeKey);
}
