import { useState } from 'react';
import { ArrowLeftRight, FileText, LayoutDashboard, LogOut, Menu, RotateCcw, SlidersHorizontal, TrendingUp, X } from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import NotificationBell from './NotificationBell';

const LINKS = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', Icon: ArrowLeftRight },
  { to: '/invoices', label: 'Invoices', Icon: FileText },
  { to: '/workflow', label: 'Workflow', Icon: SlidersHorizontal },
];

export default function NavBar() {
  const { path } = useRouter();
  const { session, logout } = useAuth();
  const { patchUi } = useData();
  const [menuOpen, setMenuOpen] = useState(false);

  const linkCls = (active) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      active ? 'bg-teal-700 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <header className="no-print sticky top-0 z-40 bg-nav text-white shadow-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4">
        <a href="#/dashboard" className="mr-2 flex shrink-0 items-center gap-2 font-bold" aria-label="Dashboard home">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="hidden min-[420px]:inline xl:hidden">Tax &amp; Invoice Chaser</span>
          <span className="hidden xl:inline">Freelance Tax &amp; Invoice Chaser</span>
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {LINKS.map(({ to, label, Icon }) => (
            <a key={to} href={`#${to}`} className={linkCls(path === to)} aria-current={path === to ? 'page' : undefined}>
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <NotificationBell />
          <button
            type="button"
            onClick={() => patchUi({ resetOpen: true })}
            className="hidden items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white lg:inline-flex"
            title="Reset Demo Data"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span className="hidden xl:inline">Reset Demo Data</span>
            <span className="sr-only xl:hidden">Reset Demo Data</span>
          </button>
          <div className="mx-1 hidden h-6 w-px bg-slate-700 lg:block" />
          <span className="hidden max-w-[10rem] truncate text-xs text-slate-400 xl:block" title={session?.email}>
            {session?.email}
          </span>
          <button
            type="button"
            onClick={logout}
            className="hidden items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20 lg:inline-flex"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Logout
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-slate-800 px-4 pb-4 pt-2 lg:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-1">
            {LINKS.map(({ to, label, Icon }) => (
              <a
                key={to}
                href={`#${to}`}
                onClick={() => setMenuOpen(false)}
                className={linkCls(path === to)}
                aria-current={path === to ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                patchUi({ resetOpen: true });
              }}
              className={linkCls(false)}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset Demo Data
            </button>
            <button type="button" onClick={logout} className={`${linkCls(false)} text-amber-200`}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Logout
              <span className="ml-auto max-w-[10rem] truncate text-xs text-slate-400">{session?.email}</span>
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
