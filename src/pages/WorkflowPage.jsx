import { useState } from 'react';
import { Info, RotateCcw, Save } from 'lucide-react';
import { Alert, Badge, PageHeader } from '../components/ui';
import { AgingBadge } from '../components/invoices/InvoiceTable';
import { useData } from '../context/DataContext';
import { DEFAULT_WORKFLOW, TONES, describeDays } from '../utils/invoiceEngine';

const TONE_BLURB = {
  Polite: 'Friendly check-in; assumes it slipped through the cracks.',
  'Gentle Nudge': 'Clear follow-up asking for a payment date.',
  'Firm Warning': 'Formal notice mentioning late fees and a deadline.',
};

function WorkflowForm({ initial, onSaved }) {
  const { saveWorkflow } = useData();
  const [days, setDays] = useState(initial.intervals.map(String));
  const [tones, setTones] = useState([...initial.tones]);
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const res = saveWorkflow({ intervals: days, tones });
    if (!res.ok) {
      setError(res.error);
      onSaved(null);
      return;
    }
    setError('');
    onSaved(res);
  };

  const restoreDefaults = () => {
    setDays(DEFAULT_WORKFLOW.intervals.map(String));
    setTones([...DEFAULT_WORKFLOW.tones]);
    setError('');
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {[0, 1, 2].map((i) => (
        <fieldset key={i} className="rounded-lg border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-900">Stage {i + 1}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor={`wf-days-${i}`}>
                Send when overdue ≥ (days)
              </label>
              <input
                id={`wf-days-${i}`}
                className={`input ${error ? 'input-error' : ''}`}
                inputMode="numeric"
                value={days[i]}
                onChange={(e) => setDays((d) => d.map((v, j) => (j === i ? e.target.value : v)))}
                aria-invalid={Boolean(error)}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="label" htmlFor={`wf-tone-${i}`}>
                Tone
              </label>
              <select
                id={`wf-tone-${i}`}
                className="input"
                value={tones[i]}
                onChange={(e) => setTones((t) => t.map((v, j) => (j === i ? e.target.value : v)))}
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">{TONE_BLURB[tones[i]]}</p>
            </div>
          </div>
        </fieldset>
      ))}

      {error && <Alert kind="error">{error}</Alert>}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary">
          <Save className="h-4 w-4" aria-hidden="true" />
          Save workflow
        </button>
        <button type="button" className="btn btn-secondary" onClick={restoreDefaults}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Restore defaults (3 / 7 / 14)
        </button>
      </div>
    </form>
  );
}

export default function WorkflowPage() {
  const { workflow, invoices } = useData();
  const [saved, setSaved] = useState(null);

  return (
    <>
      <PageHeader title="Escalation Workflow" subtitle="Choose when reminders fire and how firm they sound. Changes re-stage every open invoice immediately." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="card p-4 sm:p-5">
          <h2 className="mb-1 text-base font-semibold text-slate-900">Configure stages</h2>
          <p className="mb-4 flex items-start gap-2 text-xs text-slate-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Intervals must be positive whole numbers in ascending order — try <code className="rounded bg-slate-100 px-1">-5, 0, 2</code> to see validation.
          </p>
          {saved && (
            <div className="mb-4">
              <Alert kind="success">
                {saved.message}
                {saved.changes.length > 0 && (
                  <ul className="mt-1 list-inside list-disc text-xs font-normal">
                    {saved.changes.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                )}
              </Alert>
            </div>
          )}
          {/* Re-mounts when the saved workflow changes elsewhere (e.g. Reset Demo Data). */}
          <WorkflowForm key={JSON.stringify(workflow)} initial={workflow} onSaved={setSaved} />
        </section>

        <section className="card h-fit overflow-hidden">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <h2 className="text-base font-semibold text-slate-900">Live stage preview</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Active rules: {workflow.intervals.map((d, i) => `${d}d → ${workflow.tones[i]}`).join(' · ')}
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{inv.id}</p>
                  <p className="text-xs text-slate-500">{describeDays(inv.daysOverdue)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <AgingBadge inv={inv} />
                  {inv.paid ? (
                    <Badge tone="green">Reminders halted</Badge>
                  ) : inv.stage ? (
                    <Badge tone={inv.stage >= 3 ? 'red' : inv.stage === 2 ? 'orange' : 'amber'}>{inv.stageText}</Badge>
                  ) : (
                    <Badge tone="slate">No reminder yet</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
