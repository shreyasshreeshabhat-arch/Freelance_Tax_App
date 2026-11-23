import NavBar from './NavBar';
import PrintSheet from './PrintSheet';
import BankConnectModal from './modals/BankConnectModal';
import EmailPreviewModal from './modals/EmailPreviewModal';
import AddInvoiceModal from './modals/AddInvoiceModal';

/** Frame for every authenticated page. */
export default function AppShell({ children }) {
  return (
    <>
      <div className="no-print">
        <NavBar />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-8">{children}</main>
        <BankConnectModal />
        <EmailPreviewModal />
        <AddInvoiceModal />
      </div>
      <PrintSheet />
    </>
  );
}
