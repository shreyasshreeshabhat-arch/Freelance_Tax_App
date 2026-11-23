import { useMemo } from 'react';
import { Play, Plus } from 'lucide-react';
import { PageHeader } from '../components/ui';
import InvoiceTable from '../components/invoices/InvoiceTable';
import { useData } from '../context/DataContext';
import { AGING_BUCKETS } from '../utils/invoiceEngine';

export default function InvoicesPage() {
  const { invoices, receivables, money, runDispatcher, patchUi, workflow } = useData();

  const buckets = useMemo(
    () =>
      AGING_BUCKETS.map((b) => {
        const list = invoices.filter((i) => !i.paid && i.bucket.key === b.key);
        return { ...b, count: list.length, amount: list.reduce((s, i) => s + i.amount, 0) };
      }),
    [invoices],
  );

  return (
    <>
      <PageHeader
        title="Invoices & Reminders"
        subtitle={`Escalation: ${workflow.intervals.map((d, i) => `${d}d ${workflow.tones[i]}`).join(' → ')}. Paid invoices are never chased.`}
        actions={
          <>
            <button type="button" className="btn btn-primary" onClick={runDispatcher}>
              <Play className="h-4 w-4" aria-hidden="true" />
              Run Reminder Dispatcher
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => patchUi({ addInvoiceOpen: true })}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Test Invoice
            </button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <div className="card p-3.5 lg:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Outstanding</p>
          <p className="num mt-1 break-words text-lg font-bold text-slate-900">{money(receivables.outstanding)}</p>
        </div>
        <div className="card p-3.5 lg:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overdue</p>
          <p className="num mt-1 break-words text-lg font-bold text-red-700">{money(receivables.overdue)}</p>
        </div>
        {buckets.map((b) => (
          <div key={b.key} className="card p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{b.label}</p>
            <p className="num mt-1 break-words text-lg font-bold text-slate-900">{money(b.amount)}</p>
            <p className="text-xs text-slate-500">
              {b.count} invoice{b.count === 1 ? '' : 's'}
            </p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <InvoiceTable rows={invoices} />
      </div>
    </>
  );
}
