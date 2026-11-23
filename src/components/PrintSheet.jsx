import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { TAGS, REVIEW_NOTE } from '../utils/classifier';
import { formatDate, formatPercent } from '../utils/format';

const ORDER = [TAGS.BUSINESS_INCOME, TAGS.DEDUCTIBLE, TAGS.NON_BUSINESS, TAGS.UNCATEGORIZED];

/** Print-only layout used by "Export PDF" (hidden on screen via .print-only). */
export default function PrintSheet() {
  const { session } = useAuth();
  const { tax, money, totals, transactions, invoices, receivables, manualGross } = useData();
  const j = tax.jurisdiction;

  return (
    <div className="print-only print-sheet text-[11px] leading-snug text-slate-900">
      <div className="flex items-end justify-between border-b-2 border-teal-700 pb-3">
        <div>
          <h1 className="text-2xl font-bold">Quarterly Tax Summary</h1>
          <p className="mt-0.5 text-slate-600">Freelance Tax &amp; Invoice Chaser</p>
        </div>
        <div className="text-right text-slate-600">
          <p>Prepared for: {session?.name} ({session?.email})</p>
          <p>Generated: {new Date().toLocaleString('en-GB')}</p>
        </div>
      </div>

      <h2 className="mb-1 mt-5 text-sm font-bold uppercase tracking-wide text-teal-800">Jurisdiction</h2>
      <p>
        {j.label} · {j.currency} · effective rate {(j.rate * 100).toFixed(0)}% · registration threshold {money(j.threshold)}
      </p>

      <h2 className="mb-1 mt-5 text-sm font-bold uppercase tracking-wide text-teal-800">Key figures</h2>
      <table className="w-full border-collapse">
        <tbody>
          {[
            ['Gross Business Income', money(tax.gross) + (manualGross !== null ? ` (manual override; ledger ${money(totals.gross)})` : '')],
            ['Deductible Expenses', money(tax.deductions)],
            ['Net Taxable Income', money(tax.net)],
            ['Estimated Quarterly Tax', money(tax.quarterlyTax)],
            ['Threshold Progress', `${formatPercent(tax.thresholdPct)} of ${money(j.threshold)}`],
            ['Threshold Status', tax.alertActive ? 'ALERT — at or above 80% of threshold' : 'Within Safe Limit'],
            ['Open receivables', `${money(receivables.outstanding)} outstanding · ${money(receivables.overdue)} overdue (${invoices.filter((i) => !i.paid).length} invoices)`],
          ].map(([k, v]) => (
            <tr key={k} className="border-b border-slate-300">
              <th className="w-1/3 py-1.5 pr-3 text-left font-semibold">{k}</th>
              <td className="py-1.5">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mb-1 mt-5 text-sm font-bold uppercase tracking-wide text-teal-800">Categorized transactions</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-400 text-left">
            <th className="py-1.5 pr-2">Date</th>
            <th className="py-1.5 pr-2">Description</th>
            <th className="py-1.5 pr-2 text-right">Amount</th>
            <th className="py-1.5">Category</th>
          </tr>
        </thead>
        <tbody>
          {ORDER.flatMap((tag) => {
            const rows = transactions.filter((t) => t.tag === tag);
            if (!rows.length) return [];
            return [
              <tr key={`h-${tag}`} className="bg-slate-100">
                <td colSpan={4} className="py-1 font-bold">
                  {tag} ({rows.length})
                </td>
              </tr>,
              ...rows.map((t) => (
                <tr key={t.id} className="border-b border-slate-200">
                  <td className="whitespace-nowrap py-1 pr-2">{formatDate(t.date)}</td>
                  <td className="py-1 pr-2">{t.description || '(no description)'}</td>
                  <td className="whitespace-nowrap py-1 pr-2 text-right">{money(t.amount)}</td>
                  <td className="py-1">{tag === TAGS.UNCATEGORIZED ? REVIEW_NOTE : tag}</td>
                </tr>
              )),
            ];
          })}
        </tbody>
      </table>

      <p className="mt-6 border-t border-slate-300 pt-2 text-[10px] text-slate-500">
        Estimates only — not tax advice. Figures are computed from locally stored demo data; amounts are treated as {j.currency} without FX conversion.
      </p>
    </div>
  );
}
