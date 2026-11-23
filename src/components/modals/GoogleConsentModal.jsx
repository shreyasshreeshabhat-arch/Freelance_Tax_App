import { useState } from 'react';
import { Check } from 'lucide-react';
import { Modal, Spinner } from '../ui';
import { GOOGLE_ACCOUNT } from '../../data/mockData';
import { useSystem } from '../../context/SystemContext';

/** Simulated OAuth 2.0 consent screen — no real Google endpoints are contacted. */
export default function GoogleConsentModal({ open, onClose, onAllow }) {
  const { log } = useSystem();
  const [busy, setBusy] = useState(false);

  const cancel = () => {
    if (busy) return;
    log('OAUTH', 'Google OAuth 2.0: user cancelled the consent screen.', 'warn');
    onClose();
  };

  const allow = async () => {
    setBusy(true);
    try {
      await onAllow();
    } finally {
      setBusy(false);
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={cancel}
      title="Sign in with Google (simulated)"
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={cancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={allow} disabled={busy}>
            {busy ? <Spinner /> : <Check className="h-4 w-4" aria-hidden="true" />}
            Allow
          </button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-white">AM</span>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">{GOOGLE_ACCOUNT.name}</p>
            <p className="truncate text-xs text-slate-500">{GOOGLE_ACCOUNT.email}</p>
          </div>
        </div>
        <div>
          <p className="mb-1.5 font-semibold text-slate-800">Freelance Tax &amp; Invoice Chaser wants to:</p>
          <ul className="list-inside list-disc space-y-1 text-slate-600">
            <li>See your name and profile picture</li>
            <li>See your primary email address</li>
          </ul>
        </div>
        <p className="text-xs text-slate-500">OAuth 2.0 authorization-code flow, simulated in your browser. No data leaves this page.</p>
      </div>
    </Modal>
  );
}
