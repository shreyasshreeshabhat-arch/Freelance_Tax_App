// Real-time quarterly tax & jurisdiction engine (FR7). Pure functions only.
//
//   N      = max(0, Gross Business Income − Deductible Expenses)
//   T_q    = (N × r_eff) / 4
//   P_thr  = (Gross Business Income / L_threshold) × 100

import { TAGS } from './classifier';
import { formatMoney, formatPercent } from './format';

export const THRESHOLD_ALERT_PCT = 80;

export const JURISDICTIONS = {
  US: {
    key: 'US',
    label: 'US Federal + Local',
    short: 'US',
    flag: '🇺🇸',
    rate: 0.25,
    threshold: 85000,
    currency: 'USD',
    locale: 'en-US',
    taxName: 'Federal + local income tax',
    thresholdName: 'regional VAT/Sales threshold',
  },
  UK: {
    key: 'UK',
    label: 'UK Self-Assessment + VAT',
    short: 'UK',
    flag: '🇬🇧',
    rate: 0.2,
    threshold: 90000,
    currency: 'GBP',
    locale: 'en-GB',
    taxName: 'Self-Assessment income tax',
    thresholdName: 'VAT registration threshold',
  },
  IN: {
    key: 'IN',
    label: 'India Freelance / GST',
    short: 'IN',
    flag: '🇮🇳',
    rate: 0.15,
    threshold: 2000000,
    currency: 'INR',
    locale: 'en-IN',
    taxName: 'Presumptive income tax',
    thresholdName: 'GST registration threshold',
  },
};

export const DEFAULT_JURISDICTION = 'US';

export function getJurisdiction(key) {
  return JURISDICTIONS[key] ?? JURISDICTIONS[DEFAULT_JURISDICTION];
}

const toCents = (n) => Math.round(n * 100) / 100;

/**
 * Sums the ledger. Amount signs are ignored (|amount|) so reclassifying any
 * row into Business Income / Deductible Expense always moves the KPIs.
 */
export function computeTotals(transactions) {
  let gross = 0;
  let deductions = 0;
  const counts = {
    [TAGS.BUSINESS_INCOME]: 0,
    [TAGS.NON_BUSINESS]: 0,
    [TAGS.DEDUCTIBLE]: 0,
    [TAGS.UNCATEGORIZED]: 0,
  };
  for (const t of transactions ?? []) {
    const amount = Math.abs(Number(t?.amount));
    if (t?.tag in counts) counts[t.tag] += 1;
    if (!Number.isFinite(amount)) continue;
    if (t.tag === TAGS.BUSINESS_INCOME) gross += amount;
    else if (t.tag === TAGS.DEDUCTIBLE) deductions += amount;
  }
  return { gross: toCents(gross), deductions: toCents(deductions), counts };
}

export function computeTax({ gross, deductions, jurisdictionKey }) {
  const j = getJurisdiction(jurisdictionKey);
  const g = Math.max(0, Number(gross) || 0);
  const d = Math.max(0, Number(deductions) || 0);
  const net = Math.max(0, g - d);
  const quarterlyTax = (net * j.rate) / 4;
  const thresholdPct = (g / j.threshold) * 100;
  return {
    jurisdiction: j,
    gross: g,
    deductions: d,
    net,
    quarterlyTax,
    annualTax: net * j.rate,
    thresholdPct,
    remaining: Math.max(0, j.threshold - g),
    alertActive: thresholdPct >= THRESHOLD_ALERT_PCT,
    exceeded: thresholdPct >= 100,
  };
}

/** e.g. "Local Tax Threshold Alert — You have reached 82.0% ($69,700 / $85,000) of your regional VAT/Sales threshold." */
export function thresholdAlertText(tax) {
  const j = tax.jurisdiction;
  return `Local Tax Threshold Alert — You have reached ${formatPercent(tax.thresholdPct)} (${formatMoney(tax.gross, j)} / ${formatMoney(j.threshold, j)}) of your regional VAT/Sales threshold.`;
}

/** Wraps computeTax and reports how long the recalculation took (ms). */
export function computeTaxTimed(args) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const result = computeTax(args);
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return { ...result, calcMs: t1 - t0 };
}
