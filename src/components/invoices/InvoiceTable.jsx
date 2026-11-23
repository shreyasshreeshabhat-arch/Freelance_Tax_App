import { useState } from 'react';
import { Check, Eye, Send, TriangleAlert } from 'lucide-react';
import { Badge } from '../ui';
import { useData } from '../../context/DataContext';
import { STATUS, STATUS_OPTIONS, describeDays } from '../../utils/invoiceEngine';
import { formatDate } from '../../utils/format';
import { MESSAGES } from '../../utils/validators';

const BUCKET_TONE = { slate: 'slate', amber: 'amber', orange: 'orange', red: 'red', rose: 'rose' };

export function AgingBadge({ inv }) {
  if (inv.paid) return <Badge tone="green">Settled</Badge>;
  return <Badge tone={BUCKET_TONE[inv.bucket.tone]}>{inv.bucket.label}</Badge>;
}

function StatusBadge({ inv }) {
  if (inv.status === STATUS.UNPAID) return <Badge tone="slate">Unpaid</Badge>;
  return <Badge tone="green">{inv.status}</Badge>;
}

function StageBadge({ inv }) {
  if (inv.paid) return <Badge tone="green">Reminders halted</Badge>;
  if (!inv.stage) return <span className="text-xs text-slate-500">{inv.daysOverdue > 0 ? 'Below first interval' : 'Not due yet'}</span>;
  const tone = inv.stage >= 3 ? 'red' : inv.stage === 2 ? 'orange' : 'amber';
  return <Badge tone={tone}>{inv.stageText}</Badge>;
}

/** "Mark Paid / Update Status" — rejects an empty selection with an explicit error. */
function StatusControl({ inv }) {
  const { updateInvoiceStatus } = useData();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const apply = () => {
    const res = updateInvoiceStatus(inv.id, value);
    setError(res.ok ? '' : res.error ?? MESSAGES.statusInvalid);
    if (res.ok) setValue('');
  };

  return (
    <div>
      <div className="flex gap-1.5">
        <select
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError('');
          }}
          className={`input !py-1.5 text-xs ${error ? 'input-error' : ''}`}
          aria-label={`Update status for ${inv.id}`}
          aria-invalid={Boolean(error)}
        >
          <option value="">Update status…</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="button" onClick={apply} className="btn btn-secondary btn-sm shrink-0" aria-label={`Apply status to ${inv.id}`}>
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Apply
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1 flex items-center gap-1 text-xs font-medium text-red-700">
          <TriangleAlert className="h-3 w-3" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

function Actions({ inv }) {
  const { sendNow, patchUi } = useData();
  return (
    <div className="flex flex-col gap-2 sm:min-w-[15rem]">
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => sendNow(inv.id)} className="btn btn-primary btn-sm" aria-label={`Send reminder now for ${inv.id}`}>
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          Send Now
        </button>
        {inv.lastEmail && (
          <button
            type="button"
            onClick={() => patchUi({ emailPreview: { ...inv.lastEmail, invoiceId: inv.id } })}
            className="btn btn-ghost btn-sm !px-2"
            aria-label={`View last email sent for ${inv.id}`}
            title="View last email"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        {inv.remindersSent > 0 && <span className="text-xs text-slate-500">{inv.remindersSent} sent</span>}
      </div>
      <StatusControl inv={inv} />
    </div>
  );
}

function EmailCell({ inv }) {
  return (
    <div className="min-w-0">
      <span className="break-all">{inv.email}</span>
      {!inv.emailValid && (
        <Badge tone="red" className="ml-1.5 align-middle">
          <TriangleAlert className="h-3 w-3" aria-hidden="true" />
          Invalid email
        </Badge>
      )}
    </div>
  );
}

export default function InvoiceTable({ rows }) {
  const { money } = useData();

  if (!rows.length) return <p className="px-4 py-10 text-center text-sm text-slate-500">No invoices.</p>;

  return (
    <>
      <div className="hidden lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Invoice</th>
              <th className="px-4 py-3 font-semibold">Client email</th>
              <th className="px-4 py-3 text-right font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Due / aging</th>
              <th className="px-4 py-3 font-semibold">Stage</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 align-top">
            {rows.map((inv) => (
              <tr key={inv.id} className={inv.paid ? 'bg-slate-50/60 text-slate-500' : inv.emailValid ? '' : 'bg-red-50/30'}>
                <td className="px-4 py-3.5">
                  <p className="font-semibold text-slate-900">{inv.id}</p>
                  <p className="text-xs text-slate-500">{inv.client}</p>
                </td>
                <td className="max-w-[14rem] px-4 py-3.5">
                  <EmailCell inv={inv} />
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold">{money(inv.amount)}</td>
                <td className="px-4 py-3.5">
                  <p className="whitespace-nowrap text-xs text-slate-500">{formatDate(inv.due)}</p>
                  <p className="mt-0.5 whitespace-nowrap text-sm font-medium">{describeDays(inv.daysOverdue)}</p>
                  <div className="mt-1">
                    <AgingBadge inv={inv} />
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <StageBadge inv={inv} />
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge inv={inv} />
                </td>
                <td className="px-4 py-3.5">
                  <Actions inv={inv} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 lg:hidden">
        {rows.map((inv) => (
          <li key={inv.id} className={`space-y-3 px-4 py-4 ${inv.paid ? 'bg-slate-50/60' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">
                  {inv.id} <span className="font-normal text-slate-500">· {inv.client}</span>
                </p>
                <div className="mt-0.5 text-sm text-slate-600">
                  <EmailCell inv={inv} />
                </div>
              </div>
              <p className="shrink-0 text-base font-bold text-slate-900">{money(inv.amount)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AgingBadge inv={inv} />
              <StageBadge inv={inv} />
              <StatusBadge inv={inv} />
            </div>
            <p className="text-xs text-slate-500">
              Due {formatDate(inv.due)} · {describeDays(inv.daysOverdue)}
            </p>
            <Actions inv={inv} />
          </li>
        ))}
      </ul>
    </>
  );
}
