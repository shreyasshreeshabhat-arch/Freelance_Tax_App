// Overdue-invoice aging & escalation engine (FR5, FR6, FR9). Pure functions only.

import { isValidEmail } from './validators';

export const STATUS = { UNPAID: 'Unpaid', PAID: 'Paid', CASH: 'Paid via Cash' };
export const STATUS_OPTIONS = [STATUS.PAID, STATUS.CASH, STATUS.UNPAID];

export const TONES = ['Polite', 'Gentle Nudge', 'Firm Warning'];
const TONE_TITLE = {
  Polite: 'Polite Reminder',
  'Gentle Nudge': 'Gentle Nudge',
  'Firm Warning': 'Firm Warning',
};

export const DEFAULT_WORKFLOW = {
  intervals: [3, 7, 14],
  tones: ['Polite', 'Gentle Nudge', 'Firm Warning'],
};

export const isPaid = (invoice) => invoice.status === STATUS.PAID || invoice.status === STATUS.CASH;

const MS_PER_DAY = 86400000;

// Whole-calendar-day index using the *local* date, immune to DST and time-of-day.
function dayIndex(input) {
  if (typeof input === 'string') {
    const [y, m, d] = input.slice(0, 10).split('-').map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
  }
  return Math.floor(Date.UTC(input.getFullYear(), input.getMonth(), input.getDate()) / MS_PER_DAY);
}

/** CurrentDate − DueDate in whole days. Negative means "not yet due". */
export function daysOverdue(dueDate, today = new Date()) {
  return dayIndex(today) - dayIndex(dueDate);
}

export function agingBucket(days) {
  if (days <= 0) return { key: 'current', label: 'Not due', tone: 'slate' };
  if (days < 30) return { key: '1-29', label: `${days}d overdue`, tone: 'amber' };
  if (days < 60) return { key: '30', label: '30+ days', tone: 'orange' };
  if (days < 90) return { key: '60', label: '60+ days', tone: 'red' };
  return { key: '90', label: '90+ days', tone: 'rose' };
}

export const AGING_BUCKETS = [
  { key: 'current', label: 'Not due yet' },
  { key: '1-29', label: '1–29 days' },
  { key: '30', label: '30–59 days' },
  { key: '60', label: '60–89 days' },
  { key: '90', label: '90+ days' },
];

/** Stage 0 = below first interval; otherwise the highest interval reached (1..3). */
export function stageFor(days, workflow = DEFAULT_WORKFLOW) {
  let stage = 0;
  workflow.intervals.forEach((interval, i) => {
    if (days >= interval) stage = i + 1;
  });
  return stage;
}

export function stageLabel(stage, workflow = DEFAULT_WORKFLOW) {
  if (stage <= 0) return 'No reminder yet';
  const tone = workflow.tones[stage - 1] ?? TONES[0];
  return `Stage ${stage}: ${TONE_TITLE[tone] ?? tone}`;
}

export function evaluateInvoice(invoice, workflow, today = new Date()) {
  const days = daysOverdue(invoice.due, today);
  const stage = isPaid(invoice) ? 0 : stageFor(days, workflow);
  return {
    ...invoice,
    daysOverdue: days,
    bucket: agingBucket(days),
    stage,
    stageText: isPaid(invoice) ? 'Reminders halted' : stageLabel(stage, workflow),
    tone: stage > 0 ? workflow.tones[stage - 1] : null,
    emailValid: isValidEmail(invoice.email),
    paid: isPaid(invoice),
  };
}

export function describeDays(days) {
  if (days > 0) return `${days} day${days === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  return `${days} days (not due)`;
}

/**
 * Decides what the dispatcher should do with one evaluated invoice.
 * Returns { action: 'send' | 'skip', reason, level }
 */
export function planReminder(inv, { force = false } = {}) {
  if (inv.paid) {
    return { action: 'skip', level: 'info', reason: `already ${inv.status.toLowerCase()} — reminders halted` };
  }
  if (!inv.emailValid) {
    const notDue = inv.daysOverdue <= 0 ? ' (also not yet due)' : '';
    return {
      action: 'skip',
      level: 'error',
      reason: `invalid recipient email "${inv.email}"${notDue} — skipped`,
    };
  }
  if (inv.daysOverdue <= 0) {
    return {
      action: 'skip',
      level: 'info',
      reason:
        inv.daysOverdue === 0
          ? 'due today — not overdue yet'
          : `not due for ${Math.abs(inv.daysOverdue)} more day(s) — skipped`,
    };
  }
  if (inv.stage === 0 && !force) {
    return { action: 'skip', level: 'info', reason: 'below first escalation interval — no reminder due' };
  }
  if (!force && inv.stage <= (inv.lastStageSent ?? 0)) {
    return {
      action: 'skip',
      level: 'info',
      reason: `Stage ${inv.stage} reminder already sent — nothing new to dispatch`,
    };
  }
  return { action: 'send', level: 'success', reason: '', stage: Math.max(1, inv.stage) };
}

/** Builds the simulated outbound email for a given tone/stage. */
export function buildEmail(inv, { tone, stage, senderName, senderEmail, currencyText }) {
  const amount = currencyText;
  const dueTxt = `${inv.due}`;
  const overdue = `${inv.daysOverdue} day${inv.daysOverdue === 1 ? '' : 's'}`;
  const sign = `${senderName}\n${senderEmail}`;
  const templates = {
    Polite: {
      subject: `Friendly reminder: Invoice ${inv.id} (${amount})`,
      body: `Hi there,\n\nI hope you're doing well! This is a quick note that invoice ${inv.id} for ${amount} (due ${dueTxt}) is now ${overdue} past due. If it has already been paid, please ignore this message.\n\nThank you for your business!\n\n${sign}`,
    },
    'Gentle Nudge': {
      subject: `Following up: Invoice ${inv.id} is ${overdue} overdue`,
      body: `Hello,\n\nFollowing up on my earlier note — invoice ${inv.id} for ${amount} is now ${overdue} overdue. Could you let me know when I can expect payment, or if there is anything blocking it?\n\nThanks in advance,\n\n${sign}`,
    },
    'Firm Warning': {
      subject: `FINAL NOTICE: Invoice ${inv.id} — ${amount} is ${overdue} overdue`,
      body: `Hello,\n\nInvoice ${inv.id} for ${amount} is now ${overdue} past its ${dueTxt} due date and remains unpaid. Please remit payment within 5 business days to avoid late fees and suspension of services.\n\nIf you believe this is an error, reply to this email immediately.\n\n${sign}`,
    },
  };
  const t = templates[tone] ?? templates.Polite;
  return { to: inv.email, subject: t.subject, body: t.body, tone, stage };
}

export function sumReceivables(evaluated) {
  let outstanding = 0;
  let overdue = 0;
  for (const inv of evaluated) {
    if (inv.paid) continue;
    outstanding += inv.amount;
    if (inv.daysOverdue > 0) overdue += inv.amount;
  }
  return { outstanding, overdue };
}
