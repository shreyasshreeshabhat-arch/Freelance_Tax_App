import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Alert, Modal } from '../ui';
import { useData } from '../../context/DataContext';

const EMPTY = { client: '', email: '', amount: '', daysOverdue: '0' };

export default function AddInvoiceModal() {
  const { ui, patchUi, addInvoice } = useData();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const close = () => {
    patchUi({ addInvoiceOpen: false });
    setForm(EMPTY);
    setError('');
  };

  const submit = (e) => {
    e.preventDefault();
    const res = addInvoice(form);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    close();
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Modal
      open={ui.addInvoiceOpen}
      onClose={close}
      title="Add test invoice"
      icon={Plus}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={close}>
            Cancel
          </button>
          <button type="submit" form="add-invoice-form" className="btn btn-primary">
            Add invoice
          </button>
        </>
      }
    >
      <form id="add-invoice-form" onSubmit={submit} className="space-y-4" noValidate>
        <p className="text-sm text-slate-600">
          Create an invoice with any age to see aging buckets (30/60/90) and escalation stages react. Try an invalid email to see the dispatcher skip it.
        </p>
        <div>
          <label className="label" htmlFor="inv-client">Client name</label>
          <input id="inv-client" className="input" value={form.client} onChange={set('client')} placeholder="Globex Corp" />
        </div>
        <div>
          <label className="label" htmlFor="inv-email">Client email</label>
          <input id="inv-email" className="input" value={form.email} onChange={set('email')} placeholder="billing@globex.com" autoComplete="off" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="inv-amount">Amount</label>
            <input id="inv-amount" className="input" inputMode="decimal" value={form.amount} onChange={set('amount')} placeholder="2400" />
          </div>
          <div>
            <label className="label" htmlFor="inv-days">Days overdue</label>
            <input id="inv-days" className="input" inputMode="numeric" value={form.daysOverdue} onChange={set('daysOverdue')} placeholder="45" />
          </div>
        </div>
        <p className="-mt-2 text-xs text-slate-500">Negative days = not yet due (e.g. -2 means due in two days).</p>
        {error && <Alert kind="error">{error}</Alert>}
      </form>
    </Modal>
  );
}
