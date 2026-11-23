// CSV generation & print/PDF export (FR10).

import { TAGS, REVIEW_NOTE } from './classifier';

// Neutralise spreadsheet formula injection in free-text cells, then RFC-4180 quote.
function csvCell(value, { text = false } = {}) {
  let s = value === null || value === undefined ? '' : String(value);
  if (text && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const row = (cells) => cells.map((c) => (Array.isArray(c) ? csvCell(c[0], { text: true }) : csvCell(c))).join(',');
const t = (s) => [s]; // marks a free-text cell

const num = (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '');

export function buildTaxCsv({ user, tax, totals, transactions, manualGross, generatedAt = new Date() }) {
  const j = tax.jurisdiction;
  const lines = [];
  lines.push(row(['QUARTERLY TAX SUMMARY']));
  lines.push(row(['Generated', generatedAt.toISOString()]));
  lines.push(row(['Prepared for', t(user?.name ?? ''), t(user?.email ?? '')]));
  lines.push('');
  lines.push(row(['JURISDICTION']));
  lines.push(row(['Jurisdiction', j.label]));
  lines.push(row(['Currency', j.currency]));
  lines.push(row(['Effective tax rate', `${(j.rate * 100).toFixed(2)}%`]));
  lines.push(row(['Registration threshold', num(j.threshold)]));
  lines.push('');
  lines.push(row(['KEY FIGURES', 'Value']));
  lines.push(row(['Gross Business Income', num(tax.gross)]));
  lines.push(row(['Deductible Expenses', num(tax.deductions)]));
  lines.push(row(['Net Taxable Income', num(tax.net)]));
  lines.push(row(['Estimated Quarterly Tax', num(tax.quarterlyTax)]));
  lines.push(row(['Threshold Progress', `${tax.thresholdPct.toFixed(1)}%`]));
  lines.push(row(['Threshold Status', tax.alertActive ? 'ALERT (>= 80%)' : 'Within Safe Limit']));
  if (manualGross !== null && manualGross !== undefined) {
    lines.push(row(['Note', t(`Gross income manually overridden to ${num(manualGross)} (ledger gross: ${num(totals.gross)})`)]));
  }
  lines.push('');
  lines.push(row(['LEDGER TOTALS BY CATEGORY', 'Transactions']));
  Object.values(TAGS).forEach((tag) => lines.push(row([tag, totals.counts[tag] ?? 0])));
  lines.push('');
  lines.push(row(['CATEGORIZED TRANSACTIONS']));
  lines.push(row(['Date', 'Description', 'Amount', 'Category', 'Classified By', 'Confidence', 'Review Flag']));
  const order = [TAGS.BUSINESS_INCOME, TAGS.DEDUCTIBLE, TAGS.NON_BUSINESS, TAGS.UNCATEGORIZED];
  const sorted = [...transactions].sort(
    (a, b) => order.indexOf(a.tag) - order.indexOf(b.tag) || String(b.date).localeCompare(String(a.date)),
  );
  for (const tx of sorted) {
    lines.push(
      row([
        tx.date,
        t(tx.description || '(no description)'),
        num(tx.amount),
        tx.tag,
        tx.method,
        tx.confidence !== undefined ? Number(tx.confidence).toFixed(2) : '',
        tx.tag === TAGS.UNCATEGORIZED ? REVIEW_NOTE : '',
      ]),
    );
  }
  // BOM keeps £ / ₹ intact when opened in Excel.
  return `${String.fromCharCode(0xfeff)}${lines.join('\r\n')}\r\n`;
}

export function downloadTextFile(filename, content, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Opens the browser print dialog (user picks "Save as PDF"); @media print hides the app chrome. */
export function printReport() {
  const previous = document.title;
  const restore = () => {
    document.title = previous;
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore);
  document.title = 'Quarterly Tax Summary';
  // Defer so React can flush any pending render of the print sheet.
  setTimeout(() => window.print(), 50);
}
