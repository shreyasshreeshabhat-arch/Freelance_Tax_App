import { Calculator, Mail, RotateCcw, ShieldCheck, TrendingUp } from 'lucide-react';
import { useData } from '../../context/DataContext';

const POINTS = [
  { Icon: Calculator, text: 'Live quarterly tax estimates for US, UK and India' },
  { Icon: Mail, text: 'Automated, escalating overdue-invoice reminders' },
  { Icon: ShieldCheck, text: 'Read-only open-banking sync — no bank passwords, ever' },
];

export default function AuthShell({ title, subtitle, children, footer }) {
  const { patchUi } = useData();
  return (
    <div className="no-print grid min-h-[calc(100vh-3rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between bg-nav p-10 text-white lg:flex">
        <div className="flex items-center gap-2.5 text-lg font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </span>
          Freelance Tax &amp; Invoice Chaser
        </div>
        <div>
          <h2 className="text-3xl font-bold leading-tight">Know what you owe.<br />Get paid on time.</h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map(({ Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-slate-300">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4 text-teal-300" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-500">Academic demo · all data lives in your browser's localStorage.</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-2 font-bold text-slate-900 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
            </span>
            Tax &amp; Invoice Chaser
          </div>
          <div className="card p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
          <div className="mt-5 text-center text-sm text-slate-600">{footer}</div>
          <div className="mt-4 text-center">
            <button type="button" onClick={() => patchUi({ resetOpen: true })} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800">
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              Reset Demo Data
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.9-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.7-4.1-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
