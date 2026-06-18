import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, LogIn } from 'lucide-react';
import Alert from '../components/Alert.jsx';
import { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [form, setForm] = useState({
    username: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const redirectTo = location.state?.from?.pathname || '/dashboard';

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setLoading(true);
      setMessage(null);
      await login(form);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#F8F8F9] text-[#111439] antialiased selection:bg-[#0FFCBE]/30 font-['CoFo_Sans',_Inter,_sans-serif]">
      
      {/* LEFT COLUMN: FORM */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 xl:px-24 relative z-10 py-12 lg:py-0">
        <div className="w-full max-w-md mx-auto">
          
          {/* Logo (Visible on mobile/tablet, aligned left on desktop) */}
          <Link to="/" className="inline-flex items-center gap-2.5 group mb-10 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#106EBE] to-[#0FFCBE] flex items-center justify-center shadow-lg shadow-[#106EBE]/20 transform transition-transform group-hover:scale-105">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-1 h-1 bg-white rounded-full"></div>
              </div>
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-[#111439]">
              Career<span className="bg-clip-text text-transparent bg-gradient-to-r from-[#106EBE] to-[#0FFCBE]">Lens</span>
            </span>
          </Link>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111439] tracking-tight mb-2">
            Welcome back
          </h1>
          <p className="text-sm text-[#111439]/60 mb-8 leading-relaxed">
            Sign in to access your personalized dashboard, live ATS reports, and tailored resumes.
          </p>

          {message && (
            <div className="mb-6">
              <Alert type={message.type} onClose={() => setMessage(null)}>
                {message.text}
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-[#111439]/70 mb-2 pl-1">
                Username
              </label>
              <input
                value={form.username}
                onChange={(event) => updateField('username', event.target.value)}
                className="block w-full rounded-2xl border border-[#111439]/10 bg-white px-5 py-4 text-sm font-medium text-[#111439] placeholder-[#111439]/30 shadow-sm focus:border-[#106EBE] focus:outline-none focus:ring-4 focus:ring-[#106EBE]/10 transition-all duration-300"
                placeholder="Enter your username"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-[#111439]/70 mb-2 pl-1">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                className="block w-full rounded-2xl border border-[#111439]/10 bg-white px-5 py-4 text-sm font-medium text-[#111439] placeholder-[#111439]/30 shadow-sm focus:border-[#106EBE] focus:outline-none focus:ring-4 focus:ring-[#106EBE]/10 transition-all duration-300"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="relative flex w-full justify-center items-center gap-2 rounded-2xl bg-[#111439] px-4 py-4 text-sm font-bold text-white shadow-xl shadow-[#111439]/20 hover:bg-[#1a1f54] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:hover:translate-y-0 overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                {loading ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
                <span>Sign in securely</span>
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-xs font-bold text-[#111439]/60">
            New to CareerLens?{' '}
            <Link to="/signup" className="text-[#106EBE] hover:text-[#0FFCBE] transition-colors duration-300">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN: BRANDING (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#111439] relative overflow-hidden items-center justify-center p-12">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 -right-1/4 w-[600px] h-[600px] bg-gradient-to-br from-[#106EBE] to-[#0FFCBE] opacity-20 blur-[120px] rounded-full mix-blend-screen pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#106EBE] opacity-30 blur-[100px] rounded-full pointer-events-none"></div>
        
        {/* Abstract Tech Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50"></div>

        <div className="relative z-10 w-full max-w-md">
          <h2 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight mb-6 leading-[1.1]">
            Command your <br/> career trajectory.
          </h2>
          <p className="text-white/60 text-base leading-relaxed mb-12 max-w-sm">
            Join thousands of high-performing candidates who treat their job search like an exact data-driven science.
          </p>

          {/* Floating Glassmorphism Element */}
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl transform transition-transform hover:-translate-y-2 duration-700">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-6 flex justify-between items-center">
              <span>Live Resume Scan</span>
              <span className="w-2 h-2 rounded-full bg-[#0FFCBE] animate-pulse"></span>
            </p>
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-white/10" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-[#0FFCBE] transition-all duration-1000 ease-out" strokeDasharray="92, 100" strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute text-3xl font-extrabold text-white">92</div>
              </div>
              <div>
                <span className="block text-xl font-bold text-white mb-1">Excellent Match</span>
                <span className="block text-xs font-bold bg-[#0FFCBE]/20 text-[#0FFCBE] px-2 py-1 rounded inline-flex border border-[#0FFCBE]/30">Top 8% Candidate</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}