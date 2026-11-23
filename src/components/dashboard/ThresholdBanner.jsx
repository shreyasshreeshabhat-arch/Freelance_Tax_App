import { CircleCheck, TriangleAlert } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { THRESHOLD_ALERT_PCT, thresholdAlertText } from '../../utils/taxEngine';
import { formatPercent } from '../../utils/format';

export default function ThresholdBanner() {
  const { tax, money } = useData();
  const j = tax.jurisdiction;
  const pct = Math.min(100, tax.thresholdPct);

  if (!tax.alertActive) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
        <CircleCheck className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
        <span className="font-semibold">Within Safe Limit</span>
        <span className="text-emerald-800">
          {formatPercent(tax.thresholdPct)} ({money(tax.gross)} / {money(j.threshold)}) of your {j.thresholdName} — alert triggers at {THRESHOLD_ALERT_PCT}%.
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm" role="alert" data-testid="threshold-banner">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-slate-900">
          <TriangleAlert className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold text-amber-950 sm:text-base">{thresholdAlertText(tax)}</p>
          <p className="mt-1 text-sm text-amber-900">
            {tax.exceeded
              ? 'You have exceeded the threshold — registration is likely required. Speak to an accountant.'
              : `${money(tax.remaining)} of headroom left before registration may be required.`}
          </p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-amber-200" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Threshold progress">
            <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
