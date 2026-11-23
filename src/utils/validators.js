// Pure validation helpers. Every user-facing message required by the spec lives here
// so UI, audit log and tests all agree on the exact wording.

export const MESSAGES = {
  registerInvalid: 'Invalid Email-ID or Weak Password!',
  registerSuccess: 'Registration Successful! Verification email sent.',
  loginInvalid: 'Invalid Email or Password!',
  intervalInvalid: 'Invalid Interval! Days must be positive ascending integers.',
  workflowSaved: 'Escalation workflow updated successfully.',
  moneyNegative: 'Invalid monetary value! Gross income cannot be negative.',
  moneyMalformed: 'Invalid monetary value! Enter a valid amount, e.g. 69,700 or 1250.50.',
  statusInvalid: 'Invalid status selection!',
  bankOk: 'Bank Connected Successfully. 12 transactions synced.',
  bankFail: 'Open Banking Authorization Failed. Please reconnect bank.',
};

// Local part: common mailbox characters. Domain: dot-separated labels that must
// start/end with an alphanumeric, plus an alphabetic TLD of 2+ chars.
// Rejects "shreyas@.com", "a@b..com", "a@b", "@x.com", "a b@x.com".
const EMAIL_RE =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

export function isValidEmail(value) {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  return v.length > 0 && v.length <= 254 && !v.includes('..') && EMAIL_RE.test(v);
}

// Strong enough for the demo: 8+ chars containing at least one letter AND one digit.
export function isStrongPassword(value) {
  return (
    typeof value === 'string' && value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value)
  );
}

export function validateRegistration({ name, email, password }) {
  if (!name || !name.trim()) return { ok: false, field: 'name', error: 'Full Name is required.' };
  if (!isValidEmail(email) || !isStrongPassword(password)) {
    return { ok: false, field: 'credentials', error: MESSAGES.registerInvalid };
  }
  return { ok: true };
}

/**
 * Parses a user-typed monetary string such as "69,700", "$1,250.50", "-$500", "₹20,00,000".
 * Returns { ok:true, value } or { ok:false, error }.
 */
export function parseGrossIncome(raw) {
  const text = typeof raw === 'number' ? String(raw) : typeof raw === 'string' ? raw : '';
  const cleaned = text.replace(/[$£₹,\s]/g, '');
  if (cleaned === '') return { ok: false, error: MESSAGES.moneyMalformed };
  if (!/^[+-]?\d+(\.\d{1,2})?$/.test(cleaned)) return { ok: false, error: MESSAGES.moneyMalformed };
  const value = Number(cleaned);
  if (value < 0) return { ok: false, error: MESSAGES.moneyNegative };
  if (value > 1e12) return { ok: false, error: MESSAGES.moneyMalformed };
  return { ok: true, value: value === 0 ? 0 : value };
}

/** Intervals must be positive integers in strictly ascending order. */
export function validateIntervals(rawValues) {
  if (!Array.isArray(rawValues) || rawValues.length !== 3) {
    return { ok: false, error: MESSAGES.intervalInvalid };
  }
  const nums = [];
  for (const raw of rawValues) {
    const text = String(raw ?? '').trim();
    if (!/^\d+$/.test(text)) return { ok: false, error: MESSAGES.intervalInvalid };
    const n = Number(text);
    if (!Number.isSafeInteger(n) || n <= 0 || n > 3650) {
      return { ok: false, error: MESSAGES.intervalInvalid };
    }
    nums.push(n);
  }
  for (let i = 1; i < nums.length; i += 1) {
    if (nums[i] <= nums[i - 1]) return { ok: false, error: MESSAGES.intervalInvalid };
  }
  return { ok: true, value: nums };
}
