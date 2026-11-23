import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSystem } from './SystemContext';
import { useAuth } from './AuthContext';
import { usePersistedStore } from '../hooks/usePersistedStore';
import { KEYS } from '../utils/storage';
import {
  BANK_PROVIDERS,
  EXPIRED_BANK_TOKEN,
  INCOMING_POOL,
  VALID_BANK_TOKEN,
  bankFeedTransactions,
  seedData,
} from '../data/mockData';
import { ASSIGNABLE_TAGS, REVIEW_NOTE, TAGS, classifyTransaction } from '../utils/classifier';
import {
  JURISDICTIONS,
  computeTax,
  computeTaxTimed,
  computeTotals,
  thresholdAlertText,
} from '../utils/taxEngine';
import {
  STATUS,
  STATUS_OPTIONS,
  TONES,
  buildEmail,
  describeDays,
  evaluateInvoice,
  planReminder,
  stageLabel,
  sumReceivables,
} from '../utils/invoiceEngine';
import { MESSAGES, isValidEmail, parseGrossIncome, validateIntervals } from '../utils/validators';
import { formatMoney, formatPercent, isoDate } from '../utils/format';
import { buildTaxCsv, downloadTextFile, printReport } from '../utils/exporters';
import { maskToken } from '../utils/auth';

const DataContext = createContext(null);
export const useData = () => useContext(DataContext);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeData(stored, createDefault) {
  const base = createDefault();
  if (!stored || typeof stored !== 'object' || stored.v !== 1) return base;
  if (!Array.isArray(stored.transactions) || !Array.isArray(stored.invoices)) return base;
  const wf = stored.workflow;
  const workflowOk =
    wf && Array.isArray(wf.intervals) && wf.intervals.length === 3 && Array.isArray(wf.tones) && wf.tones.length === 3;
  return {
    ...base,
    ...stored,
    workflow: workflowOk ? wf : base.workflow,
    jurisdiction: JURISDICTIONS[stored.jurisdiction] ? stored.jurisdiction : base.jurisdiction,
    bank: { ...base.bank, ...(stored.bank ?? {}) },
  };
}

export function DataProvider({ children }) {
  const { log, notify, pushToast, resetSystem } = useSystem();
  const { session, resetAuthStore } = useAuth();
  const [data, update, getData] = usePersistedStore(KEYS.data, seedData, normalizeData);

  // Modal / overlay UI state shared across pages.
  const [ui, setUi] = useState({ bankOpen: false, addInvoiceOpen: false, resetOpen: false, emailPreview: null });
  const patchUi = useCallback((patch) => setUi((prev) => ({ ...prev, ...patch })), []);

  // Roll the "current date" over at midnight so aging badges stay correct.
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => {
      setToday((prev) => {
        const now = new Date();
        return now.toDateString() === prev.toDateString() ? prev : now;
      });
    }, 60000);
    return () => clearInterval(id);
  }, []);

  // ---------------- derived state ----------------
  const totals = useMemo(() => computeTotals(data.transactions), [data.transactions]);
  const effectiveGross = data.manualGross ?? totals.gross;
  const tax = useMemo(
    () => computeTaxTimed({ gross: effectiveGross, deductions: totals.deductions, jurisdictionKey: data.jurisdiction }),
    [effectiveGross, totals.deductions, data.jurisdiction],
  );
  const invoices = useMemo(
    () => data.invoices.map((inv) => evaluateInvoice(inv, data.workflow, today)),
    [data.invoices, data.workflow, today],
  );
  const receivables = useMemo(() => sumReceivables(invoices), [invoices]);
  const jurisdiction = tax.jurisdiction;
  const money = useCallback((value) => formatMoney(value, jurisdiction), [jurisdiction]);
  const moneyNow = useCallback((value) => formatMoney(value, JURISDICTIONS[getData().jurisdiction]), [getData]);

  const sortedTransactions = useMemo(
    () =>
      [...data.transactions].sort(
        (a, b) => String(b.date).localeCompare(String(a.date)) || (b.seq ?? 0) - (a.seq ?? 0),
      ),
    [data.transactions],
  );

  // ---------------- alert scanning (FR8) ----------------
  const scanAlerts = useCallback(() => {
    const d = getData();
    const t = computeTax({
      gross: d.manualGross ?? computeTotals(d.transactions).gross,
      deductions: computeTotals(d.transactions).deductions,
      jurisdictionKey: d.jurisdiction,
    });
    const j = t.jurisdiction;
    if (t.alertActive) {
      notify({ key: `login-threshold-${j.key}-${Math.floor(t.thresholdPct)}`, kind: 'warning', title: 'Threshold alert', message: thresholdAlertText(t) });
    }
    d.invoices
      .map((inv) => evaluateInvoice(inv, d.workflow, new Date()))
      .forEach((inv) => {
        if (inv.paid) return;
        if (inv.daysOverdue < 0 && inv.daysOverdue >= -3) {
          notify({
            key: `due-${inv.id}-${inv.due}`,
            kind: 'info',
            title: 'Invoice due soon',
            message: `${inv.id} (${formatMoney(inv.amount, j)}) is due in ${-inv.daysOverdue} day${inv.daysOverdue === -1 ? '' : 's'}.`,
          });
        } else if (inv.daysOverdue > 0 && inv.stage > (inv.lastStageSent ?? 0)) {
          notify({
            key: `overdue-${inv.id}-s${inv.stage}`,
            kind: 'warning',
            title: `${inv.id} is ${inv.daysOverdue} days overdue`,
            message: `${inv.stageText} is due — run the dispatcher or use "Send Now".`,
            toast: false,
          });
        }
      });
  }, [getData, notify]);

  const token = session?.token ?? null;
  useEffect(() => {
    if (token) scanAlerts();
  }, [token, scanAlerts]);

  // Threshold crossings while the user is working (reclassify, sync, jurisdiction, override…).
  const alertRef = useRef(null);
  useEffect(() => {
    if (!token) {
      alertRef.current = null;
      return;
    }
    const prev = alertRef.current;
    alertRef.current = { key: tax.jurisdiction.key, active: tax.alertActive };
    if (!prev || prev.key !== tax.jurisdiction.key || prev.active === tax.alertActive) return;
    if (tax.alertActive) {
      log('TAX', `Threshold alert raised: ${formatPercent(tax.thresholdPct)} of ${formatMoney(tax.jurisdiction.threshold, tax.jurisdiction)}.`, 'warn');
      notify({ key: `threshold-${Date.now()}`, kind: 'warning', title: 'Threshold alert', message: thresholdAlertText(tax) });
    } else {
      log('TAX', `Threshold alert cleared: ${formatPercent(tax.thresholdPct)} — Within Safe Limit.`, 'success');
      pushToast('success', 'Within Safe Limit', `Threshold progress is now ${formatPercent(tax.thresholdPct)}.`);
    }
  }, [token, tax, log, notify, pushToast]);

  // ---------------- jurisdiction & manual override (FR7) ----------------
  const setJurisdiction = useCallback(
    (key) => {
      if (!JURISDICTIONS[key] || key === getData().jurisdiction) return;
      const d = update((prev) => ({ ...prev, jurisdiction: key }));
      const t = computeTaxTimed({
        gross: d.manualGross ?? computeTotals(d.transactions).gross,
        deductions: computeTotals(d.transactions).deductions,
        jurisdictionKey: key,
      });
      log(
        'TAX',
        `Jurisdiction switched to ${t.jurisdiction.label}: net ${formatMoney(t.net, t.jurisdiction)}, quarterly tax ${formatMoney(t.quarterlyTax, t.jurisdiction)}, threshold ${formatPercent(t.thresholdPct)} — recalculated in ${t.calcMs.toFixed(3)} ms.`,
        'info',
      );
    },
    [getData, update, log],
  );

  const applyManualGross = useCallback(
    (raw) => {
      const parsed = parseGrossIncome(raw);
      if (!parsed.ok) {
        log('VALIDATION', `Manual gross income rejected ("${String(raw).slice(0, 30)}"): ${parsed.error}`, 'error');
        pushToast('error', 'Validation error', parsed.error);
        return parsed;
      }
      update((prev) => ({ ...prev, manualGross: parsed.value }));
      log('TAX', `Manual gross-income test value applied: ${moneyNow(parsed.value)} (overrides ledger gross).`, 'info');
      return parsed;
    },
    [log, pushToast, update, moneyNow],
  );

  const clearManualGross = useCallback(() => {
    update((prev) => ({ ...prev, manualGross: null }));
    log('TAX', 'Manual gross-income override cleared — using ledger totals.', 'info');
  }, [update, log]);

  // ---------------- ledger (FR4, FR9) ----------------
  const ingest = useCallback(
    (rawItems, source, extraPatch = {}) => {
      const cur = getData();
      let seq = cur.seq;
      const stamp = Date.now();
      const created = rawItems.map((raw, i) => {
        const c = classifyTransaction(raw);
        seq += 1;
        return {
          id: raw.id ?? `tx-${stamp}-${i}`,
          seq,
          date: raw.date ?? isoDate(new Date()),
          description: typeof raw.description === 'string' ? raw.description : '',
          amount: Number.isFinite(Number(raw.amount)) ? Number(raw.amount) : 0,
          tag: c.tag,
          method: c.method,
          confidence: c.confidence,
          reviewRequired: c.reviewRequired,
          reason: c.reason,
          source,
        };
      });
      update((prev) => ({ ...prev, ...extraPatch, seq, transactions: [...created, ...prev.transactions] }));
      return created;
    },
    [getData, update],
  );

  const logAutoTag = useCallback(
    (t) => {
      const label = t.description ? `"${t.description}"` : '"(empty description)"';
      const outcome = t.tag === TAGS.UNCATEGORIZED ? REVIEW_NOTE : t.tag;
      log(
        'AUTO-TAG',
        `${label} ${moneyNow(t.amount)} → ${outcome} [${t.method === 'ai' ? 'AI classifier' : 'rule engine'}, confidence ${Math.round(t.confidence * 100)}%]`,
        t.tag === TAGS.UNCATEGORIZED ? 'warn' : 'success',
      );
    },
    [log, moneyNow],
  );

  const syncNewTransactions = useCallback(() => {
    const cur = getData();
    const items = [0, 1, 2].map((i) => INCOMING_POOL[(cur.simCursor + i) % INCOMING_POOL.length]);
    log('SYNC', 'Feed poll: 3 new transactions received from simulated bank webhook.', 'info');
    const created = ingest(items, 'simulated', { simCursor: cur.simCursor + 3 });
    created.forEach(logAutoTag);
    const review = created.filter((t) => t.tag === TAGS.UNCATEGORIZED).length;
    pushToast(
      review ? 'warning' : 'success',
      '3 transactions synced & auto-tagged',
      review ? `${review} need manual review.` : 'All classified automatically.',
    );
  }, [getData, ingest, log, logAutoTag, pushToast]);

  const addEdgeCaseTransaction = useCallback(() => {
    log('SYNC', 'Feed poll: received malformed transaction (empty description, $0.00 amount).', 'warn');
    const [created] = ingest([{ description: '', amount: 0 }], 'simulated');
    logAutoTag(created);
    pushToast('warning', 'Edge case handled safely', `Flagged as "${REVIEW_NOTE}".`);
  }, [ingest, log, logAutoTag, pushToast]);

  const reclassify = useCallback(
    (id, tag) => {
      if (!ASSIGNABLE_TAGS.includes(tag)) {
        log('VALIDATION', `Reclassification rejected for ${id}: "${tag}" is not a valid tag.`, 'error');
        pushToast('error', 'Invalid tag', 'Choose Business Income, Non-Business Income or Deductible Expense.');
        return { ok: false };
      }
      const target = getData().transactions.find((t) => t.id === id);
      if (!target) return { ok: false };
      if (target.tag === tag) return { ok: true, unchanged: true };
      const d = update((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) =>
          t.id === id ? { ...t, tag, method: 'manual', confidence: 1, reviewRequired: false, reason: 'Manually reclassified' } : t,
        ),
      }));
      const nextTotals = computeTotals(d.transactions);
      const nextTax = computeTax({
        gross: d.manualGross ?? nextTotals.gross,
        deductions: nextTotals.deductions,
        jurisdictionKey: d.jurisdiction,
      });
      log(
        'TAX',
        `Manual reclassification: "${target.description || '(empty description)'}" ${target.tag} → ${tag}. KPIs recalculated — gross ${moneyNow(nextTax.gross)}, deductions ${moneyNow(nextTax.deductions)}, quarterly tax ${moneyNow(nextTax.quarterlyTax)}, threshold ${formatPercent(nextTax.thresholdPct)}.`,
        'success',
      );
      pushToast('success', 'Transaction reclassified', `Now tagged ${tag}. Tax KPIs updated.`);
      return { ok: true };
    },
    [getData, update, log, pushToast, moneyNow],
  );

  // ---------------- open banking (FR3) ----------------
  const connectBank = useCallback(
    async ({ provider, token: bankToken }) => {
      log('OAUTH', `${provider}: starting read-only OAuth 2.0 flow (scopes: accounts:read, transactions:read). Bank passwords are never requested.`, 'info');
      await wait(700);
      log('OAUTH', `${provider}: user redirected to the bank's hosted consent screen and approved read-only access.`, 'info');
      await wait(700);

      if (bankToken !== VALID_BANK_TOKEN) {
        const reason = bankToken === EXPIRED_BANK_TOKEN ? 'token expired' : 'token not recognised';
        log('OAUTH', `${provider}: token exchange failed for ${maskToken(bankToken)} — 401 ${reason}.`, 'error');
        pushToast('error', 'Bank connection failed', MESSAGES.bankFail);
        return { ok: false, message: MESSAGES.bankFail };
      }

      log('OAUTH', `${provider}: access token ${maskToken(bankToken)} accepted. Token stored encrypted (AES-256-GCM, simulated).`, 'success');
      const existing = new Set(getData().transactions.map((t) => t.id));
      const incoming = bankFeedTransactions(provider).filter((t) => !existing.has(t.id));
      const created = ingest(incoming, `bank:${provider}`);
      update((prev) => ({
        ...prev,
        bank: { connected: true, provider, lastSync: new Date().toISOString(), tokenMasked: maskToken(bankToken) },
      }));
      log(
        'SYNC',
        created.length
          ? `${provider}: ${created.length} transactions fetched, encrypted at rest (AES-256-GCM, simulated) and stored.`
          : `${provider}: 12 transactions fetched — all already present, 0 duplicates stored.`,
        'success',
      );
      if (created.length) {
        const counts = created.reduce((acc, t) => ({ ...acc, [t.tag]: (acc[t.tag] ?? 0) + 1 }), {});
        log('AUTO-TAG', `Auto-tagged ${created.length} bank transactions: ${Object.entries(counts).map(([k, v]) => `${v}× ${k}`).join(', ')}.`, 'success');
        created.filter((t) => t.tag === TAGS.UNCATEGORIZED).forEach(logAutoTag);
      }
      pushToast('success', 'Bank connected', MESSAGES.bankOk);
      return { ok: true, message: MESSAGES.bankOk };
    },
    [getData, ingest, log, logAutoTag, pushToast, update],
  );

  const disconnectBank = useCallback(() => {
    update((prev) => ({ ...prev, bank: { connected: false, provider: null, lastSync: null, tokenMasked: null } }));
    log('OAUTH', 'Bank connection revoked; stored access token deleted.', 'info');
    pushToast('info', 'Bank disconnected', 'Access token deleted.');
  }, [update, log, pushToast]);

  // ---------------- invoices (FR5, FR9) ----------------
  const senderInfo = useMemo(
    () => ({ senderName: session?.name ?? 'Your Freelancer', senderEmail: session?.email ?? 'you@freelance.io' }),
    [session],
  );

  const dispatchEmail = useCallback(
    (inv, stage) => {
      const j = JURISDICTIONS[getData().jurisdiction];
      const tone = getData().workflow.tones[stage - 1] ?? TONES[0];
      return buildEmail(inv, { tone, stage, ...senderInfo, currencyText: formatMoney(inv.amount, j) });
    },
    [getData, senderInfo],
  );

  const markSent = useCallback(
    (sentList) => {
      const at = new Date().toISOString();
      update((prev) => ({
        ...prev,
        invoices: prev.invoices.map((inv) => {
          const hit = sentList.find((s) => s.id === inv.id);
          return hit
            ? {
                ...inv,
                lastStageSent: Math.max(inv.lastStageSent ?? 0, hit.email.stage),
                remindersSent: (inv.remindersSent ?? 0) + 1,
                lastReminderAt: at,
                lastEmail: { ...hit.email, at },
              }
            : inv;
        }),
      }));
    },
    [update],
  );

  const runDispatcher = useCallback(() => {
    const d = getData();
    const evaluated = d.invoices.map((inv) => evaluateInvoice(inv, d.workflow, new Date()));
    log('EMAIL', `Reminder dispatcher started — scanning ${evaluated.length} invoices.`, 'info');
    const sent = [];
    let skipped = 0;
    let invalid = 0;
    evaluated.forEach((inv) => {
      const plan = planReminder(inv);
      if (plan.action === 'send') {
        const email = dispatchEmail(inv, plan.stage);
        sent.push({ id: inv.id, email });
        log('EMAIL', `${inv.id} → ${inv.email}: ${stageLabel(plan.stage, d.workflow)} dispatched (${inv.daysOverdue}d overdue). Subject: "${email.subject}"`, 'success');
      } else {
        skipped += 1;
        if (!inv.emailValid) {
          invalid += 1;
          log('VALIDATION', `${inv.id}: ${plan.reason}.`, 'error');
        } else {
          log('EMAIL', `${inv.id}: ${plan.reason}.`, 'info');
        }
      }
    });
    if (sent.length) markSent(sent);
    log(
      'EMAIL',
      `Dispatcher finished — ${sent.length} sent, ${skipped} skipped${invalid ? ` (${invalid} invalid email)` : ''}.`,
      sent.length ? 'success' : 'info',
    );
    pushToast(
      invalid ? 'warning' : sent.length ? 'success' : 'info',
      `${sent.length} reminder${sent.length === 1 ? '' : 's'} sent`,
      `${skipped} skipped${invalid ? ` · ${invalid} invalid email flagged in audit log` : ''}.`,
    );
    return { sent: sent.length, skipped, invalid };
  }, [getData, dispatchEmail, markSent, log, pushToast]);

  const sendNow = useCallback(
    (id) => {
      const d = getData();
      const raw = d.invoices.find((i) => i.id === id);
      if (!raw) return { ok: false };
      const inv = evaluateInvoice(raw, d.workflow, new Date());
      const plan = planReminder(inv, { force: true });
      if (plan.action === 'skip') {
        const level = !inv.emailValid ? 'error' : 'warn';
        log(!inv.emailValid ? 'VALIDATION' : 'EMAIL', `Send Now blocked for ${id}: ${plan.reason}.`, level);
        pushToast(!inv.emailValid ? 'error' : 'warning', `${id} not sent`, plan.reason.charAt(0).toUpperCase() + plan.reason.slice(1) + '.');
        return { ok: false };
      }
      const email = dispatchEmail(inv, plan.stage);
      markSent([{ id, email }]);
      log('EMAIL', `${id} → ${inv.email}: ${stageLabel(plan.stage, d.workflow)} sent manually. Subject: "${email.subject}"`, 'success');
      pushToast('success', 'Reminder sent', `${stageLabel(plan.stage, d.workflow)} emailed to ${inv.email}.`);
      patchUi({ emailPreview: { ...email, invoiceId: id, at: new Date().toISOString() } });
      return { ok: true };
    },
    [getData, dispatchEmail, markSent, log, pushToast, patchUi],
  );

  const updateInvoiceStatus = useCallback(
    (id, status) => {
      if (!status || !STATUS_OPTIONS.includes(status)) {
        log('VALIDATION', `Status update rejected for ${id}: "${status ?? ''}" — ${MESSAGES.statusInvalid}`, 'error');
        pushToast('error', 'Validation error', MESSAGES.statusInvalid);
        return { ok: false, error: MESSAGES.statusInvalid };
      }
      const d = getData();
      const inv = d.invoices.find((i) => i.id === id);
      if (!inv) return { ok: false, error: MESSAGES.statusInvalid };
      if (inv.status === status) {
        pushToast('info', 'No change', `${id} is already "${status}".`);
        return { ok: true, unchanged: true };
      }
      update((prev) => ({
        ...prev,
        invoices: prev.invoices.map((i) => (i.id === id ? { ...i, status, paidAt: status === STATUS.UNPAID ? null : new Date().toISOString() } : i)),
      }));
      const nowPaid = status !== STATUS.UNPAID;
      if (nowPaid) {
        log('INVOICE', `${id} marked "${status}" — ${moneyNow(inv.amount)} receivable cleared; automated reminders halted.`, 'success');
        notify({
          key: `paid-${id}-${Date.now()}`,
          kind: 'success',
          title: 'Payment received',
          message: `${id} · ${moneyNow(inv.amount)} from ${inv.email} marked ${status}. Reminders halted.`,
        });
      } else {
        log('INVOICE', `${id} set back to Unpaid — ${moneyNow(inv.amount)} receivable restored; reminders resumed.`, 'warn');
        pushToast('warning', 'Invoice reopened', `${id} is Unpaid again; reminders resume.`);
      }
      return { ok: true };
    },
    [getData, update, log, pushToast, notify, moneyNow],
  );

  const addInvoice = useCallback(
    ({ client, email, amount, daysOverdue }) => {
      const amt = Number(String(amount).replace(/[$£₹,\s]/g, ''));
      const days = Number(daysOverdue);
      if (!client?.trim() || !String(email ?? '').trim()) return { ok: false, error: 'Client name and email are required.' };
      if (!Number.isFinite(amt) || amt <= 0) return { ok: false, error: 'Amount must be a positive number.' };
      if (!Number.isInteger(days) || Math.abs(days) > 3650) return { ok: false, error: 'Days overdue must be a whole number (negative = not yet due).' };
      const d = getData();
      const maxNum = d.invoices.reduce((m, i) => Math.max(m, Number(String(i.id).replace(/\D/g, '')) || 0), 110);
      const id = `INV-${maxNum + 1}`;
      const now = new Date();
      const invoice = {
        id,
        client: client.trim(),
        email: String(email).trim(),
        amount: Math.round(amt * 100) / 100,
        issued: isoDate(now, -days - 30),
        due: isoDate(now, -days),
        status: STATUS.UNPAID,
        lastStageSent: 0,
        remindersSent: 0,
        lastReminderAt: null,
      };
      update((prev) => ({ ...prev, invoices: [invoice, ...prev.invoices] }));
      const valid = isValidEmail(invoice.email);
      log('INVOICE', `${id} created for ${invoice.email} — ${moneyNow(invoice.amount)}, ${describeDays(days)}${valid ? '' : ' (WARNING: email is invalid, reminders will be skipped)'}.`, valid ? 'success' : 'warn');
      pushToast(valid ? 'success' : 'warning', `${id} added`, valid ? 'Included in the next dispatcher run.' : 'Invalid email — reminders will be skipped.');
      return { ok: true, id };
    },
    [getData, update, log, pushToast, moneyNow],
  );

  // ---------------- escalation workflow (FR6) ----------------
  const saveWorkflow = useCallback(
    ({ intervals, tones }) => {
      const parsed = validateIntervals(intervals);
      if (!parsed.ok) {
        log('VALIDATION', `Escalation workflow rejected (intervals: ${intervals.map((v) => `"${v}"`).join(', ')}): ${parsed.error}`, 'error');
        pushToast('error', 'Validation error', parsed.error);
        return parsed;
      }
      if (!Array.isArray(tones) || tones.length !== 3 || tones.some((t) => !TONES.includes(t))) {
        const error = 'Invalid tone selection.';
        log('VALIDATION', `Escalation workflow rejected: ${error}`, 'error');
        pushToast('error', 'Validation error', error);
        return { ok: false, error };
      }
      const before = getData();
      const workflow = { intervals: parsed.value, tones: [...tones] };
      const stagesBefore = before.invoices.map((inv) => evaluateInvoice(inv, before.workflow, new Date()));
      update((prev) => ({ ...prev, workflow }));
      log('INVOICE', `${MESSAGES.workflowSaved} Intervals ${workflow.intervals.join('/')} days · tones ${workflow.tones.join(' → ')}.`, 'success');
      const changes = [];
      stagesBefore.forEach((old) => {
        const next = evaluateInvoice(old, workflow, new Date());
        if (next.stage !== old.stage && !next.paid) {
          changes.push(`${old.id}: ${old.stageText} → ${next.stageText}`);
        }
      });
      if (changes.length) log('INVOICE', `Active invoice stages recalculated — ${changes.join('; ')}.`, 'info');
      else log('INVOICE', 'Active invoice stages recalculated — no stage changes.', 'info');
      pushToast('success', MESSAGES.workflowSaved, changes.length ? `${changes.length} invoice stage(s) changed.` : 'No stage changes.');
      return { ok: true, message: MESSAGES.workflowSaved, changes };
    },
    [getData, update, log, pushToast],
  );

  // ---------------- exports (FR10) ----------------
  const exportCsv = useCallback(() => {
    const csv = buildTaxCsv({
      user: session,
      tax,
      totals,
      transactions: data.transactions,
      manualGross: data.manualGross,
    });
    downloadTextFile('quarterly_tax_summary.csv', csv);
    log('EXPORT', `quarterly_tax_summary.csv generated (${data.transactions.length} transactions, ${tax.jurisdiction.label}).`, 'success');
    pushToast('success', 'CSV exported', 'quarterly_tax_summary.csv downloaded.');
  }, [session, tax, totals, data.transactions, data.manualGross, log, pushToast]);

  const exportPdf = useCallback(() => {
    log('EXPORT', 'Print-formatted tax summary opened (choose "Save as PDF" in the print dialog).', 'success');
    printReport();
  }, [log]);

  // ---------------- reset (demo helper) ----------------
  const resetDemoData = useCallback(
    async ({ full = false } = {}) => {
      resetSystem();
      update(seedData());
      alertRef.current = null;
      if (full) await resetAuthStore();
      log('SYSTEM', full ? 'Full demo reset: users, session, ledger, invoices, workflow and log restored to defaults.' : 'Demo data reset: ledger, invoices, workflow, notifications and log restored to defaults.', 'success');
      if (!full) {
        pushToast('success', 'Demo data reset', 'Everything is back to the baseline numbers.');
        scanAlerts();
      }
    },
    [resetSystem, update, resetAuthStore, log, pushToast, scanAlerts],
  );

  const value = useMemo(
    () => ({
      data,
      transactions: sortedTransactions,
      totals,
      tax,
      jurisdiction,
      invoices,
      receivables,
      money,
      today,
      ui,
      patchUi,
      bank: data.bank,
      workflow: data.workflow,
      manualGross: data.manualGross,
      effectiveGross,
      setJurisdiction,
      applyManualGross,
      clearManualGross,
      syncNewTransactions,
      addEdgeCaseTransaction,
      reclassify,
      connectBank,
      disconnectBank,
      runDispatcher,
      sendNow,
      updateInvoiceStatus,
      addInvoice,
      saveWorkflow,
      exportCsv,
      exportPdf,
      resetDemoData,
      providers: BANK_PROVIDERS,
    }),
    [
      data, sortedTransactions, totals, tax, jurisdiction, invoices, receivables, money, today, ui, patchUi,
      effectiveGross, setJurisdiction, applyManualGross, clearManualGross, syncNewTransactions,
      addEdgeCaseTransaction, reclassify, connectBank, disconnectBank, runDispatcher, sendNow,
      updateInvoiceStatus, addInvoice, saveWorkflow, exportCsv, exportPdf, resetDemoData,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
