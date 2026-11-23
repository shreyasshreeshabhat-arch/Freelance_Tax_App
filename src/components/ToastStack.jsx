import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { useSystem } from '../context/SystemContext';

const STYLES = {
  success: { Icon: CircleCheck, bar: 'bg-emerald-500', icon: 'text-emerald-600' },
  error: { Icon: CircleAlert, bar: 'bg-red-500', icon: 'text-red-600' },
  warning: { Icon: TriangleAlert, bar: 'bg-amber-500', icon: 'text-amber-600' },
  info: { Icon: Info, bar: 'bg-sky-500', icon: 'text-sky-600' },
};

export default function ToastStack() {
  const { toasts, dismissToast } = useSystem();
  return (
    <div
      className="no-print pointer-events-none fixed inset-x-3 bottom-14 z-[70] flex flex-col items-end gap-2 sm:left-auto sm:right-4 sm:w-[22rem]"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const { Icon, bar, icon } = STYLES[t.kind] ?? STYLES.info;
        return (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto relative flex w-full animate-toast-in items-start gap-3 overflow-hidden rounded-lg border border-slate-200 bg-white py-3 pl-5 pr-3 shadow-lg"
          >
            <span className={`absolute inset-y-0 left-0 w-1.5 ${bar}`} aria-hidden="true" />
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${icon}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-semibold text-slate-900">{t.title}</p>
              {t.message && <p className="mt-0.5 break-words text-xs text-slate-600">{t.message}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
