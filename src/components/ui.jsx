import { useEffect, useRef } from 'react';
import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert, X } from 'lucide-react';

const BADGE_TONES = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  teal: 'bg-teal-50 text-teal-800 ring-teal-200',
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-300',
  orange: 'bg-orange-50 text-orange-800 ring-orange-300',
  red: 'bg-red-50 text-red-800 ring-red-200',
  rose: 'bg-rose-100 text-rose-900 ring-rose-300',
  blue: 'bg-sky-50 text-sky-800 ring-sky-200',
  violet: 'bg-violet-50 text-violet-800 ring-violet-200',
};

export function Badge({ tone = 'slate', className = '', children, title }) {
  return (
    <span
      title={title}
      className={`inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${BADGE_TONES[tone] ?? BADGE_TONES.slate} ${className}`}
    >
      {children}
    </span>
  );
}

const ALERT_STYLES = {
  error: { box: 'border-red-200 bg-red-50 text-red-800', Icon: CircleAlert },
  success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-800', Icon: CircleCheck },
  warning: { box: 'border-amber-300 bg-amber-50 text-amber-900', Icon: TriangleAlert },
  info: { box: 'border-sky-200 bg-sky-50 text-sky-800', Icon: Info },
};

export function Alert({ kind = 'info', children, className = '', ...rest }) {
  const { box, Icon } = ALERT_STYLES[kind] ?? ALERT_STYLES.info;
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm ${box} ${className}`}
      {...rest}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 break-words font-medium">{children}</div>
    </div>
  );
}

export function Spinner({ className = 'h-4 w-4' }) {
  return <LoaderCircle className={`animate-spin ${className}`} aria-hidden="true" />;
}

export function Modal({ open, onClose, title, icon: Icon, children, footer, size = 'md' }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  // Runs only when the dialog opens/closes — NOT on every parent re-render,
  // otherwise focus would be yanked from inputs while the user types.
  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && closeRef.current?.();
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!open) return null;
  const width = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }[size];
  return (
    <div className="no-print fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[92vh] w-full animate-fade-in flex-col rounded-t-2xl bg-white shadow-xl focus:outline-none sm:rounded-2xl ${width}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold text-slate-900">
            {Icon && <Icon className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />}
            <span className="truncate">{title}</span>
          </h2>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm !px-2" aria-label="Close dialog">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
