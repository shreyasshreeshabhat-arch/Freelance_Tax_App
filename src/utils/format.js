// Formatting helpers (currency per jurisdiction, dates, percentages).

const formatters = new Map();

function numberFormat(locale, currency) {
  const key = `${locale}|${currency}`;
  if (!formatters.has(key)) {
    formatters.set(
      key,
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
    );
  }
  return formatters.get(key);
}

/** Formats a number in a jurisdiction's currency & grouping (e.g. ₹20,00,000). */
export function formatMoney(value, jurisdiction) {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  const nf = numberFormat(jurisdiction.locale, jurisdiction.currency);
  const out = nf.format(safe);
  // Always show cents when there is a fractional part, e.g. $3,656.25 (not $3,656.3).
  if (Math.round(safe * 100) % 100 !== 0 && /\.\d$/.test(out)) return `${out}0`;
  return out;
}

export function formatPercent(value, digits = 1) {
  const n = Number(value);
  return `${(Number.isFinite(n) ? n : 0).toFixed(digits)}%`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '—';
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(isoTimestamp) {
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return '--:--:--';
  return d.toLocaleTimeString('en-GB', { hour12: false });
}

export function formatDateTime(isoTimestamp) {
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} ${formatTime(isoTimestamp)}`;
}

/** Local calendar date as yyyy-mm-dd, offset by `days` from `base`. */
export function isoDate(base = new Date(), days = 0) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
