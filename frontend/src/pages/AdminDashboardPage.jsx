import { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Edit3,
  Filter,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCircle,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  createAdminUser,
  getAdminStats,
  getAdminUsers,
  updateAdminUser,
} from '../api/client.js';
import AuthTopBar from '../components/AuthTopBar.jsx';

const emptyForm = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  is_staff: false,
  is_active: true,
};

function getUserName(user) {
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');
  return fullName || user?.username || 'Unnamed user';
}

function getInitial(user) {
  return getUserName(user).slice(0, 1).toUpperCase();
}

function getFriendlySaveError(error) {
  const data = error?.response?.data;

  if (data?.username?.[0]) return data.username[0];
  if (data?.email?.[0]) return data.email[0];
  if (data?.password?.[0]) return data.password[0];
  if (data?.detail) return data.detail;

  return 'Could not save this user. Please review the form and try again.';
}

function StatCard({ label, value, icon: Icon, helper }) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-950/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            {label}
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            {value ?? 0}
          </p>
        </div>

        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <Icon size={18} />
        </span>
      </div>

      {helper && (
        <p className="mt-4 text-sm leading-6 text-slate-500">
          {helper}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
        active
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
          : 'bg-rose-50 text-rose-700 ring-rose-100'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? 'bg-emerald-500' : 'bg-rose-500'
        }`}
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function RoleBadge({ isAdmin }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
        isAdmin
          ? 'bg-blue-50 text-blue-700 ring-blue-100'
          : 'bg-slate-100 text-slate-600 ring-slate-200'
      }`}
    >
      <ShieldCheck size={12} />
      {isAdmin ? 'Admin' : 'User'}
    </span>
  );
}

function MessageBanner({ message, onClose }) {
  if (!message) return null;

  const success = message.type === 'success';

  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
        success
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-rose-200 bg-rose-50 text-rose-800'
      }`}
    >
      <div className="flex gap-2">
        {success ? (
          <CheckCircle2 className="mt-0.5 shrink-0" size={17} />
        ) : (
          <AlertCircle className="mt-0.5 shrink-0" size={17} />
        )}
        <span>{message.text}</span>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="rounded-full p-1 opacity-70 transition hover:bg-white/70 hover:opacity-100"
        aria-label="Dismiss message"
      >
        <X size={15} />
      </button>
    </div>
  );
}

function TextInput({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
      />
    </label>
  );
}

function ToggleField({ label, description, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition hover:bg-white">
      <span>
        <span className="block text-sm font-semibold text-slate-900">
          {label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
    </label>
  );
}

function UserFormModal({
  open,
  form,
  setForm,
  selectedUser,
  saving,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl shadow-slate-950/25">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
              Account setup
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
              {selectedUser ? 'Manage user' : 'Create new user'}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {selectedUser
                ? 'Update profile details, role, status, or password.'
                : 'Create a CareerLens account and assign the correct access.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close form"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Username"
              placeholder="Username"
              value={form.username}
              onChange={(event) =>
                setForm({ ...form, username: event.target.value })
              }
              required
            />

            <TextInput
              label="Email"
              placeholder="name@example.com"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="First name"
              placeholder="First name"
              value={form.first_name}
              onChange={(event) =>
                setForm({ ...form, first_name: event.target.value })
              }
            />

            <TextInput
              label="Last name"
              placeholder="Last name"
              value={form.last_name}
              onChange={(event) =>
                setForm({ ...form, last_name: event.target.value })
              }
            />
          </div>

          <TextInput
            label={selectedUser ? 'New password' : 'Password'}
            placeholder={selectedUser ? 'Leave empty to keep current password' : 'Required'}
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
            required={!selectedUser}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <ToggleField
              label="Admin access"
              description="Allow this user to open the admin console."
              checked={form.is_staff}
              onChange={(event) =>
                setForm({ ...form, is_staff: event.target.checked })
              }
            />

            <ToggleField
              label="Active account"
              description="Inactive users cannot sign in."
              checked={form.is_active}
              onChange={(event) =>
                setForm({ ...form, is_active: event.target.checked })
              }
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Loader2 className="animate-spin" size={16} />}
              {saving ? 'Saving...' : selectedUser ? 'Save changes' : 'Create user'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingUser, setEditingUser] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadAdminData = async (filters = { search, role, status }) => {
    setLoading(true);

    try {
      const [statsData, usersData] = await Promise.all([
        getAdminStats(),
        getAdminUsers(filters),
      ]);

      setStats(statsData);
      setUsers(Array.isArray(usersData) ? usersData : usersData.results || []);
    } catch (error) {
      console.error('Admin dashboard load failed:', error);
      setMessage({
        type: 'error',
        text: 'Could not load the admin dashboard. Please confirm your admin access and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateForm = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEditForm = (user) => {
    setEditingUser(user);
    setForm({
      username: user.username || '',
      email: user.email || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      password: '',
      is_staff: Boolean(user.is_staff),
      is_active: Boolean(user.is_active),
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
  };

  const applyFilters = async (event) => {
    event.preventDefault();
    await loadAdminData({ search, role, status });
  };

  const clearFilters = async () => {
    setSearch('');
    setRole('');
    setStatus('');
    await loadAdminData({ search: '', role: '', status: '' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        is_staff: Boolean(form.is_staff),
        is_active: Boolean(form.is_active),
      };

      if (form.password.trim()) {
        payload.password = form.password;
      }

      if (editingUser) {
        await updateAdminUser(editingUser.id, payload);
        setMessage({ type: 'success', text: 'User account updated successfully.' });
      } else {
        await createAdminUser(payload);
        setMessage({ type: 'success', text: 'New user account created successfully.' });
      }

      closeForm();
      await loadAdminData({ search, role, status });
    } catch (error) {
      console.error('Admin user save failed:', error);
      setMessage({ type: 'error', text: getFriendlySaveError(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 font-['Inter',_ui-sans-serif,_system-ui,_sans-serif]">
      <AuthTopBar />

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-950/5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 ring-1 ring-blue-100">
              <ShieldCheck size={14} />
              Admin console
            </div>

            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              User Management
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage user accounts, roles, access status, and CareerLens activity.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => loadAdminData({ search, role, status })}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              <UserPlus size={16} />
              New user
            </button>
          </div>
        </div>
      </section>

      <MessageBanner message={message} onClose={() => setMessage(null)} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total users"
          value={stats?.total_users}
          icon={Users}
          helper="All registered accounts"
        />
        <StatCard
          label="Active users"
          value={stats?.active_users}
          icon={Activity}
          helper="Users who can sign in"
        />
        <StatCard
          label="Admins"
          value={stats?.admin_users}
          icon={ShieldCheck}
          helper="Accounts with admin access"
        />
        <StatCard
          label="Reports"
          value={stats?.total_reports}
          icon={Filter}
          helper="Generated ATS reports"
        />
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-950/5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              Directory
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
              Users
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Showing {users.length} user{users.length === 1 ? '' : 's'}.
            </p>
          </div>

          <form
            onSubmit={applyFilters}
            className="grid w-full gap-3 lg:max-w-4xl lg:grid-cols-[1fr_150px_150px_auto_auto]"
          >
            <label className="relative block">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                placeholder="Search users"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <select
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="">All roles</option>
              <option value="admin">Admins</option>
              <option value="user">Users</option>
            </select>

            <select
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800"
            >
              <Filter size={15} />
              Filter
            </button>

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Clear
            </button>
          </form>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center bg-white">
              <div className="text-center">
                <Loader2 className="mx-auto animate-spin text-blue-600" size={28} />
                <p className="mt-3 text-sm font-medium text-slate-500">
                  Loading users...
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    <th className="px-5 py-4">User</th>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Activity</th>
                    <th className="px-5 py-4 text-right">Manage</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {users.map((user) => (
                    <tr key={user.id} className="transition hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <div className="flex min-w-[240px] items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-sm font-semibold text-blue-700 ring-1 ring-blue-100">
                            {getInitial(user)}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-950">
                              {getUserName(user)}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              @{user.username}
                            </p>
                            <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-400">
                              <Mail size={12} />
                              {user.email || 'No email'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <RoleBadge isAdmin={user.is_staff} />
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge active={user.is_active} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="min-w-[180px] text-xs leading-5 text-slate-500">
                          <span>{user.total_resumes || 0} resumes</span>
                          <span className="mx-2 text-slate-300">•</span>
                          <span>{user.total_reports || 0} reports</span>
                          <span className="mx-2 text-slate-300">•</span>
                          <span>{user.total_applications || 0} applications</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openEditForm(user)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Edit3 size={13} />
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!users.length && (
                    <tr>
                      <td colSpan="5" className="px-5 py-16 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center">
                          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
                            <UserCircle size={24} />
                          </div>
                          <h3 className="mt-4 text-base font-semibold text-slate-950">
                            No users found
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            Try adjusting the filters or create a new account.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <UserFormModal
        open={formOpen}
        form={form}
        setForm={setForm}
        selectedUser={editingUser}
        saving={saving}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />
    </div>
  );
}