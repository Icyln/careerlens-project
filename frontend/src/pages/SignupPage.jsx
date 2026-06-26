import { useMemo, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Layers3,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserPlus,
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

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup, loginWithGoogle } = useAuth();

  const [form, setForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
  });

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [message, setMessage] = useState(null);

  const passwordChecks = useMemo(() => {
    const password = form.password || '';

    return [
      {
        label: 'At least 8 characters',
        ok: password.length >= 8,
      },
      {
        label: 'Passwords match',
        ok: Boolean(password && form.password_confirm && password === form.password_confirm),
      },
    ];
  }, [form.password, form.password_confirm]);

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

  async function handleGoogleSuccess(credential) {
    if (!credential) {
      setMessage({ type: 'error', text: 'Google did not return a valid credential.' });
      return;
    }

    try {
      setGoogleLoading(true);
      setMessage(null);
      await loginWithGoogle(credential);
      navigate('/dashboard', { replace: true });
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
                  <UserPlus size={14} />
                  Create account
                </span>

                <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[#111439] sm:text-4xl">
                  Start your CareerLens workspace
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Create your account for resume analysis, job tracking, cover letters, and interview preparation.
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
                  onError={() => setMessage({ type: 'error', text: 'Google sign up was cancelled or failed.' })}
                  text="signup_with"
                  shape="pill"
                  size="large"
                  width="100%"
                  useOneTap={false}
                />

                {googleLoading && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
                    <Loader2 size={14} className="animate-spin" />
                    Creating your Google session...
                  </div>
                )}
              </div>

              <div className="mb-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  or sign up with email
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-700">
                    First name
                  </label>

                  <input
                    value={form.first_name}
                    onChange={(event) => updateField('first_name', event.target.value)}
                    className={inputClass}
                    placeholder="Myat"
                    autoComplete="given-name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-700">
                    Last name
                  </label>

                  <input
                    value={form.last_name}
                    onChange={(event) => updateField('last_name', event.target.value)}
                    className={inputClass}
                    placeholder="Htun"
                    autoComplete="family-name"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold text-slate-700">
                    Email address
                  </label>

                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />

                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => updateField('email', event.target.value)}
                      className={`${inputClass} pl-11`}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold text-slate-700">
                    Username
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
                      placeholder="Choose a username"
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-700">
                    Password
                  </label>

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
                      placeholder="Minimum 8 characters"
                      autoComplete="new-password"
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

                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-700">
                    Confirm password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />

                    <input
                      type={showPasswordConfirm ? 'text' : 'password'}
                      value={form.password_confirm}
                      onChange={(event) => updateField('password_confirm', event.target.value)}
                      className={`${inputClass} px-11`}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      required
                    />

                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm((current) => !current)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#111439]"
                      aria-label={showPasswordConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showPasswordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <div className="grid gap-2 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
                    {passwordChecks.map((check) => (
                      <div
                        key={check.label}
                        className={`flex items-center gap-2 text-xs font-semibold ${
                          check.ok ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        <CheckCircle2 size={15} />
                        {check.label}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111439] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#111439]/20 transition hover:-translate-y-0.5 hover:bg-[#1f244f] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:col-span-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                  Create account
                </button>
              </form>

              <p className="mt-7 text-center text-sm text-slate-500">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-[#106EBE] transition hover:text-[#0b5797]">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}