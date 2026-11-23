// Simulated identity provider: user store, password hashing, mock session tokens.
// Nothing here is real security — it only mimics backend behaviour for the demo.

import { KEYS, readJSON, writeJSON, readRaw, writeRaw, removeKey } from './storage';
import { DEMO_USER } from '../data/mockData';

export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
export const MAGIC_LINK_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ---------- hashing ----------
function fallbackHash(text) {
  // FNV-1a (non-crypto) — only used when SubtleCrypto is unavailable (e.g. http://).
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `fnv-${h.toString(16)}`;
}

function hex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPassword(password, salt) {
  const text = `${salt}:${password}`;
  try {
    if (globalThis.crypto?.subtle) {
      const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return `sha256-${hex(digest)}`;
    }
  } catch {
    /* fall through */
  }
  return fallbackHash(text);
}

function randomHex(bytes = 8) {
  const arr = new Uint8Array(bytes);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(arr);
  else for (let i = 0; i < bytes; i += 1) arr[i] = Math.floor(Math.random() * 256);
  return hex(arr);
}

// ---------- user store ----------
export const loadUsers = () => {
  const users = readJSON(KEYS.users, []);
  return Array.isArray(users) ? users : [];
};
const saveUsers = (users) => writeJSON(KEYS.users, users);

export const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();

export function findUser(email) {
  const e = normalizeEmail(email);
  return loadUsers().find((u) => u.email === e) ?? null;
}

export async function createUser({ name, email, password, provider = 'password' }) {
  const salt = randomHex();
  const user = {
    id: `usr_${randomHex(6)}`,
    name: name.trim(),
    email: normalizeEmail(email),
    salt,
    passwordHash: password ? await hashPassword(password, salt) : null,
    provider,
    verified: provider !== 'password',
    createdAt: new Date().toISOString(),
  };
  saveUsers([...loadUsers(), user]);
  return user;
}

export async function ensureDemoUser() {
  if (!findUser(DEMO_USER.email)) {
    await createUser({ name: DEMO_USER.name, email: DEMO_USER.email, password: DEMO_USER.password });
    const users = loadUsers().map((u) => (u.email === DEMO_USER.email ? { ...u, verified: true } : u));
    saveUsers(users);
  }
}

export async function verifyCredentials(email, password) {
  const user = findUser(email);
  if (!user || !user.passwordHash || typeof password !== 'string') return null;
  const hash = await hashPassword(password, user.salt);
  return hash === user.passwordHash ? user : null;
}

export function resetUsers() {
  removeKey(KEYS.users);
}

// ---------- session tokens (mock JWT) ----------
const b64 = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
const unb64 = (str) => JSON.parse(decodeURIComponent(escape(atob(str))));

function mockSignature(payload) {
  return fallbackHash(`ftx-demo-secret:${payload}`).replace('fnv-', '');
}

export function issueSession(user, method = 'password') {
  const header = b64({ alg: 'MOCK256', typ: 'JWT' });
  const now = Date.now();
  const payload = b64({
    sub: user.id,
    email: user.email,
    name: user.name,
    method,
    iat: now,
    exp: now + SESSION_TTL_MS,
  });
  const token = `${header}.${payload}.${mockSignature(`${header}.${payload}`)}`;
  writeRaw(KEYS.session, token);
  return token;
}

/** Returns the decoded session or null when missing / tampered / expired / unknown user. */
export function readSession() {
  const token = readRaw(KEYS.session);
  if (!token) return null;
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || signature !== mockSignature(`${header}.${payload}`)) return null;
    const claims = unb64(payload);
    if (!claims.exp || claims.exp < Date.now()) return null;
    if (!findUser(claims.email)) return null;
    return { token, ...claims };
  } catch {
    return null;
  }
}

export function hasStoredToken() {
  return Boolean(readRaw(KEYS.session));
}

export function revokeSession() {
  removeKey(KEYS.session);
}

export function maskToken(token) {
  const t = String(token ?? '');
  return t.length <= 12 ? t : `${t.slice(0, 14)}…${t.slice(-6)}`;
}

// ---------- passwordless magic link ----------
export function createMagicLink(email) {
  const link = {
    email: normalizeEmail(email),
    token: `ml_${randomHex(12)}`,
    expires: Date.now() + MAGIC_LINK_TTL_MS,
  };
  writeJSON(KEYS.magic, link);
  return link;
}

export function readMagicLink() {
  const link = readJSON(KEYS.magic, null);
  return link && link.expires > Date.now() ? link : null;
}

export function consumeMagicLink(token) {
  const link = readMagicLink();
  if (!link || link.token !== token) return null;
  removeKey(KEYS.magic);
  return findUser(link.email);
}
