import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  BarChart3,
  ClipboardList,
  FileText,
  Gauge,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  X,
  MailCheck,
  BrainCircuit,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/resumes', label: 'Resumes', icon: FileText },
  { to: '/ats', label: 'ATS', icon: Gauge },
  { to: '/tailor-resume', label: 'Tailor', icon: WandSparkles },
  { to: '/cover-letter', label: 'Cover Letter', icon: MailCheck },
  { to: '/jobs', label: 'Jobs', icon: Search },
  { to: '/applications', label: 'Applications', icon: ClipboardList },
  { to: '/interview-prep', label: 'Interview', icon: BrainCircuit },
];

const ADMIN_NAV_ITEM = { to: '/admin', label: 'Admin', icon: ShieldCheck };

function navClass({ isActive }) {
  return [
    'group inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition-all duration-300',
    isActive
      ? 'bg-gradient-to-tr from-[#106EBE] to-[#0FFCBE] text-white shadow-lg shadow-[#106EBE]/20'
      : 'text-[#111439]/60 hover:bg-white hover:text-[#111439] hover:shadow-sm',
  ].join(' ');
}

function mobileNavClass({ isActive }) {
  return [
    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition-all',
    isActive
      ? 'bg-gradient-to-tr from-[#106EBE] to-[#0FFCBE] text-white shadow-lg shadow-[#106EBE]/20'
      : 'bg-white/70 text-[#111439]/70 ring-1 ring-[#111439]/5 hover:bg-white hover:text-[#111439]',
  ].join(' ');
}

function Logo({ compact = false }) {
  return (
    <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#106EBE] to-[#0FFCBE] shadow-lg shadow-[#106EBE]/20">
        <div className="absolute inset-0 rounded-2xl bg-white/15" />
        <div className="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-white">
          <div className="h-1.5 w-1.5 rounded-full bg-white" />
        </div>
      </div>
      <div className="min-w-0">
        <span className="block truncate text-xl font-extrabold tracking-tight text-[#111439]">
          Career<span className="bg-gradient-to-r from-[#106EBE] to-[#0FFCBE] bg-clip-text text-transparent">Lens</span>
        </span>
        {!compact && (
          <p className="truncate text-[10px] font-black uppercase tracking-[0.28em] text-[#111439]/40">
            Intelligence Suite
          </p>
        )}
      </div>
    </Link>
  );
}

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const isAdmin = Boolean(
    user?.is_staff ||
    user?.is_admin ||
    user?.role === 'admin'
  );

  const visibleNavItems = isAdmin
    ? [...NAV_ITEMS, ADMIN_NAV_ITEM]
    : NAV_ITEMS;

  const activeItem = visibleNavItems.find((item) =>
    location.pathname.startsWith(item.to)
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F6F8FC] selection:bg-[#0FFCBE]/30 font-['Inter',_ui-sans-serif,_system-ui,_sans-serif]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[#106EBE]/10 blur-3xl" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-[#0FFCBE]/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-[#111439]/5 bg-white/82 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/72">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Logo />

          <nav className="hidden max-w-full items-center gap-1 rounded-[1.45rem] bg-[#111439]/5 p-1.5 lg:flex">
            {visibleNavItems.map(({ to, label, icon: Icon }) => (
             <NavLink key={to} to={to} className={navClass}>
               <Icon size={16} />
               {label}
             </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#111439] text-white shadow-lg shadow-[#111439]/20 transition hover:-translate-y-0.5 lg:hidden"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div className="border-t border-[#111439]/5 px-4 py-2 sm:px-6 lg:hidden">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#111439]/5 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2 text-xs font-black uppercase tracking-wide text-[#111439]/45">
              <Sparkles size={14} />
              Current workspace
            </div>
            <span className="truncate text-sm font-black text-[#111439]">
              {activeItem?.label || 'CareerLens'}
            </span>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-[#111439]/5 bg-white/95 px-4 pb-4 pt-3 shadow-2xl shadow-[#111439]/10 backdrop-blur-2xl lg:hidden">
            <nav className="grid gap-2 sm:grid-cols-2">
              {visibleNavItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={mobileNavClass}
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
    </div>
  );
}
