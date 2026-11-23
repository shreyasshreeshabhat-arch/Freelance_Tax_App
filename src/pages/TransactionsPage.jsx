import { useMemo, useState } from 'react';
import { Landmark, Plus, RefreshCw, TriangleAlert } from 'lucide-react';
import { Badge, PageHeader } from '../components/ui';
import TransactionTable from '../components/transactions/TransactionTable';
import ExportButtons from '../components/ExportButtons';
import { useData } from '../context/DataContext';
import { TAGS } from '../utils/classifier';
import { formatDateTime } from '../utils/format';

const FILTERS = ['All', TAGS.BUSINESS_INCOME, TAGS.DEDUCTIBLE, TAGS.NON_BUSINESS, TAGS.UNCATEGORIZED];

export default function TransactionsPage() {
  const { transactions, totals, bank, patchUi, syncNewTransactions, addEdgeCaseTransaction, money } = useData();
  const [filter, setFilter] = useState('All');
  const rows = useMemo(() => (filter === 'All' ? transactions : transactions.filter((t) => t.tag === filter)), [transactions, filter]);
  const review = totals.counts[TAGS.UNCATEGORIZED];

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle="Auto-tagged by a rule engine + simulated AI classifier. Change any tag and every tax KPI recalculates instantly."
        actions={
          <>
            <button type="button" className="btn btn-primary" onClick={() => patchUi({ bankOpen: true })}>
              <Landmark className="h-4 w-4" aria-hidden="true" />
              {bank.connected ? 'Manage Bank' : 'Connect Bank'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={syncNewTransactions}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Sync New Transactions
            </button>
            <button type="button" className="btn btn-secondary" onClick={addEdgeCaseTransaction} title="Adds a transaction with an empty description and $0.00 amount">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Edge Case
            </button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${bank.connected ? 'bg-emerald-500' : 'bg-slate-300'}`} aria-hidden="true" />
          {bank.connected ? (
            <>
              Bank connected via <strong>{bank.provider}</strong>
              <span className="text-xs text-slate-500">· last sync {formatDateTime(bank.lastSync)}</span>
            </>
          ) : (
            <span className="text-slate-600">No bank connected — using imported ledger</span>
          )}
        </span>
        <span className="text-xs text-slate-500 sm:ml-auto">Amounts shown in the active jurisdiction's currency (no FX conversion).</span>
      </div>

      {review > 0 && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <strong>{review}</strong> transaction{review === 1 ? '' : 's'} need manual review and {review === 1 ? 'is' : 'are'} excluded from tax totals until tagged.
          </p>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:pb-0" role="tablist" aria-label="Filter by tag">
            {FILTERS.map((f) => {
              const count = f === 'All' ? transactions.length : totals.counts[f];
              const active = filter === f;
              return (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f} <span className={active ? 'text-teal-100' : 'text-slate-400'}>{count}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge tone="green">Gross {money(totals.gross)}</Badge>
            <Badge tone="blue">Deductions {money(totals.deductions)}</Badge>
          </div>
        </div>
        <TransactionTable rows={rows} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ExportButtons size="sm" />
      </div>
    </>
  );
}
