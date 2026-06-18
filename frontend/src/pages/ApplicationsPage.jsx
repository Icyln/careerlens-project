import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Briefcase,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  Filter,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import Alert from '../components/Alert.jsx';
import {
  createApplication,
  deleteApplication,
  fetchApplicationSummary,
  fetchApplications,
  getErrorMessage,
  updateApplication,
} from '../api/client.js';

const STATUSES = [
  { value: 'saved', label: 'Saved' },
  { value: 'applied', label: 'Applied' },
  { value: 'screening', label: 'Screening' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const SOURCES = [
  { value: 'manual', label: 'Manual' },
  { value: 'jsearch', label: 'JSearch' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'company', label: 'Company Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'other', label: 'Other' },
];

const ACTIVE_STATUSES = ['saved', 'applied', 'screening', 'interview'];

const EMPTY_FORM = {
  job_title: '',
  company_name: '',
  location: '',
  job_url: '',
  source: 'manual',
  status: 'saved',
  priority: 'medium',
  employment_type: '',
  salary: '',
  date_saved: '',
  date_applied: '',
  deadline: '',
  next_follow_up_date: '',
  notes: '',
  job_description_snapshot: '',
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) return 'Not set';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function dateDistanceLabel(value) {
  const date = parseDate(value);
  if (!date) return 'No date set';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1) return `In ${diffDays} days`;
  return `${Math.abs(diffDays)} days overdue`;
}

function isFollowUpDue(application) {
  if (!application?.next_follow_up_date) return false;
  if (!ACTIVE_STATUSES.includes(application.status)) return false;

  const followUpDate = parseDate(application.next_follow_up_date);
  if (!followUpDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  followUpDate.setHours(0, 0, 0, 0);

  return followUpDate <= today;
}

function statusLabel(value) {
  return STATUSES.find((item) => item.value === value)?.label || value || 'Unknown';
}

function priorityLabel(value) {
  return PRIORITIES.find((item) => item.value === value)?.label || value || 'Medium';
}

function sourceLabel(value) {
  return SOURCES.find((item) => item.value === value)?.label || value || 'Manual';
}

function statusClasses(status) {
  const map = {
    saved: 'bg-slate-100 text-slate-700 ring-slate-200',
    applied: 'bg-blue-50 text-blue-700 ring-blue-200',
    screening: 'bg-violet-50 text-violet-700 ring-violet-200',
    interview: 'bg-amber-50 text-amber-700 ring-amber-200',
    offer: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
    withdrawn: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
  };

  return map[status] || map.saved;
}

function statusAccentClasses(status) {
  const map = {
    saved: 'border-slate-200 bg-slate-50 text-slate-700',
    applied: 'border-blue-200 bg-blue-50 text-blue-700',
    screening: 'border-violet-200 bg-violet-50 text-violet-700',
    interview: 'border-amber-200 bg-amber-50 text-amber-700',
    offer: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rejected: 'border-rose-200 bg-rose-50 text-rose-700',
    withdrawn: 'border-zinc-200 bg-zinc-50 text-zinc-700',
  };

  return map[status] || map.saved;
}

function priorityClasses(priority) {
  const map = {
    low: 'bg-slate-100 text-slate-600 ring-slate-200',
    medium: 'bg-blue-50 text-blue-700 ring-blue-200',
    high: 'bg-rose-50 text-rose-700 ring-rose-200',
  };

  return map[priority] || map.medium;
}

function companyInitials(name = '') {
  const clean = String(name || '').trim();
  if (!clean) return 'CL';

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function KpiCard({ label, value, caption, icon: Icon, tone = 'blue' }) {
  const toneMap = {
    blue: 'text-blue-600 bg-blue-50 ring-blue-100',
    emerald: 'text-emerald-600 bg-emerald-50 ring-emerald-100',
    amber: 'text-amber-600 bg-amber-50 ring-amber-100',
    rose: 'text-rose-600 bg-rose-50 ring-rose-100',
    slate: 'text-slate-700 bg-slate-100 ring-slate-200',
  };

  return (
    <div className="group rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200/70">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-bold leading-relaxed text-slate-500">{caption}</p>
        </div>

        <div className={`rounded-2xl p-3 ring-1 ${toneMap[tone] || toneMap.blue}`}>
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="text-sm font-black text-slate-950">{label}</label>
      {hint && <p className="mt-1 text-xs font-medium text-slate-400">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder = '', type = 'text', required = false }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    />
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <select
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    >
      {options.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

function TextAreaInput({ value, onChange, placeholder = '', rows = 4 }) {
  return (
    <textarea
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    />
  );
}

function StatusPill({ status }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${statusClasses(status)}`}>
      {statusLabel(status)}
    </span>
  );
}

function PriorityPill({ priority }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${priorityClasses(priority)}`}>
      {priorityLabel(priority)}
    </span>
  );
}

function PipelineSummary({ items, activeStatus, onPickStatus }) {
  const statusRows = STATUSES.map((status) => {
    const existing = items.find((item) => item.status === status.value);
    return {
      status: status.value,
      label: status.label,
      count: existing?.count || 0,
    };
  });

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">Pipeline summary</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Click a stage to filter the application list.
          </p>
        </div>

        {activeStatus && (
          <button
            type="button"
            onClick={() => onPickStatus('')}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
          >
            <XCircle size={15} />
            Clear stage
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {statusRows.map((item) => {
          const isActive = activeStatus === item.status;

          return (
            <button
              key={item.status}
              type="button"
              onClick={() => onPickStatus(isActive ? '' : item.status)}
              className={`rounded-2xl border p-4 text-left transition duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
                isActive
                  ? 'border-blue-300 bg-blue-50 shadow-blue-100'
                  : `${statusAccentClasses(item.status)} hover:bg-white`
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">{item.label}</p>
              <p className="mt-2 text-2xl font-black tracking-tight">{item.count}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ApplicationCard({ application, onEdit, onDelete, onStatusChange }) {
  const followUpDue = isFollowUpDue(application);
  const hasJobUrl = Boolean(application.job_url);

  return (
    <article className="group rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200/70">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white shadow-lg shadow-slate-200">
            {companyInitials(application.company_name)}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-black tracking-tight text-slate-950">
                {application.job_title || 'Untitled role'}
              </h3>
              <PriorityPill priority={application.priority} />
            </div>

            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-600">
              <Building2 size={15} className="text-slate-400" />
              {application.company_name || 'Company not set'}
            </p>

            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
              <MapPin size={14} />
              {application.location || 'Location not set'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <select
            value={application.status}
            onChange={(event) => onStatusChange(application, event.target.value)}
            className={`rounded-full px-3 py-2 text-xs font-black ring-1 outline-none transition ${statusClasses(application.status)}`}
          >
            {STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onEdit(application)}
            className="rounded-xl bg-blue-50 p-2 text-blue-700 transition hover:bg-blue-100"
            title="Edit application"
          >
            <Pencil size={16} />
          </button>

          <button
            type="button"
            onClick={() => onDelete(application.id)}
            className="rounded-xl bg-rose-50 p-2 text-rose-700 transition hover:bg-rose-100"
            title="Delete application"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            <CalendarDays size={13} />
            Applied
          </p>
          <p className="mt-2 text-sm font-black text-slate-800">{formatDate(application.date_applied)}</p>
        </div>

        <div className={`rounded-2xl p-4 ring-1 ${followUpDue ? 'bg-rose-50 ring-rose-100' : 'bg-slate-50 ring-slate-100'}`}>
          <p className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] ${followUpDue ? 'text-rose-500' : 'text-slate-400'}`}>
            <CalendarClock size={13} />
            Follow-up
          </p>
          <p className={`mt-2 text-sm font-black ${followUpDue ? 'text-rose-700' : 'text-slate-800'}`}>
            {formatDate(application.next_follow_up_date)}
          </p>
          {application.next_follow_up_date && (
            <p className={`mt-1 text-xs font-bold ${followUpDue ? 'text-rose-500' : 'text-slate-400'}`}>
              {dateDistanceLabel(application.next_follow_up_date)}
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            <FileText size={13} />
            Source
          </p>
          <p className="mt-2 text-sm font-black text-slate-800">
            {application.source_label || sourceLabel(application.source)}
          </p>
        </div>
      </div>

      {(application.employment_type || application.salary || application.deadline) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {application.employment_type && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {application.employment_type}
            </span>
          )}
          {application.salary && (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              {application.salary}
            </span>
          )}
          {application.deadline && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              Deadline: {formatDate(application.deadline)}
            </span>
          )}
        </div>
      )}

      {application.notes && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="line-clamp-2 text-sm font-medium leading-relaxed text-slate-600">
            {application.notes}
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <StatusPill status={application.status} />

        {hasJobUrl ? (
          <a
            href={application.job_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            Open job
            <ExternalLink size={14} />
          </a>
        ) : (
          <span className="text-xs font-semibold text-slate-400">No job link saved</span>
        )}
      </div>
    </article>
  );
}

function ApplicationFormPanel({ open, editingId, form, saving, onClose, onSubmit, updateField }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 p-3 backdrop-blur-sm sm:p-5">
      <button
        type="button"
        aria-label="Close application form"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <form
        onSubmit={onSubmit}
        className="relative flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-slate-950/20"
      >
        <div className="border-b border-slate-200 px-6 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 ring-1 ring-blue-100">
                <Briefcase size={13} />
                {editingId ? 'Editing application' : 'New application'}
              </div>
              <h2 className="mt-3 text-lg font-black tracking-tight text-slate-950">
                {editingId ? 'Update tracked role' : 'Add a job application'}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Save the role, company, timeline, source, and follow-up plan.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Job title">
              <TextInput
                value={form.job_title}
                onChange={(value) => updateField('job_title', value)}
                placeholder="Example: Frontend Developer"
                required
              />
            </Field>

            <Field label="Company">
              <TextInput
                value={form.company_name}
                onChange={(value) => updateField('company_name', value)}
                placeholder="Example: Canva"
                required
              />
            </Field>

            <Field label="Location">
              <TextInput
                value={form.location}
                onChange={(value) => updateField('location', value)}
                placeholder="Example: Singapore, Remote"
              />
            </Field>

            <Field label="Job URL">
              <TextInput
                value={form.job_url}
                onChange={(value) => updateField('job_url', value)}
                placeholder="https://..."
                type="url"
              />
            </Field>

            <Field label="Source">
              <SelectInput
                value={form.source}
                onChange={(value) => updateField('source', value)}
                options={SOURCES}
              />
            </Field>

            <Field label="Status">
              <SelectInput
                value={form.status}
                onChange={(value) => updateField('status', value)}
                options={STATUSES}
              />
            </Field>

            <Field label="Priority">
              <SelectInput
                value={form.priority}
                onChange={(value) => updateField('priority', value)}
                options={PRIORITIES}
              />
            </Field>

            <Field label="Employment type">
              <TextInput
                value={form.employment_type}
                onChange={(value) => updateField('employment_type', value)}
                placeholder="Full-time, Internship, Contract"
              />
            </Field>

            <Field label="Salary">
              <TextInput
                value={form.salary}
                onChange={(value) => updateField('salary', value)}
                placeholder="Optional"
              />
            </Field>

            <Field label="Date saved">
              <TextInput
                value={form.date_saved}
                onChange={(value) => updateField('date_saved', value)}
                type="date"
              />
            </Field>

            <Field label="Date applied">
              <TextInput
                value={form.date_applied}
                onChange={(value) => updateField('date_applied', value)}
                type="date"
              />
            </Field>

            <Field label="Deadline">
              <TextInput
                value={form.deadline}
                onChange={(value) => updateField('deadline', value)}
                type="date"
              />
            </Field>

            <Field label="Next follow-up" hint="Use this for reminders and dashboard follow-up counts.">
              <TextInput
                value={form.next_follow_up_date}
                onChange={(value) => updateField('next_follow_up_date', value)}
                type="date"
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Notes">
                <TextAreaInput
                  value={form.notes}
                  onChange={(value) => updateField('notes', value)}
                  rows={4}
                  placeholder="Example: Applied using tailored resume. Follow up next week."
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Job description snapshot" hint="Optional. Save important requirements for later review.">
                <TextAreaInput
                  value={form.job_description_snapshot}
                  onChange={(value) => updateField('job_description_snapshot', value)}
                  rows={6}
                  placeholder="Paste the job description or key requirements here."
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4 sm:px-7">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
            >
              <RotateCcw size={17} />
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {editingId ? 'Save changes' : 'Add to tracker'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM, date_saved: todayIso() });
  const [editingId, setEditingId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function loadData(filters = {}) {
    try {
      setLoading(true);

      const [applicationData, summaryData] = await Promise.all([
        fetchApplications({
          status: filters.status ?? statusFilter,
          priority: filters.priority ?? priorityFilter,
          search: filters.search ?? searchText,
        }),
        fetchApplicationSummary(),
      ]);

      setApplications(Array.isArray(applicationData) ? applicationData : applicationData?.results || []);
      setSummary(summaryData || null);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredStatusCards = useMemo(() => summary?.by_status || [], [summary]);

  const dueApplications = useMemo(
    () => applications.filter((application) => isFollowUpDue(application)),
    [applications]
  );

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setEditingId('');
    setForm({ ...EMPTY_FORM, date_saved: todayIso() });
  }

  function openCreateForm() {
    resetForm();
    setFormOpen(true);
  }

  function closeForm() {
    if (!saving) {
      setFormOpen(false);
      resetForm();
    }
  }

  function startEdit(application) {
    setEditingId(application.id);
    setForm({
      job_title: application.job_title || '',
      company_name: application.company_name || '',
      location: application.location || '',
      job_url: application.job_url || '',
      source: application.source || 'manual',
      status: application.status || 'saved',
      priority: application.priority || 'medium',
      employment_type: application.employment_type || '',
      salary: application.salary || '',
      date_saved: application.date_saved || '',
      date_applied: application.date_applied || '',
      deadline: application.deadline || '',
      next_follow_up_date: application.next_follow_up_date || '',
      notes: application.notes || '',
      job_description_snapshot: application.job_description_snapshot || '',
    });
    setFormOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage(null);

      const payload = {
        ...form,
        date_saved: form.date_saved || null,
        date_applied: form.date_applied || null,
        deadline: form.deadline || null,
        next_follow_up_date: form.next_follow_up_date || null,
      };

      if (editingId) {
        await updateApplication(editingId, payload);
        setMessage({ type: 'success', text: 'Application updated successfully.' });
      } else {
        await createApplication(payload);
        setMessage({ type: 'success', text: 'Application added to your tracker.' });
      }

      setFormOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickStatus(application, status) {
    try {
      setMessage(null);
      await updateApplication(application.id, { status });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  }

  async function handleDelete(applicationId) {
    if (!window.confirm('Delete this tracked application?')) return;

    try {
      setMessage(null);
      await deleteApplication(applicationId);
      setMessage({ type: 'success', text: 'Application deleted.' });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  }

  async function applyFilters(event) {
    event.preventDefault();
    await loadData();
  }

  function clearFilters() {
    setStatusFilter('');
    setPriorityFilter('');
    setSearchText('');
    loadData({ status: '', priority: '', search: '' });
  }

  function pickStatusFilter(status) {
    setStatusFilter(status);
    loadData({ status, priority: priorityFilter, search: searchText });
  }

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-100 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-emerald-100 blur-3xl" />

        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-slate-200">
              <ClipboardList size={15} />
              Application tracker
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Manage your job applications
            </h1>

            <p className="mt-4 max-w-2xl text-base font-medium leading-8 text-slate-600">
              Track saved jobs, applications, interviews, offers, follow-ups, notes, and important links in one clean workspace.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              <Plus size={18} />
              New application
            </button>

            <button
              type="button"
              onClick={() => loadData()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 size={17} className="animate-spin" /> : <RotateCcw size={17} />}
              Refresh
            </button>
          </div>
        </div>
      </section>

      {message && (
        <Alert type={message.type} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Total"
          value={summary?.total_applications || 0}
          caption="All tracked roles"
          icon={ClipboardList}
          tone="blue"
        />
        <KpiCard
          label="Active"
          value={summary?.active_applications || 0}
          caption="Saved to interview"
          icon={Briefcase}
          tone="emerald"
        />
        <KpiCard
          label="Interviews"
          value={summary?.interviews || 0}
          caption="Interview stage"
          icon={CheckCircle2}
          tone="amber"
        />
        <KpiCard
          label="Response rate"
          value={`${summary?.response_rate || 0}%`}
          caption="Screening or later"
          icon={ArrowUpRight}
          tone="slate"
        />
        <KpiCard
          label="Follow-ups"
          value={summary?.followups_due || dueApplications.length || 0}
          caption="Due today or overdue"
          icon={CalendarClock}
          tone="rose"
        />
      </section>

      <PipelineSummary
        items={filteredStatusCards}
        activeStatus={statusFilter}
        onPickStatus={pickStatusFilter}
      />

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={applyFilters} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                <SlidersHorizontal size={19} />
                Search and filters
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Find roles by title, company, location, or notes.
              </p>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
            >
              <XCircle size={15} />
              Clear filters
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_190px_190px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search applications..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <SelectInput
              value={statusFilter}
              onChange={setStatusFilter}
              options={[{ value: '', label: 'All statuses' }, ...STATUSES]}
            />

            <SelectInput
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={[{ value: '', label: 'All priorities' }, ...PRIORITIES]}
            />

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              <Filter size={17} />
              Apply
            </button>
          </div>
        </form>
      </section>

      {dueApplications.length > 0 && (
        <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black text-rose-800">
                <AlertCircle size={20} />
                Follow-ups need attention
              </h2>
              <p className="mt-1 text-sm font-semibold text-rose-700/80">
                {dueApplications.length} active application{dueApplications.length === 1 ? '' : 's'} due today or overdue.
              </p>
            </div>

            <button
              type="button"
              onClick={() => pickStatusFilter('')}
              className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-rose-700 ring-1 ring-rose-200"
            >
              Review list below
            </button>
          </div>
        </section>
      )}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-950">
              <Building2 size={21} />
              Tracked applications
            </h2>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
            {applications.length} shown
          </span>
        </div>

        {loading ? (
          <div className="rounded-[1.75rem] bg-slate-50 p-12 text-center ring-1 ring-slate-100">
            <Loader2 className="mx-auto animate-spin text-blue-600" size={32} />
            <p className="mt-4 text-sm font-bold text-slate-500">Loading applications...</p>
          </div>
        ) : applications.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                onEdit={startEdit}
                onDelete={handleDelete}
                onStatusChange={handleQuickStatus}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
              <ClipboardList size={34} />
            </div>
            <h3 className="mt-5 text-xl font-black text-slate-950">No applications found</h3>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-7 text-slate-500">
              Add your first saved or applied job, or clear filters if you expected to see existing applications.
            </p>
            <button
              type="button"
              onClick={openCreateForm}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              <Plus size={18} />
              Add first application
            </button>
          </div>
        )}
      </section>

      <ApplicationFormPanel
        open={formOpen}
        editingId={editingId}
        form={form}
        saving={saving}
        onClose={closeForm}
        onSubmit={handleSubmit}
        updateField={updateField}
      />
    </div>
  );
}
