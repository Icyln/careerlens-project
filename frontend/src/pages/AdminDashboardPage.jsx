import { useEffect, useMemo, useState } from 'react';
import {
  createAdminUser,
  deactivateAdminUser,
  getAdminStats,
  getAdminUsers,
  updateAdminUser,
} from '../api/client.js';

const emptyForm = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  is_staff: false,
  is_active: true,
};

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-slate-950">{value ?? 0}</p>
    </div>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
        active
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-rose-50 text-rose-700'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function RoleBadge({ isAdmin }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
        isAdmin
          ? 'bg-blue-50 text-blue-700'
          : 'bg-slate-100 text-slate-600'
      }`}
    >
      {isAdmin ? 'Admin' : 'User'}
    </span>
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
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedUser = useMemo(() => editingUser, [editingUser]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData] = await Promise.all([
        getAdminStats(),
        getAdminUsers({ search, role, status }),
      ]);

      setStats(statsData);
      setUsers(Array.isArray(usersData) ? usersData : usersData.results || []);
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Could not load admin dashboard. Please check admin permission.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = async (event) => {
    event.preventDefault();
    await loadAdminData();
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingUser(null);
  };

  const startEdit = (user) => {
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

      if (selectedUser) {
        await updateAdminUser(selectedUser.id, payload);
        setMessage({ type: 'success', text: 'User updated successfully.' });
      } else {
        await createAdminUser(payload);
        setMessage({ type: 'success', text: 'User created successfully.' });
      }

      resetForm();
      await loadAdminData();
    } catch (error) {
      const data = error?.response?.data;
      const text =
        typeof data === 'string'
          ? data
          : data?.detail ||
            data?.username?.[0] ||
            data?.email?.[0] ||
            data?.password?.[0] ||
            'Could not save user. Please check the form.';

      setMessage({ type: 'error', text });
    } finally {
      setSaving(false);
    }
  };

  const toggleAdmin = async (user) => {
    try {
      await updateAdminUser(user.id, { is_staff: !user.is_staff });
      await loadAdminData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Could not update user role.' });
    }
  };

  const toggleActive = async (user) => {
    try {
      await updateAdminUser(user.id, { is_active: !user.is_active });
      await loadAdminData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Could not update user status.' });
    }
  };

  const deactivateUser = async (user) => {
    const confirmed = window.confirm(
      `Deactivate ${user.username}? They will not be able to log in.`
    );

    if (!confirmed) return;

    try {
      await deactivateAdminUser(user.id);
      await loadAdminData();
      setMessage({ type: 'success', text: 'User deactivated.' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Could not deactivate user.' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage users, roles, and account access for CareerLens.
          </p>
        </div>

        {message && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total users" value={stats?.total_users} />
          <StatCard label="Active users" value={stats?.active_users} />
          <StatCard label="Admins" value={stats?.admin_users} />
          <StatCard label="Reports" value={stats?.total_reports} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-black text-slate-950">
              {selectedUser ? 'Edit user' : 'Create user'}
            </h2>

            <div className="mt-5 space-y-4">
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />

              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="First name"
                  value={form.first_name}
                  onChange={(e) =>
                    setForm({ ...form, first_name: e.target.value })
                  }
                />

                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="Last name"
                  value={form.last_name}
                  onChange={(e) =>
                    setForm({ ...form, last_name: e.target.value })
                  }
                />
              </div>

              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                placeholder={
                  selectedUser
                    ? 'New password optional'
                    : 'Password'
                }
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!selectedUser}
              />

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_staff}
                  onChange={(e) =>
                    setForm({ ...form, is_staff: e.target.checked })
                  }
                />
                Admin access
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                />
                Active account
              </label>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                >
                  {saving ? 'Saving...' : selectedUser ? 'Update user' : 'Create user'}
                </button>

                {selectedUser && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </form>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <form
              onSubmit={applyFilters}
              className="grid gap-3 md:grid-cols-[1fr_160px_160px_auto]"
            >
              <input
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="Search username, email, or name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="">All roles</option>
                <option value="admin">Admins</option>
                <option value="user">Users</option>
              </select>

              <select
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <button
                type="submit"
                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
              >
                Filter
              </button>
            </form>

            <div className="mt-6 overflow-x-auto">
              {loading ? (
                <p className="py-10 text-center text-sm text-slate-400">
                  Loading users...
                </p>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-widest text-slate-400">
                      <th className="py-3 pr-4">User</th>
                      <th className="py-3 pr-4">Role</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Activity</th>
                      <th className="py-3 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-slate-100">
                        <td className="py-4 pr-4">
                          <p className="font-black text-slate-950">
                            {user.username}
                          </p>
                          <p className="text-xs text-slate-500">
                            {user.email || 'No email'}
                          </p>
                        </td>

                        <td className="py-4 pr-4">
                          <RoleBadge isAdmin={user.is_staff} />
                        </td>

                        <td className="py-4 pr-4">
                          <StatusBadge active={user.is_active} />
                        </td>

                        <td className="py-4 pr-4 text-xs text-slate-500">
                          <p>{user.total_resumes || 0} resumes</p>
                          <p>{user.total_reports || 0} reports</p>
                          <p>{user.total_applications || 0} applications</p>
                        </td>

                        <td className="py-4 pr-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(user)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleAdmin(user)}
                              className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700"
                            >
                              {user.is_staff ? 'Make user' : 'Make admin'}
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleActive(user)}
                              className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700"
                            >
                              {user.is_active ? 'Deactivate' : 'Activate'}
                            </button>

                            <button
                              type="button"
                              onClick={() => deactivateUser(user)}
                              className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {!users.length && (
                      <tr>
                        <td colSpan="5" className="py-10 text-center text-sm text-slate-400">
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}