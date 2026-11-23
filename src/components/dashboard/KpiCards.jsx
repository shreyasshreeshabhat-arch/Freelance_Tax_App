import { Calculator, Gauge, Receipt, TrendingUp, Wallet } from 'lucide-react';
import { Badge } from '../ui';
import { useData } from '../../context/DataContext';
import { formatPercent } from '../../utils/format';

function Kpi({ label, value, hint, Icon, accent = 'text-brand bg-brand-soft', className = '', children, testId }) {
  return (
    <div className={`card p-4 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="num mt-2 break-words text-xl font-bold text-slate-900 sm:text-2xl" data-testid={testId}>
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
      {children}
    </div>
  );
}

export default function KpiCards() {
  const { tax, money, manualGross, totals } = useData();
  const pct = Math.min(100, tax.thresholdPct);
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <Kpi
        label="Gross Business Income"
        value={money(tax.gross)}
        Icon={TrendingUp}
        accent="text-emerald-700 bg-emerald-50"
        hint={manualGross !== null ? `Manual test value (ledger: ${money(totals.gross)})` : 'Tagged Business Income'}
        testId="kpi-gross"
      >
        {manualGross !== null && (
          <Badge tone="amber" className="mt-2">
            Manual override
          </Badge>
        )}
      </Kpi>
      <Kpi label="Deductible Expenses" value={money(tax.deductions)} Icon={Receipt} accent="text-sky-700 bg-sky-50" hint="Tagged Deductible Expense" testId="kpi-deductions" />
      <Kpi label="Net Taxable Income" value={money(tax.net)} Icon={Wallet} accent="text-slate-700 bg-slate-100" hint="max(0, gross − deductions)" testId="kpi-net" />
      <Kpi label="Est. Quarterly Tax" value={money(tax.quarterlyTax)} Icon={Calculator} hint={`(net × ${(tax.jurisdiction.rate * 100).toFixed(0)}%) ÷ 4`} testId="kpi-quarterly" className="!border-teal-300 !bg-brand-soft" />
      <Kpi
        label="Threshold Progress"
        value={formatPercent(tax.thresholdPct)}
        Icon={Gauge}
        accent={tax.alertActive ? 'text-amber-700 bg-amber-100' : 'text-emerald-700 bg-emerald-50'}
        hint={`of ${money(tax.jurisdiction.threshold)}`}
        testId="kpi-threshold"
        className="col-span-2 md:col-span-1"
      >
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full transition-all ${tax.alertActive ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
        </div>
      </Kpi>
    </div>
  );
}
