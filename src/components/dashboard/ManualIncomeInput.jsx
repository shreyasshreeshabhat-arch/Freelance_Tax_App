import { useState } from 'react';
import { FlaskConical, RotateCcw } from 'lucide-react';
import { Alert, Badge } from '../ui';
import { useData } from '../../context/DataContext';

export default function ManualIncomeInput() {
  const { applyManualGross, clearManualGross, manualGross, money } = useData();
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');

  const apply = (e) => {
    e.preventDefault();
    const res = applyManualGross(raw);
    setError(res.ok ? '' : res.error);
    if (res.ok) setRaw('');
  };

  const clear = () => {
    clearManualGross();
    setRaw('');
    setError('');
  };

  return (
    <section className="card p-4 sm:p-5" aria-labelledby="manual-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="manual-heading" className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <FlaskConical className="h-4 w-4 text-brand" aria-hidden="true" />
          Manual income test input
        </h2>
        {manualGross !== null && <Badge tone="amber">Override active: {money(manualGross)}</Badge>}
      </div>
      <p className="mt-1 text-xs text-slate-500">What-if: override gross business income to see how tax and the threshold alert react. Negative values are rejected.</p>

      <form onSubmit={apply} className="mt-3 flex flex-col gap-2 sm:flex-row" noValidate>
        <div className="flex-1">
          <label htmlFor="manual-gross" className="sr-only">
            Gross business income
          </label>
          <input
            id="manual-gross"
            className={`input ${error ? 'input-error' : ''}`}
            inputMode="decimal"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="e.g. 75000   (try -500)"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'manual-error' : undefined}
            autoComplete="off"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary flex-1 sm:flex-none">
            Apply
          </button>
          <button type="button" className="btn btn-secondary flex-1 sm:flex-none" onClick={clear} disabled={manualGross === null && !raw && !error}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Clear
          </button>
        </div>
      </form>
      {error && (
        <div id="manual-error" className="mt-3">
          <Alert kind="error">{error}</Alert>
        </div>
      )}
    </section>
  );
}
