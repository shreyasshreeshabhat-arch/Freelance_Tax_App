import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Terminal, Trash2 } from 'lucide-react';
import { useSystem } from '../context/SystemContext';
import { KEYS, readJSON, writeJSON } from '../utils/storage';
import { formatDateTime, formatTime } from '../utils/format';

const TYPE_COLOR = {
  AUTH: 'text-sky-300',
  OAUTH: 'text-violet-300',
  SYNC: 'text-cyan-300',
  'AUTO-TAG': 'text-teal-300',
  EMAIL: 'text-indigo-300',
  INVOICE: 'text-blue-300',
  TAX: 'text-lime-300',
  VALIDATION: 'text-rose-300',
  SECURITY: 'text-red-300',
  EXPORT: 'text-fuchsia-300',
  SYSTEM: 'text-slate-300',
};

const LEVEL_TEXT = {
  error: 'text-red-300',
  warn: 'text-amber-300',
  success: 'text-emerald-300',
  info: 'text-slate-200',
};

export default function AuditLogPanel() {
  const { auditLog, clearLog } = useSystem();
  const [open, setOpen] = useState(() => readJSON(KEYS.ui, {}).logOpen === true);

  useEffect(() => {
    writeJSON(KEYS.ui, { ...readJSON(KEYS.ui, {}), logOpen: open });
  }, [open]);

  const latest = auditLog[0];

  return (
    <section
      className="no-print sticky bottom-0 z-30 border-t border-slate-700 bg-slate-900 text-slate-200 shadow-[0_-4px_12px_rgba(15,23,42,0.25)]"
      aria-label="Live System and Audit Log"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left"
          aria-expanded={open}
          aria-controls="audit-log-body"
        >
          <Terminal className="h-4 w-4 shrink-0 text-teal-400" aria-hidden="true" />
          <span className="shrink-0 text-sm font-semibold text-white">Live System &amp; Audit Log</span>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Live
          </span>
          <span className="shrink-0 text-xs text-slate-400">{auditLog.length} event{auditLog.length === 1 ? '' : 's'}</span>
          {!open && latest && (
            <span className="hidden min-w-0 flex-1 truncate font-mono text-xs text-slate-400 md:block">
              {formatTime(latest.ts)} · {latest.type} · {latest.message}
            </span>
          )}
          <span className="ml-auto shrink-0 text-slate-400">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </span>
        </button>
        {open && (
          <button type="button" onClick={clearLog} className="btn btn-sm shrink-0 bg-white/10 text-slate-200 hover:bg-white/20" disabled={!auditLog.length}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>

      {open && (
        <div id="audit-log-body" className="border-t border-slate-800">
          <ol className="mx-auto max-h-[38vh] max-w-7xl overflow-y-auto px-4 py-2 font-mono text-xs leading-relaxed" reversed>
            {auditLog.length === 0 && <li className="py-6 text-center text-slate-500">No events yet — perform an action to see it logged here.</li>}
            {auditLog.map((e) => (
              <li key={e.id} className="flex flex-col gap-0.5 border-b border-slate-800/70 py-1.5 last:border-0 sm:flex-row sm:gap-3">
                <span className="shrink-0 text-slate-500" title={formatDateTime(e.ts)}>
                  {formatTime(e.ts)}
                </span>
                <span className={`w-20 shrink-0 font-bold ${TYPE_COLOR[e.type] ?? 'text-slate-300'}`}>{e.type}</span>
                <span className={`min-w-0 flex-1 break-words ${LEVEL_TEXT[e.level] ?? LEVEL_TEXT.info}`}>
                  {e.level === 'error' && <span className="mr-1 rounded bg-red-500/20 px-1 text-[10px] font-bold text-red-300">ERROR</span>}
                  {e.level === 'warn' && <span className="mr-1 rounded bg-amber-500/20 px-1 text-[10px] font-bold text-amber-300">WARN</span>}
                  {e.message}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
