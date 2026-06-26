import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  EyeOff,
  FileText,
  Layers3,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import Alert from '../components/Alert.jsx';
import { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

function FeatureRow({ icon: Icon, title, text }) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#0FFCBE] ring-1 ring-white/10">
        <Icon size={18} />
      </div>

      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-white/60">{text}</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle } = useAuth();

  const [form, setForm] = useState({
    username: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

  async function handleGoogleSuccess(credential) {
    if (!credential) {
      setMessage({ type: 'error', text: 'Google did not return a valid credential.' });
      return;
    }

    try {
      setGoogleLoading(true);
      setMessage(null);
      await loginWithGoogle(credential);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setGoogleLoading(false);
    }
  }

  const inputClass =
    'block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-[#111439] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#106EBE] focus:ring-4 focus:ring-[#106EBE]/10';

  return (
    <main className="min-h-screen bg-[#F8F8F9] font-['Inter',_ui-sans-serif,_system-ui,_sans-serif] text-[#111439]">
      <div className="grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="hidden bg-[#111439] px-10 py-10 lg:flex">
          <div className="flex w-full flex-col justify-start rounded-[2rem] border border-white/10 bg-[#151943] p-10 pt-16">
            <div>
              <h2 className="max-w-xl text-5xl font-semibold tracking-tight text-white">
                Build a better application system.
              </h2>

              <p className="mt-5 max-w-md text-base leading-7 text-white/60">
                Upload resumes, analyze job descriptions, improve match quality, and keep your job search organized in one workspace.
              </p>

              <div className="mt-10 grid gap-5">
                <FeatureRow
                  icon={FileText}
                  title="ATS-ready resume workflow"
                  text="Scan your resume against job descriptions and find practical gaps."
                />

                <FeatureRow
                  icon={Layers3}
                  title="Tailored application materials"
                  text="Generate role-focused resumes and cover letters that stay truthful."
                />

                <FeatureRow
                  icon={ShieldCheck}
                  title="Private career workspace"
                  text="Your dashboards, reports, and applications stay connected to your account."
                />
              </div>

              <div className="mt-12 grid grid-cols-3 gap-3">
                {[
                  ['ATS', 'Match scan'],
                  ['AI', 'Guidance'],
                  ['Jobs', 'Tracker'],
                ].map(([title, label]) => (
                  <div key={title} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                    <p className="text-lg font-semibold text-white">{title}</p>
                    <p className="mt-1 text-xs text-white/50">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section className="flex items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-[560px]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
              <div className="mb-7">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#106EBE]/10 px-3 py-1.5 text-xs font-semibold text-[#106EBE]">
                  <ShieldCheck size={14} />
                  Secure sign in
                </span>

                <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[#111439] sm:text-4xl">
                  Welcome back
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Sign in to continue improving your resume, tracking jobs, and preparing stronger applications.
                </p>
              </div>

              {message && (
                <div className="mb-5">
                  <Alert type={message.type} onClose={() => setMessage(null)}>
                    {message.text}
                  </Alert>
                </div>
              )}

              <div className="mb-5">
                <GoogleLogin
                  onSuccess={(credentialResponse) => handleGoogleSuccess(credentialResponse.credential)}
                  onError={() => setMessage({ type: 'error', text: 'Google login was cancelled or failed.' })}
                  text="continue_with"
                  shape="pill"
                  size="large"
                  width="100%"
                  useOneTap={false}
                />

                {googleLoading && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
                    <Loader2 size={14} className="animate-spin" />
                    Signing in with Google...
                  </div>
                )}
              </div>

              <div className="mb-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  or sign in with email
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-700">
                    Email or username
                  </label>

                  <div className="relative">
                    <UserRound
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />

                    <input
                      value={form.username}
                      onChange={(event) => updateField('username', event.target.value)}
                      className={`${inputClass} pl-11`}
                      placeholder="you@example.com"
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      Password
                    </label>

                    <span className="text-xs text-slate-400">
                      Minimum 8 characters
                    </span>
                  </div>

                  <div className="relative">
                    <LockKeyhole
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />

                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(event) => updateField('password', event.target.value)}
                      className={`${inputClass} px-11`}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#111439]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111439] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#111439]/20 transition hover:-translate-y-0.5 hover:bg-[#1f244f] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                  Sign in
                </button>
              </form>

              <p className="mt-7 text-center text-sm text-slate-500">
                New to CareerLens?{' '}
                <Link to="/signup" className="font-semibold text-[#106EBE] transition hover:text-[#0b5797]">
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}