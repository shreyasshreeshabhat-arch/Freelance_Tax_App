import { useEffect, useState } from 'react';
import { Landmark, Lock, ShieldCheck } from 'lucide-react';
import { Alert, Badge, Modal, Spinner } from '../ui';
import { useData } from '../../context/DataContext';
import { BANK_SCENARIOS, VALID_BANK_TOKEN } from '../../data/mockData';

export default function BankConnectModal() {
  const { ui, patchUi, providers, connectBank, bank, disconnectBank } = useData();
  const open = ui.bankOpen;
  const [provider, setProvider] = useState(providers[0].id);
  const [token, setToken] = useState(VALID_BANK_TOKEN);
  const [state, setState] = useState({ status: 'idle', message: '' });

  useEffect(() => {
    if (open) setState({ status: 'idle', message: '' });
  }, [open]);

  const close = () => state.status !== 'busy' && patchUi({ bankOpen: false });

  const authorize = async () => {
    setState({ status: 'busy', message: '' });
    const res = await connectBank({ provider, token });
    setState({ status: res.ok ? 'success' : 'error', message: res.message });
  };

  const busy = state.status === 'busy';

  return (
    <Modal
      open={open}
      onClose={close}
      title="Connect your bank (Open Banking)"
      icon={Landmark}
      footer={
        state.status === 'success' ? (
          <button type="button" className="btn btn-primary" onClick={() => patchUi({ bankOpen: false })}>
            Done
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-secondary" onClick={close} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={authorize} disabled={busy}>
              {busy ? <Spinner /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
              {busy ? `Contacting ${provider}…` : 'Authorize read-only access'}
            </button>
          </>
        )
      }
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-lg bg-teal-50 p-3 text-sm text-teal-900">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Read-only OAuth 2.0 — you approve access on your bank's own consent screen. This app{' '}
            <strong>never asks for or stores your bank password</strong>.
          </p>
        </div>

        {bank.connected && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm">
            <span>
              Currently connected via <strong>{bank.provider}</strong> <span className="font-mono text-xs text-slate-500">({bank.tokenMasked})</span>
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={disconnectBank}>
              Disconnect
            </button>
          </div>
        )}

        <fieldset disabled={busy}>
          <legend className="label">1 · Aggregator</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {providers.map((p) => (
              <label
                key={p.id}
                className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${
                  provider === p.id ? 'border-brand bg-brand-soft ring-1 ring-brand' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input type="radio" name="provider" value={p.id} checked={provider === p.id} onChange={() => setProvider(p.id)} className="sr-only" />
                <span className="block font-semibold text-slate-900">{p.id}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{p.blurb}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset disabled={busy}>
          <legend className="label">2 · Test scenario (sandbox token)</legend>
          <div className="space-y-2">
            {BANK_SCENARIOS.map((s) => (
              <label
                key={s.token}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                  token === s.token ? 'border-brand bg-brand-soft ring-1 ring-brand' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input type="radio" name="scenario" value={s.token} checked={token === s.token} onChange={() => setToken(s.token)} className="mt-1 accent-teal-700" />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                    {s.label}
                    <Badge tone={s.token === VALID_BANK_TOKEN ? 'green' : 'red'}>{s.token === VALID_BANK_TOKEN ? 'success path' : 'failure path'}</Badge>
                  </span>
                  <code className="mt-1 block break-all font-mono text-xs text-slate-600">{s.token}</code>
                  <span className="block text-xs text-slate-500">{s.detail}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {state.status === 'success' && <Alert kind="success">{state.message}</Alert>}
        {state.status === 'error' && <Alert kind="error">{state.message}</Alert>}
      </div>
    </Modal>
  );
}
