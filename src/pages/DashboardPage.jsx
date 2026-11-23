import { ArrowRight, Landmark, Play, Send } from 'lucide-react';
import { PageHeader } from '../components/ui';
import ThresholdBanner from '../components/dashboard/ThresholdBanner';
import KpiCards from '../components/dashboard/KpiCards';
import JurisdictionPanel from '../components/dashboard/JurisdictionPanel';
import ManualIncomeInput from '../components/dashboard/ManualIncomeInput';
import TransactionTable from '../components/transactions/TransactionTable';
import { AgingBadge } from '../components/invoices/InvoiceTable';
import ExportButtons from '../components/ExportButtons';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { describeDays } from '../utils/invoiceEngine';

export default function DashboardPage() {
  const { session } = useAuth();
  const { transactions, invoices, receivables, money, bank, patchUi, runDispatcher, sendNow } = useData();
  const needAttention = invoices.filter((i) => !i.paid && i.daysOverdue > 0);

  return (
    <>
      <PageHeader
        title={`Hello, ${session?.name?.split(' ')[0] ?? 'there'}`}
        subtitle="Your live quarterly tax position and receivables."
        actions={
          <>
            <button type="button" className="btn btn-primary" onClick={() => patchUi({ bankOpen: true })}>
              <Landmark className="h-4 w-4" aria-hidden="true" />
              {bank.connected ? 'Manage Bank' : 'Connect Bank'}
            </button>
            <button type="button" className="btn btn-primary" onClick={runDispatcher}>
              <Play className="h-4 w-4" aria-hidden="true" />
              Run Reminder Dispatcher
            </button>
            <ExportButtons />
          </>
        }
      />

      <div className="space-y-4">
        <ThresholdBanner />
        <KpiCards />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <JurisdictionPanel />
          <ManualIncomeInput />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <section className="card overflow-hidden" aria-labelledby="recent-tx-heading">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3.5">
              <h2 id="recent-tx-heading" className="text-base font-semibold text-slate-900">
                Recent transactions
              </h2>
              <a href="#/transactions" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
                View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
            <TransactionTable rows={transactions} limit={6} />
          </section>

          <section className="card h-fit overflow-hidden" aria-labelledby="receivables-heading">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3.5">
              <h2 id="receivables-heading" className="text-base font-semibold text-slate-900">
                Receivables
              </h2>
              <a href="#/invoices" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
                Manage <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Outstanding</p>
                <p className="num mt-1 break-words text-lg font-bold text-slate-900">{money(receivables.outstanding)}</p>
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overdue</p>
                <p className="num mt-1 break-words text-lg font-bold text-red-700">{money(receivables.overdue)}</p>
              </div>
            </div>
            {needAttention.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">No overdue invoices — nice work.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {needAttention.map((inv) => (
                  <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {inv.id} <span className="font-normal text-slate-500">· {money(inv.amount)}</span>
                      </p>
                      <p className="break-all text-xs text-slate-500">
                        {inv.email} · {describeDays(inv.daysOverdue)}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <AgingBadge inv={inv} />
                      </div>
                    </div>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => sendNow(inv.id)} aria-label={`Send reminder now for ${inv.id}`}>
                      <Send className="h-3.5 w-3.5" aria-hidden="true" />
                      Send Now
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
