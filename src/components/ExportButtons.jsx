import { FileDown, Printer } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function ExportButtons({ size = 'md' }) {
  const { exportCsv, exportPdf } = useData();
  const cls = size === 'sm' ? 'btn btn-secondary btn-sm' : 'btn btn-secondary';
  return (
    <>
      <button type="button" onClick={exportCsv} className={cls}>
        <FileDown className="h-4 w-4" aria-hidden="true" />
        Export Tax CSV
      </button>
      <button type="button" onClick={exportPdf} className={cls}>
        <Printer className="h-4 w-4" aria-hidden="true" />
        Export PDF
      </button>
    </>
  );
}
