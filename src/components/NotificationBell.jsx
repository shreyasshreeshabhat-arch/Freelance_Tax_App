import { useEffect, useRef, useState } from 'react';
import { Bell, CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { useSystem } from '../context/SystemContext';
import { formatDateTime } from '../utils/format';

const KIND = {
  success: { Icon: CircleCheck, cls: 'text-emerald-600 bg-emerald-50' },
  warning: { Icon: TriangleAlert, cls: 'text-amber-600 bg-amber-50' },
  error: { Icon: CircleAlert, cls: 'text-red-600 bg-red-50' },
  info: { Icon: Info, cls: 'text-sky-600 bg-sky-50' },
};

export default function NotificationBell() {
  const { notifications, markAllRead, clearNotifications } = useSystem();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    if (open && unread) markAllRead();
    setOpen((v) => !v);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-slate-900">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-2 top-14 z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <div className="flex gap-1">
              <button type="button" onClick={markAllRead} className="btn btn-ghost btn-sm" disabled={!unread}>
                Mark all read
              </button>
              <button type="button" onClick={clearNotifications} className="btn btn-ghost btn-sm" disabled={!notifications.length}>
                Clear
              </button>
            </div>
          </div>
          <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
            {notifications.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-500">You're all caught up.</li>
            )}
            {notifications.map((n) => {
              const { Icon, cls } = KIND[n.kind] ?? KIND.info;
              return (
                <li key={n.id} className={`flex gap-3 px-4 py-3 ${n.read ? '' : 'bg-teal-50/50'}`}>
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${cls}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-slate-900">{n.title}</p>
                    <p className="mt-0.5 break-words text-xs text-slate-600">{n.message}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{formatDateTime(n.ts)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
