import { Mail } from 'lucide-react';
import { Badge, Modal } from '../ui';
import { useData } from '../../context/DataContext';
import { formatDateTime } from '../../utils/format';

const TONE_BADGE = { Polite: 'teal', 'Gentle Nudge': 'amber', 'Firm Warning': 'red' };

export default function EmailPreviewModal() {
  const { ui, patchUi } = useData();
  const email = ui.emailPreview;
  const close = () => patchUi({ emailPreview: null });
  return (
    <Modal
      open={Boolean(email)}
      onClose={close}
      title={email ? `Simulated email · ${email.invoiceId}` : 'Email'}
      icon={Mail}
      footer={
        <button type="button" className="btn btn-primary" onClick={close}>
          Close
        </button>
      }
    >
      {email && (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={TONE_BADGE[email.tone] ?? 'slate'}>
              Stage {email.stage} · {email.tone}
            </Badge>
            <span className="text-xs text-slate-500">{formatDateTime(email.at)} · simulated SMTP · 250 OK</span>
          </div>
          <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            <div className="flex gap-3 px-3 py-2">
              <dt className="w-16 shrink-0 text-xs font-semibold uppercase text-slate-500">To</dt>
              <dd className="min-w-0 break-all">{email.to}</dd>
            </div>
            <div className="flex gap-3 px-3 py-2">
              <dt className="w-16 shrink-0 text-xs font-semibold uppercase text-slate-500">Subject</dt>
              <dd className="min-w-0 break-words font-semibold">{email.subject}</dd>
            </div>
          </dl>
          <pre className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 font-sans text-sm leading-relaxed text-slate-700">{email.body}</pre>
          <p className="text-xs text-slate-500">Nothing was actually sent — this demo simulates email delivery locally.</p>
        </div>
      )}
    </Modal>
  );
}
