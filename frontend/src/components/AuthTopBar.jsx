import { Link, useNavigate } from 'react-router-dom';
import { LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

function getDisplayName(user) {
  if (!user) return 'User';
  return user.username || user.email || 'User';
}

export default function AuthTopBar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="mb-5 rounded-[1.75rem] border border-white/70 bg-white/85 p-3 shadow-sm shadow-slate-950/5 ring-1 ring-slate-200/70 backdrop-blur-xl sm:mb-6 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/profile"
          className="group flex min-w-0 items-center gap-3 rounded-2xl px-2 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
        >
          <span className="shrink-0 rounded-2xl bg-gradient-to-tr from-blue-50 to-cyan-50 p-2 text-blue-700 ring-1 ring-blue-100">
            <UserCircle size={22} />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              Signed in as
            </span>
            <span className="block truncate text-slate-950 group-hover:text-blue-700">
              {getDisplayName(user)}
            </span>
          </span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-slate-800 sm:w-auto"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );
}
