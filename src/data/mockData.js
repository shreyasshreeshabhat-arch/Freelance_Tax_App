// Seed & simulation data. Everything the "backend" would normally own lives here.
//
// Baseline ledger totals (US):
//   Gross Business Income = $69,700   Deductible Expenses = $11,200
//   → Net $58,500, quarterly tax $3,656.25, threshold progress 82.0 %

import { TAGS } from '../utils/classifier';
import { DEFAULT_WORKFLOW, STATUS } from '../utils/invoiceEngine';
import { DEFAULT_JURISDICTION } from '../utils/taxEngine';
import { isoDate } from '../utils/format';

export const DEMO_USER = {
  name: 'Shreyas (Demo)',
  email: 'shreyas@freelance.io',
  password: 'TaxSafe2026!',
};

export const GOOGLE_ACCOUNT = { name: 'Alex Morgan', email: 'alex.morgan@gmail.com' };

export const VALID_BANK_TOKEN = 'access-sandbox-valid-901';
export const EXPIRED_BANK_TOKEN = 'expired-token-000';

export const BANK_PROVIDERS = [
  { id: 'Plaid', blurb: 'US & Canada · 12,000+ institutions' },
  { id: 'Teller', blurb: 'US · direct bank APIs' },
  { id: 'Salt Edge', blurb: 'UK, EU & India · PSD2 / AA' },
];

export const BANK_SCENARIOS = [
  {
    token: VALID_BANK_TOKEN,
    label: 'Valid Token',
    detail: 'Syncs 12 encrypted transactions',
  },
  {
    token: EXPIRED_BANK_TOKEN,
    label: 'Expired Token',
    detail: 'Fails gracefully with a reconnect prompt',
  },
];

const tx = (seq, daysAgo, description, amount, tag, extra = {}) => ({
  id: `seed-${String(seq).padStart(2, '0')}`,
  seq,
  date: isoDate(new Date(), -daysAgo),
  description,
  amount,
  tag,
  method: 'rule',
  confidence: 0.97,
  reviewRequired: tag === TAGS.UNCATEGORIZED,
  source: 'import',
  ...extra,
});

/** 8 business-income rows = $69,700 · 8 deductible rows = $11,200 (verified in the build check). */
export function seedTransactions() {
  const B = TAGS.BUSINESS_INCOME;
  const D = TAGS.DEDUCTIBLE;
  const N = TAGS.NON_BUSINESS;
  return [
    tx(1, 2, 'Stripe Payout - Acme Corp', 2500, B),
    tx(2, 3, 'AWS Cloud Services', -45, D),
    tx(3, 4, 'Laptop Stand', -82, N, { method: 'rule', confidence: 0.9 }),
    tx(4, 6, 'Wire - Umbrella Corp Audit', 10000, B),
    tx(5, 8, 'Business Insurance Premium', -1800, D),
    tx(6, 9, 'Stripe Payout - Hooli Workshop', 11300, B),
    tx(7, 11, 'Savings Interest', 14.32, N, { confidence: 0.96 }),
    tx(8, 13, 'Adobe Creative Cloud', -660, D),
    tx(9, 15, 'ACH Verve Media - Brand Retainer', 7400, B),
    tx(10, 17, 'ACH TRANSFER 88213', 350, TAGS.UNCATEGORIZED, { method: 'ai', confidence: 0.2 }),
    tx(11, 19, 'Coworking Space - Monthly', -2400, D),
    tx(12, 22, 'Stripe Payout - Initech', 9800, B),
    tx(13, 25, 'Internet & Phone Bill', -1200, D),
    tx(14, 28, 'PayPal - Design Sprint Invoice', 6200, B),
    tx(15, 31, 'Accountant - Bookkeeping Fees', -900, D),
    tx(16, 35, 'Wire - Globex Consulting Retainer', 14500, B),
    tx(17, 40, 'MacBook Pro 14" (Equipment)', -2995, D),
    tx(18, 44, 'Stripe Payout - Northstar Retainer', 8000, B),
    tx(19, 48, 'Whole Foods Grocery', -86.4, N),
    tx(20, 52, 'Venmo - Friend Repayment', 60, N),
    tx(21, 55, 'Conference Pass - DevSummit', -1200, D),
  ];
}

/** 12 "encrypted" transactions returned by the (simulated) open-banking feed. */
export function bankFeedTransactions(provider) {
  const rows = [
    ['Stripe Payout - Bright Labs', 1000],
    ['PayPal - Logo Refresh Project', 450],
    ['Upwork Escrow Release', 275],
    ['Notion Team Plan', -96],
    ['Figma Professional', -144],
    ['Zoom Pro', -16.99],
    ['GitHub Team', -21],
    ['Canva Pro Annual', -120],
    ['Netflix Subscription', -15.99],
    ['Whole Foods Grocery Run', -64.2],
    ['Venmo - Weekend Trip Split', 60],
    ['ACH TRANSFER 55102', 250],
  ];
  return rows.map(([description, amount], i) => ({
    id: `bank-${String(i + 1).padStart(2, '0')}`,
    date: isoDate(new Date(), -(i % 6)),
    description,
    amount,
    source: `bank:${provider}`,
  }));
}

/** Rotating pool for the "Sync New Transactions" simulation button. */
export const INCOMING_POOL = [
  { description: 'Stripe Payout - Bright Labs', amount: 1200 },
  { description: 'GitHub Copilot Subscription', amount: -19 },
  { description: 'Spotify Premium', amount: -11.99 },
  { description: 'Venmo - Dinner Split', amount: 34.5 },
  { description: 'Figma Professional', amount: -15 },
  { description: 'Wire - Globex Consulting Milestone', amount: 800 },
  { description: 'POS PURCHASE 4471', amount: -23.1 },
  { description: 'Domain Renewal - Namecheap', amount: -14.98 },
  { description: 'Studio Design Project Deposit', amount: 600 },
];

export function seedInvoices() {
  const now = new Date();
  const mk = (id, client, email, amount, dueOffset) => ({
    id,
    client,
    email,
    amount,
    issued: isoDate(now, dueOffset - 30),
    due: isoDate(now, dueOffset),
    status: STATUS.UNPAID,
    lastStageSent: 0,
    remindersSent: 0,
    lastReminderAt: null,
  });
  return [
    mk('INV-104', 'Northstar Analytics', 'client@northstar.io', 3200, -18),
    mk('INV-109', 'Verve Media', 'ap@verve.com', 1650, -5),
    mk('INV-110', 'Unknown Client', 'invalid-email', 500, 2),
  ];
}

export function seedData() {
  return {
    v: 1,
    transactions: seedTransactions(),
    invoices: seedInvoices(),
    workflow: { ...DEFAULT_WORKFLOW, intervals: [...DEFAULT_WORKFLOW.intervals], tones: [...DEFAULT_WORKFLOW.tones] },
    jurisdiction: DEFAULT_JURISDICTION,
    manualGross: null,
    bank: { connected: false, provider: null, lastSync: null, tokenMasked: null },
    simCursor: 0,
    seq: 1000,
  };
}
