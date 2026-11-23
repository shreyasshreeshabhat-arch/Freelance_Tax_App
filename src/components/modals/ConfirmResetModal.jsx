import { RotateCcw } from 'lucide-react';
import { Modal } from '../ui';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

/** `full` (login screen) also wipes registered users and the session. */
export default function ConfirmResetModal() {
  const { ui, patchUi, resetDemoData } = useData();
  const { session } = useAuth();
  const full = !session;
  const close = () => patchUi({ resetOpen: false });

  const confirm = async () => {
    close();
    await resetDemoData({ full });
  };

  return (
    <Modal
      open={ui.resetOpen}
      onClose={close}
      title="Reset demo data?"
      icon={RotateCcw}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={close}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={confirm}>
            Reset everything
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        This restores the seeded ledger ($69,700 gross / $11,200 deductions), the three sample invoices, the default 3/7/14-day escalation workflow, notifications
        and the audit log.
        {full
          ? ' Because you are signed out, registered accounts and any stored session are removed too — only the demo account remains.'
          : ' Your login session and registered accounts are kept.'}
      </p>
    </Modal>
  );
}
