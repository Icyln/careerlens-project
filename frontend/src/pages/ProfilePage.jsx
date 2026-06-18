import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AtSign,
  BadgeCheck,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  Pencil,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  UserCircle,
  X,
} from 'lucide-react';
import { getErrorMessage, updateProfile } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

function getUsername(user) {
  return user?.username || user?.email || 'User';
}

function getFullName(user) {
  return [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
}

function getInitials(user) {
  const fullName = getFullName(user);

  if (fullName) {
    return fullName
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  return getUsername(user).charAt(0).toUpperCase();
}

function formatDate(value) {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Not available';

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  });
}

function getProfileCompletion(user) {
  const fields = [
    user?.username,
    user?.email,
    user?.first_name,
    user?.last_name,
  ];

  const completed = fields.filter(Boolean).length;

  return Math.round((completed / fields.length) * 100);
}

function createFormState(user) {
  return {
    username: user?.username || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
  };
}

function StatusPill({ children, tone = 'light' }) {
  const toneClasses = {
    light: 'bg-white text-[#111439] ring-white/70 shadow-sm',
    blue: 'bg-[#106EBE]/10 text-[#106EBE] ring-[#106EBE]/15',
    green: 'bg-[#0FFCBE]/25 text-[#0A6F5A] ring-[#0D9476]/20',
    dark: 'bg-[#111439] text-white ring-[#111439]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ring-1 ${
        toneClasses[tone] || toneClasses.light
      }`}
    >
      {children}
    </span>
  );
}

function InfoCard({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-2xl border border-[#111439]/5 bg-white/80 p-5 shadow-sm backdrop-blur-md">
      <div className="mb-3 flex items-center gap-2 text-[#106EBE]">
        <Icon size={17} />
        <p className="text-[10px] font-black uppercase tracking-widest text-[#111439]/45">
          {label}
        </p>
      </div>

      <p className="break-words text-sm font-black text-[#111439] sm:text-base">
        {value || 'Not provided'}
      </p>

      {helper && (
        <p className="mt-1 text-xs font-semibold leading-5 text-[#111439]/50">
          {helper}
        </p>
      )}
    </div>
  );
}

function FormInput({ label, name, value, onChange, type = 'text', disabled = false }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[#111439]/45">
        {label}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.name, event.target.value)}
        className="w-full rounded-2xl border border-[#111439]/10 bg-white px-4 py-3 text-sm font-bold text-[#111439] outline-none transition-all placeholder:text-[#111439]/30 focus:border-[#106EBE] focus:ring-4 focus:ring-[#106EBE]/10 disabled:cursor-not-allowed disabled:bg-[#F8F8F9] disabled:text-[#111439]/45"
      />
    </label>
  );
}

function QuickAction({ to, icon: Icon, title, text }) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-[#111439]/5 bg-white/80 p-5 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[#106EBE]/20 hover:shadow-md"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="rounded-xl bg-[#106EBE]/10 p-2.5 text-[#106EBE]">
          <Icon size={18} />
        </div>

        <ChevronRight
          size={16}
          className="text-[#111439]/30 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#106EBE]"
        />
      </div>

      <h3 className="text-sm font-black text-[#111439]">{title}</h3>
      <p className="mt-1 text-xs font-semibold leading-5 text-[#111439]/50">
        {text}
      </p>
    </Link>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuth();

  const [profile, setProfile] = useState(user || {});
  const [form, setForm] = useState(createFormState(user || {}));
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (user) {
      setProfile(user);
      setForm(createFormState(user));
    }
  }, [user]);

  const activeUser = profile || user || {};
  const username = getUsername(activeUser);
  const fullName = getFullName(activeUser);
  const initials = getInitials(activeUser);
  const isAdmin = activeUser?.role === 'admin' || activeUser?.is_staff;
  const roleLabel = isAdmin ? 'Admin' : 'Normal user';
  const profileCompletion = getProfileCompletion(activeUser);

  const hasChanges = useMemo(() => {
    const current = createFormState(activeUser);

    return (
      form.username.trim() !== current.username ||
      form.first_name.trim() !== current.first_name ||
      form.last_name.trim() !== current.last_name ||
      form.email.trim() !== current.email
    );
  }, [form, activeUser]);

  function handleFormChange(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function startEditing() {
    setForm(createFormState(activeUser));
    setMessage(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setForm(createFormState(activeUser));
    setMessage(null);
    setIsEditing(false);
  }

  async function handleSave(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage(null);

      const payload = {
        username: form.username.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
      };

      const updatedProfile = await updateProfile(payload);

      setProfile(updatedProfile);
      setForm(createFormState(updatedProfile));

      if (typeof setUser === 'function') {
        setUser(updatedProfile);
      }

      setIsEditing(false);
      setMessage({
        type: 'success',
        text: 'Profile updated successfully.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: getErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="relative z-0 min-h-screen pb-12 font-['CoFo_Sans',_Inter,_sans-serif] text-[#111439] selection:bg-[#0FFCBE]/30">
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[520px] w-full max-w-[860px] -translate-x-1/2 rounded-full bg-gradient-to-br from-[#106EBE]/10 to-[#0FFCBE]/10 blur-[120px]" />

      <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/75 shadow-xl shadow-[#111439]/5 backdrop-blur-2xl">
        <div className="relative border-b border-white/10 bg-gradient-to-br from-[#111439] via-[#13215C] to-[#106EBE] p-7 text-white sm:p-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#0FFCBE]/25 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/2 h-32 w-80 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-[#111439] shadow-sm">
                <Sparkles size={14} className="text-[#106EBE]" />
                CareerLens Profile
              </div>

              <h1 className="max-w-3xl text-2xl font-black tracking-tight sm:text-4xl">
                Your career workspace identity
              </h1>

              <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-white/80 sm:text-base">
                Manage your account identity, access role, profile details, and quick routes across your CareerLens workflow.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <StatusPill tone="light">
                <BadgeCheck size={14} className="text-[#0D9476]" />
                Active account
              </StatusPill>

              <StatusPill tone="light">
                <ShieldCheck size={14} className="text-[#106EBE]" />
                {roleLabel}
              </StatusPill>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
          <div className="rounded-[1.75rem] border border-[#111439]/5 bg-[#F8F8F9]/90 p-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-[2rem] bg-gradient-to-tr from-[#106EBE] to-[#0FFCBE] text-3xl font-black text-white shadow-xl shadow-[#106EBE]/20">
                {initials}
                <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-[#F8F8F9] bg-[#0FFCBE] text-[#111439]">
                  <ShieldCheck size={15} />
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-widest text-[#106EBE]">
                  Signed in as
                </p>

                <h2 className="mt-1 break-words text-3xl font-black text-[#111439]">
                  {username}
                </h2>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {fullName && (
                    <StatusPill tone="green">
                      <UserCircle size={14} />
                      {fullName}
                    </StatusPill>
                  )}

                  <StatusPill tone="blue">
                    <LockKeyhole size={14} />
                    Protected session
                  </StatusPill>
                </div>
              </div>
            </div>

            <div className="mt-7">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-widest text-[#111439]/45">
                  Profile completeness
                </p>
                <p className="text-xs font-black text-[#106EBE]">
                  {profileCompletion}%
                </p>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-[#111439]/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#106EBE] to-[#0FFCBE]"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>

              <p className="mt-2 text-xs font-semibold leading-5 text-[#111439]/50">
                Complete name and email details help personalize your reports, dashboard, and exported career materials.
              </p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[#111439]/5 bg-white/90 p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#0FFCBE]/25 p-3 text-[#0A6F5A]">
                  <ShieldCheck size={22} />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-[#111439]/45">
                    Account access
                  </p>
                  <h3 className="text-xl font-black text-[#111439]">{roleLabel}</h3>
                </div>
              </div>

              {!isEditing && (
                <button
                  type="button"
                  onClick={startEditing}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#106EBE]/20 bg-[#106EBE]/10 px-3 py-2 text-xs font-black text-[#106EBE] transition-colors hover:bg-[#106EBE] hover:text-white"
                >
                  <Pencil size={14} />
                  Edit
                </button>
              )}
            </div>

            <p className="text-sm font-semibold leading-7 text-[#111439]/60">
              {isAdmin
                ? 'Admin access is enabled. You can manage elevated platform workflows as admin tools are added.'
                : 'Your account can manage its own resumes, ATS reports, job search activity, tailored resumes, and tracked applications.'}
            </p>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111439] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#111439]/15 transition-colors hover:bg-[#1a1f54]"
            >
              <LogOut size={17} />
              Sign out securely
            </button>
          </div>
        </div>
      </section>

      {message && (
        <div
          className={`mt-6 rounded-2xl border p-4 text-sm font-bold ${
            message.type === 'success'
              ? 'border-[#0D9476]/20 bg-[#0FFCBE]/15 text-[#0A6F5A]'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="mt-8 grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <form
          onSubmit={handleSave}
          className="rounded-[2rem] border border-[#111439]/5 bg-white/80 p-6 shadow-sm backdrop-blur-md"
        >
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[#106EBE]">
                Profile details
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#111439]">
                {isEditing ? 'Edit your account information.' : 'Account information.'}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-7 text-[#111439]/55">
                Update your username, name, and email address used across CareerLens.
              </p>
            </div>

            {isEditing ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#111439]/10 bg-white px-4 py-2 text-xs font-black text-[#111439] transition-colors hover:bg-[#F8F8F9] disabled:opacity-60"
                >
                  <X size={14} />
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || !hasChanges}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#111439] px-4 py-2 text-xs font-black text-white shadow-lg shadow-[#111439]/15 transition-colors hover:bg-[#1a1f54] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save changes
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex items-center gap-2 rounded-xl bg-[#111439] px-4 py-2 text-xs font-black text-white shadow-lg shadow-[#111439]/15 transition-colors hover:bg-[#1a1f54]"
              >
                <Pencil size={14} />
                Edit profile
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label="Username"
                name="username"
                value={form.username}
                onChange={handleFormChange}
              />

              <FormInput
                label="Email address"
                name="email"
                type="email"
                value={form.email}
                onChange={handleFormChange}
              />

              <FormInput
                label="First name"
                name="first_name"
                value={form.first_name}
                onChange={handleFormChange}
              />

              <FormInput
                label="Last name"
                name="last_name"
                value={form.last_name}
                onChange={handleFormChange}
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard
                icon={AtSign}
                label="Username"
                value={activeUser?.username || 'Not provided'}
                helper="Used for login and account identity."
              />

              <InfoCard
                icon={Mail}
                label="Email address"
                value={activeUser?.email || 'Not provided'}
                helper="Used for contact and profile details."
              />

              <InfoCard
                icon={UserCircle}
                label="Full name"
                value={fullName || 'Not provided'}
                helper="Displayed where personal profile details are needed."
              />

              <InfoCard
                icon={CalendarDays}
                label="Member since"
                value={formatDate(activeUser?.date_joined)}
                helper="CareerLens account creation date."
              />
            </div>
          )}
        </form>

        <div className="rounded-[2rem] border border-[#111439]/5 bg-white/80 p-6 shadow-sm backdrop-blur-md">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[#106EBE]">
                Security overview
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#111439]">
                Your data is scoped to your account.
              </h2>
            </div>

            <div className="rounded-2xl bg-[#106EBE]/10 p-3 text-[#106EBE]">
              <KeyRound size={22} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-[#F8F8F9] p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 shrink-0 text-[#0A6F5A]" size={18} />
                <div>
                  <p className="text-sm font-black text-[#111439]">JWT protected access</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[#111439]/55">
                    Protected pages require an authenticated session before loading resumes, reports, dashboard data, jobs, and applications.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-[#F8F8F9] p-4">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 shrink-0 text-[#106EBE]" size={18} />
                <div>
                  <p className="text-sm font-black text-[#111439]">Private workspace</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[#111439]/55">
                    Normal users only see their own uploaded resumes, ATS reports, tailored resume workflow, and job applications.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-[#F8F8F9] p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 shrink-0 text-[#0A6F5A]" size={18} />
                <div>
                  <p className="text-sm font-black text-[#111439]">Editable profile</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[#111439]/55">
                    Users can update profile details while account role and protected access remain controlled by the backend.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-[#111439]/5 bg-white/80 p-6 shadow-sm backdrop-blur-md">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-widest text-[#106EBE]">
            Quick workspace
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#111439]">
            Continue your job-search workflow.
          </h2>
          <p className="mt-2 text-sm font-semibold leading-7 text-[#111439]/55">
            Jump into the main CareerLens tools from your profile page.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction
            to="/resumes"
            icon={FileText}
            title="Resume Library"
            text="Upload, review, and manage your resumes."
          />

          <QuickAction
            to="/ats"
            icon={Target}
            title="ATS Analysis"
            text="Compare a resume against a job description."
          />

          <QuickAction
            to="/jobs"
            icon={Briefcase}
            title="Job Search"
            text="Search live jobs and save strong matches."
          />

          <QuickAction
            to="/applications"
            icon={ClipboardList}
            title="Application Tracker"
            text="Track saved, applied, interview, and offer stages."
          />
        </div>
      </section>
    </div>
  );
}