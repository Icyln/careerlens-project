import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, UserPlus } from 'lucide-react';
import Alert from '../components/Alert.jsx';
import { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

// Reusable icon for the decorative column
const CheckIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
  </svg>
);

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [form, setForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setLoading(true);
      setMessage(null);
      await signup(form);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#F8F8F9] text-[#111439] antialiased selection:bg-[#0FFCBE]/30 font-['CoFo_Sans',_Inter,_sans-serif]">
      
      {/* LEFT COLUMN: BRANDING (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#111439] relative overflow-hidden items-center justify-center p-12">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-[#106EBE] to-[#0FFCBE] opacity-20 blur-[120px] rounded-full mix-blend-screen pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#106EBE] opacity-30 blur-[100px] rounded-full pointer-events-none"></div>
        
        {/* Abstract Tech Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50"></div>

        <div className="relative z-10 w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2.5 group mb-12 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#106EBE] to-[#0FFCBE] flex items-center justify-center shadow-lg shadow-[#106EBE]/20 transform transition-transform group-hover:scale-105">
              <div className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            </div>
            <span className="text-3xl font-extrabold tracking-tight text-white">
              Career<span className="text-[#0FFCBE]">Lens</span>
            </span>
          </Link>

          <h2 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight mb-6 leading-[1.1]">
            Stop guessing.<br/> Start measuring.
          </h2>
          <p className="text-white/60 text-base leading-relaxed mb-12 max-w-sm">
            Uncover exactly why recruiters reject you, automatically optimize your phrasing, and dominate your job hunt.
          </p>

          {/* Floating Glassmorphism Element */}
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl transform transition-transform hover:-translate-y-2 duration-700">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-5">ATS Context Engine</p>
            <div className="flex flex-wrap gap-3">
              <span className="px-3 py-2 bg-[#0FFCBE]/20 text-[#0FFCBE] text-xs font-bold rounded-xl border border-[#0FFCBE]/30 flex items-center gap-2 shadow-sm">
                <CheckIcon /> Go-to-Market Strategy
              </span>
              <span className="px-3 py-2 bg-[#0FFCBE]/20 text-[#0FFCBE] text-xs font-bold rounded-xl border border-[#0FFCBE]/30 flex items-center gap-2 shadow-sm">
                <CheckIcon /> Agile Leadership
              </span>
              <span className="px-3 py-2 bg-white/5 text-white/40 text-xs font-bold rounded-xl border border-white/10 flex items-center gap-2 line-through decoration-red-500/50">
                Managed a team
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* RIGHT COLUMN: FORM */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 xl:px-24 relative z-10 py-12 lg:py-0">
        <div className="w-full max-w-lg mx-auto">
          
          {/* Logo (Visible on mobile, hidden on desktop since it's on left side) */}
          <Link to="/" className="lg:hidden inline-flex items-center gap-2.5 group mb-8 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#106EBE] to-[#0FFCBE] flex items-center justify-center shadow-md">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-1 h-1 bg-white rounded-full"></div>
              </div>
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-[#111439]">
              Career<span className="bg-clip-text text-transparent bg-gradient-to-r from-[#106EBE] to-[#0FFCBE]">Lens</span>
            </span>
          </Link>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111439] tracking-tight mb-2">
            Create your account
          </h1>
          <p className="text-sm text-[#111439]/60 mb-8 leading-relaxed">
            Setup takes 2 minutes. Start tailoring your resumes and tracking your applications effortlessly.
          </p>

          {message && (
            <div className="mb-6">
              <Alert type={message.type} onClose={() => setMessage(null)}>
                {message.text}
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
            
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-[#111439]/70 mb-2 pl-1">
                First Name
              </label>
              <input
                value={form.first_name}
                onChange={(event) => updateField('first_name', event.target.value)}
                className="block w-full rounded-2xl border border-[#111439]/10 bg-white px-5 py-3.5 text-sm font-medium text-[#111439] placeholder-[#111439]/30 shadow-sm focus:border-[#106EBE] focus:outline-none focus:ring-4 focus:ring-[#106EBE]/10 transition-all duration-300"
                placeholder="e.g. John"
                autoComplete="given-name"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-[#111439]/70 mb-2 pl-1">
                Last Name
              </label>
              <input
                value={form.last_name}
                onChange={(event) => updateField('last_name', event.target.value)}
                className="block w-full rounded-2xl border border-[#111439]/10 bg-white px-5 py-3.5 text-sm font-medium text-[#111439] placeholder-[#111439]/30 shadow-sm focus:border-[#106EBE] focus:outline-none focus:ring-4 focus:ring-[#106EBE]/10 transition-all duration-300"
                placeholder="e.g. Doe"
                autoComplete="family-name"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-[#111439]/70 mb-2 pl-1">
                Username
              </label>
              <input
                value={form.username}
                onChange={(event) => updateField('username', event.target.value)}
                className="block w-full rounded-2xl border border-[#111439]/10 bg-white px-5 py-3.5 text-sm font-medium text-[#111439] placeholder-[#111439]/30 shadow-sm focus:border-[#106EBE] focus:outline-none focus:ring-4 focus:ring-[#106EBE]/10 transition-all duration-300"
                placeholder="Choose a username"
                autoComplete="username"
                required
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-[#111439]/70 mb-2 pl-1">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                className="block w-full rounded-2xl border border-[#111439]/10 bg-white px-5 py-3.5 text-sm font-medium text-[#111439] placeholder-[#111439]/30 shadow-sm focus:border-[#106EBE] focus:outline-none focus:ring-4 focus:ring-[#106EBE]/10 transition-all duration-300"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-[#111439]/70 mb-2 pl-1">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                className="block w-full rounded-2xl border border-[#111439]/10 bg-white px-5 py-3.5 text-sm font-medium text-[#111439] placeholder-[#111439]/30 shadow-sm focus:border-[#106EBE] focus:outline-none focus:ring-4 focus:ring-[#106EBE]/10 transition-all duration-300"
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-[#111439]/70 mb-2 pl-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={form.password_confirm}
                onChange={(event) => updateField('password_confirm', event.target.value)}
                className="block w-full rounded-2xl border border-[#111439]/10 bg-white px-5 py-3.5 text-sm font-medium text-[#111439] placeholder-[#111439]/30 shadow-sm focus:border-[#106EBE] focus:outline-none focus:ring-4 focus:ring-[#106EBE]/10 transition-all duration-300"
                placeholder="Repeat password"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="sm:col-span-2 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="relative flex w-full justify-center items-center gap-2 rounded-2xl bg-gradient-to-r from-[#106EBE] to-[#0FFCBE] px-4 py-4 text-sm font-bold text-white shadow-xl shadow-[#106EBE]/20 hover:scale-[1.01] hover:shadow-[#106EBE]/30 transition-all duration-300 disabled:opacity-60 disabled:hover:scale-100 overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                {loading ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                <span className="relative z-10">Start Using Free</span>
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-xs font-bold text-[#111439]/60">
            Already have an account?{' '}
            <Link to="/login" className="text-[#106EBE] hover:text-[#0FFCBE] transition-colors duration-300">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}