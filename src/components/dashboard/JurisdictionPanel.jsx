import { Globe, Zap } from 'lucide-react';
import { Badge } from '../ui';
import { useData } from '../../context/DataContext';
import { JURISDICTIONS } from '../../utils/taxEngine';
import { formatPercent } from '../../utils/format';

export default function JurisdictionPanel() {
  const { tax, money, data, setJurisdiction } = useData();
  const j = tax.jurisdiction;
  const ratePct = `${(j.rate * 100).toFixed(0)}%`;

  return (
    <section className="card p-4 sm:p-5" aria-labelledby="jurisdiction-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="jurisdiction-heading" className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Globe className="h-4 w-4 text-brand" aria-hidden="true" />
          Tax jurisdiction
        </h2>
        <Badge tone="teal" title="Time taken to recompute all tax figures for the current inputs">
          <Zap className="h-3 w-3" aria-hidden="true" />
          Recalculated in {tax.calcMs < 0.01 ? '<0.01' : tax.calcMs.toFixed(2)} ms · target &lt;50 ms
        </Badge>
      </div>

      <div role="radiogroup" aria-label="Jurisdiction" className="mt-3 grid gap-2 sm:grid-cols-3">
        {Object.values(JURISDICTIONS).map((x) => {
          const active = data.jurisdiction === x.key;
          return (
            <button
              key={x.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setJurisdiction(x.key)}
              className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                active ? 'border-brand bg-brand text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="block text-sm font-semibold">{x.label}</span>
              <span className={`block text-xs ${active ? 'text-teal-100' : 'text-slate-500'}`}>
                {(x.rate * 100).toFixed(0)}% effective · threshold {new Intl.NumberFormat(x.locale, { style: 'currency', currency: x.currency, maximumFractionDigits: 0 }).format(x.threshold)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-lg bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700 sm:text-[13px]">
        <p className="break-words">
          <span className="text-slate-400">N&nbsp;&nbsp;&nbsp;=</span> max(0, {money(tax.gross)} − {money(tax.deductions)}) = <strong>{money(tax.net)}</strong>
        </p>
        <p className="break-words">
          <span className="text-slate-400">T_q =</span> ({money(tax.net)} × {ratePct}) ÷ 4 = <strong>{money(tax.quarterlyTax)}</strong>
        </p>
        <p className="break-words">
          <span className="text-slate-400">P&nbsp;&nbsp;&nbsp;=</span> {money(tax.gross)} ÷ {money(j.threshold)} = <strong>{formatPercent(tax.thresholdPct)}</strong>
        </p>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {j.taxName} · {j.thresholdName}. Ledger figures are treated as {j.currency} (no FX conversion in this demo).
      </p>
    </section>
  );
}
