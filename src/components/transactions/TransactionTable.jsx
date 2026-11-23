import { Landmark, Lock, Sparkles, UserCheck, TriangleAlert, Wand2 } from 'lucide-react';
import { Badge } from '../ui';
import { useData } from '../../context/DataContext';
import { ASSIGNABLE_TAGS, REVIEW_NOTE, TAGS } from '../../utils/classifier';
import { formatDate } from '../../utils/format';

const TAG_TONE = {
  [TAGS.BUSINESS_INCOME]: 'green',
  [TAGS.NON_BUSINESS]: 'slate',
  [TAGS.DEDUCTIBLE]: 'blue',
  [TAGS.UNCATEGORIZED]: 'amber',
};

function TagBadge({ tx }) {
  if (tx.tag === TAGS.UNCATEGORIZED) {
    return (
      <Badge tone="amber" className="whitespace-normal text-left">
        <TriangleAlert className="h-3 w-3 shrink-0" aria-hidden="true" />
        {REVIEW_NOTE}
      </Badge>
    );
  }
  return <Badge tone={TAG_TONE[tx.tag]} className="whitespace-nowrap">{tx.tag}</Badge>;
}

function MethodHint({ tx }) {
  if (tx.method === 'manual') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
        <UserCheck className="h-3 w-3" aria-hidden="true" /> Manual
      </span>
    );
  }
  if (tx.tag === TAGS.UNCATEGORIZED && !tx.confidence) return null;
  const AI = tx.method === 'ai';
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500" title={tx.reason}>
      {AI ? <Sparkles className="h-3 w-3" aria-hidden="true" /> : <Wand2 className="h-3 w-3" aria-hidden="true" />}
      {AI ? 'AI' : 'Rule'} · {Math.round((tx.confidence ?? 0) * 100)}%
    </span>
  );
}

function SourceChip({ tx }) {
  if (!tx.source || tx.source === 'import') return null;
  const isBank = tx.source.startsWith('bank:');
  return (
    <Badge tone={isBank ? 'violet' : 'slate'} className="text-[10px]">
      {isBank ? <Lock className="h-2.5 w-2.5" aria-hidden="true" /> : <Landmark className="h-2.5 w-2.5" aria-hidden="true" />}
      {isBank ? `${tx.source.slice(5)} · encrypted` : 'Simulated feed'}
    </Badge>
  );
}

function TagSelect({ tx, onChange }) {
  const isAssignable = ASSIGNABLE_TAGS.includes(tx.tag);
  return (
    <select
      value={isAssignable ? tx.tag : ''}
      onChange={(e) => onChange(tx.id, e.target.value)}
      className="input !w-full !py-1.5 text-xs sm:!w-44"
      aria-label={`Change tag for ${tx.description || 'transaction with empty description'}`}
    >
      {!isAssignable && (
        <option value="" disabled>
          Change Tag…
        </option>
      )}
      {ASSIGNABLE_TAGS.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}

export default function TransactionTable({ rows, limit }) {
  const { money, reclassify } = useData();
  const shown = limit ? rows.slice(0, limit) : rows;

  if (!shown.length) {
    return <p className="px-4 py-10 text-center text-sm text-slate-500">No transactions match this filter.</p>;
  }

  const amountCls = (a) => (a > 0 ? 'text-emerald-700' : a < 0 ? 'text-slate-800' : 'text-slate-500');
  const descr = (tx) => tx.description || <span className="italic text-slate-400">(no description)</span>;

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Description</th>
              <th className="px-4 py-3 text-right font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Tag</th>
              <th className="px-4 py-3 font-semibold">Change Tag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((tx) => (
              <tr key={tx.id} className={tx.tag === TAGS.UNCATEGORIZED ? 'bg-amber-50/40' : 'hover:bg-slate-50'}>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(tx.date)}</td>
                <td className="max-w-xs px-4 py-3">
                  <p className="break-words font-medium text-slate-900">{descr(tx)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <SourceChip tx={tx} />
                  </div>
                </td>
                <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${amountCls(tx.amount)}`}>
                  {tx.amount > 0 ? '+' : ''}
                  {money(tx.amount)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <TagBadge tx={tx} />
                    <MethodHint tx={tx} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <TagSelect tx={tx} onChange={reclassify} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {shown.map((tx) => (
          <li key={tx.id} className={`space-y-2.5 px-4 py-3.5 ${tx.tag === TAGS.UNCATEGORIZED ? 'bg-amber-50/40' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-slate-900">{descr(tx)}</p>
                <p className="text-xs text-slate-500">{formatDate(tx.date)}</p>
              </div>
              <p className={`shrink-0 text-sm font-bold ${amountCls(tx.amount)}`}>
                {tx.amount > 0 ? '+' : ''}
                {money(tx.amount)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <TagBadge tx={tx} />
              <MethodHint tx={tx} />
              <SourceChip tx={tx} />
            </div>
            <TagSelect tx={tx} onChange={reclassify} />
          </li>
        ))}
      </ul>
    </>
  );
}
