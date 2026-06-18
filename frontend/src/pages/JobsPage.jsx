import { useState } from 'react';
import { ExternalLink, Loader2, Search, Sparkles, BookmarkPlus, CheckCircle2} from 'lucide-react';
import {
  createApplication,
  fetchRecommendedJobs,
  getErrorMessage,
} from '../api/client.js';
import { toArray, toText } from '../utils/safeRender.js';

function formatPostedDate(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatAgeText(ageDays) {
  if (ageDays === null || ageDays === undefined) return '';

  const days = Number(ageDays);

  if (Number.isNaN(days)) return '';
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';

  return `${days} days ago`;
}

function normalizeJobTag(value) {
  const raw = toText(value, '').trim();
  if (!raw) return '';

  const compact = raw
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  const key = compact.replace(/[\s_-]/g, '').toUpperCase();

  const map = {
    FULLTIME: 'Full-time',
    PARTTIME: 'Part-time',
    CONTRACTOR: 'Contractor',
    CONTRACT: 'Contract',
    TEMPORARY: 'Temporary',
    INTERN: 'Internship',
    INTERNSHIP: 'Internship',
    REMOTE: 'Remote',
  };

  return map[key] || compact;
}

function getCleanJobTags(job) {
  const rawTags = [
    ...toArray(job.tags),
    job.employment_type,
    ...(Array.isArray(job.job_employment_types) ? job.job_employment_types : []),
  ];

  const expanded = [];

  rawTags.forEach((tag) => {
    const text = toText(tag, '').replace(/[–—]/g, '-').trim();
    if (!text) return;

    // Split combined values like "Full-time, Part-time and Contractor"
    const parts = text
      .replace(/\band\b/gi, ',')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    expanded.push(...parts);
  });

  const output = [];
  const seen = new Set();

  expanded.forEach((tag) => {
    const clean = normalizeJobTag(tag);
    const key = clean.toLowerCase().replace(/[\s_-]/g, '');

    if (clean && !seen.has(key)) {
      output.push(clean);
      seen.add(key);
    }
  });

  return output;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getJobKey(job) {
  return (
    job?.url ||
    `${job?.title || ''}-${job?.company || ''}-${job?.location || ''}`
  );
}

function getJobEmploymentType(job) {
  const raw = [
    job?.employment_type,
    ...(Array.isArray(job?.job_employment_types) ? job.job_employment_types : []),
    ...(Array.isArray(job?.tags) ? job.tags : []),
  ]
    .filter(Boolean)
    .join(', ');

  return raw || '';
}

function buildApplicationPayloadFromJob(job, status) {
  const today = todayIso();

  return {
    job_title: job?.title || 'Untitled job',
    company_name: job?.company || 'Company not listed',
    location: job?.location || '',
    job_url: job?.url || '',
    source: 'jsearch',
    status,
    priority: 'medium',
    employment_type: getJobEmploymentType(job),
    salary: job?.salary || '',
    job_description_snapshot: job?.description || '',
    date_saved: today,
    date_applied: status === 'applied' ? today : null,
    notes:
      status === 'applied'
        ? 'Marked as applied from CareerLens job search.'
        : 'Saved from CareerLens job search.',
  };
}

function JobCard({ job, onTrackJob, trackingKey, trackedStatus }) {
  const postedDate = formatPostedDate(job.published_at);
  const ageText = formatAgeText(job.age_days);
  const cleanTags = getCleanJobTags(job);
  const jobKey = getJobKey(job);
  const isTracking = trackingKey === jobKey;
  const isTracked = Boolean(trackedStatus);

  return (
    <article className="rounded-3xl bg-white p-5 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            {job.source}
          </p>

          <h3 className="mt-1 text-lg font-black text-slate-950">
            {job.title}
          </h3>

          <p className="mt-1 text-sm font-bold text-slate-600">
            {job.company || 'Company not listed'} • {job.location || 'Location not listed'}
          </p>

          <p className="mt-1 text-xs font-bold text-slate-400">
            {postedDate ? `Posted: ${postedDate}` : 'Posted date not listed'}
            {ageText ? ` • ${ageText}` : ''}
          </p>
        </div>

        {isTracked && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
            {trackedStatus === 'applied' ? 'Added as Applied' : 'Saved'}
          </span>
        )}
      </div>

      <p className="mt-4 line-clamp-4 break-words text-sm leading-6 text-slate-500">
        {job.description || 'Open the source page to view full job details.'}
      </p>

      {!!cleanTags.length && (
        <div className="mt-4 flex flex-wrap gap-2">
          {cleanTags.slice(0, 5).map((tag, index) => (
            <span
              key={index}
              className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onTrackJob(job, 'saved')}
          disabled={isTracking || isTracked}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isTracking ? <Loader2 className="animate-spin" size={15} /> : <BookmarkPlus size={15} />}
          Save Job
        </button>

        <button
          type="button"
          onClick={() => onTrackJob(job, 'applied')}
          disabled={isTracking || isTracked}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isTracking ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
          Mark as Applied
        </button>

        {job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
          >
            View job <ExternalLink size={15} />
          </a>
        )}
      </div>
    </article>
  );
}

export default function JobsPage() {
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('sg');
  const [sort, setSort] = useState('relevance');
  const [maxDaysOld, setMaxDaysOld] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [trackingKey, setTrackingKey] = useState('');
  const [trackedJobs, setTrackedJobs] = useState({});

async function loadJobs() {
  if (!query.trim()) {
    setMessage('Please enter a job title before searching.');
    return;
  }

  try {
    setLoading(true);
    setMessage('');
    setHasSearched(true);

    const result = await fetchRecommendedJobs({
      query,
      country,
      sort,
      maxDaysOld,
    });

    setData(result);
  } catch (error) {
    setMessage(getErrorMessage(error));
  } finally {
    setLoading(false);
  }
}

async function handleTrackJob(job, status) {
  const jobKey = getJobKey(job);

  try {
    setTrackingKey(jobKey);
    setMessage(null);

    const payload = buildApplicationPayloadFromJob(job, status);

    await createApplication(payload);

    setTrackedJobs((current) => ({
      ...current,
      [jobKey]: status,
    }));

    setMessage(
  status === 'applied'
    ? 'Job added to your tracker as Applied.'
    : 'Job saved to your application tracker.'
);
  } catch (error) {
    setMessage(getErrorMessage(error));
  } finally {
    setTrackingKey('');
  }
}

const jobs = toArray(data?.jobs);

  return (
    <div className="space-y-8">
      <section className="glass-panel rounded-[2rem] p-7 sm:p-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-tr from-[#106EBE] to-[#0FFCBE] px-4 py-2 text-sm font-black text-white shadow-sm">
          <Search size={16} className="text-white" />
          Job Recommendations
        </div>
        <h1 className="mt-6 max-w-4xl text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          Search live jobs by title, location, and posting date.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          Enter a job title and location, then click Search.
        </p>
      </section>

      {message && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{message}</div>}

      <div className="grid gap-5 rounded-3xl bg-white p-5 ring-1 ring-slate-200 lg:grid-cols-6">
  <div className="lg:col-span-3">
    <label className="text-sm font-black text-slate-950">Job title</label>
    <input
      value={query}
      onChange={(event) => setQuery(event.target.value)}
      placeholder="Example: Waiter, Frontend Developer, Data Analyst"
      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    />
  </div>

  <div>
    <label className="text-sm font-black text-slate-950">Country</label>
    <select
      value={country}
      onChange={(event) => setCountry(event.target.value)}
      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    >
      <option value="">Any country</option>
      <option value="sg">Singapore</option>
      <option value="ae">United Arab Emirates</option>
      <option value="gb">United Kingdom</option>
      <option value="us">United States</option>
      <option value="ca">Canada</option>
      <option value="au">Australia</option>
      <option value="nz">New Zealand</option>
      <option value="in">India</option>
      <option value="jp">Japan</option>
      <option value="kr">South Korea</option>
      <option value="th">Thailand</option>
      <option value="my">Malaysia</option>
      <option value="mm">Myanmar</option>
      <option value="ph">Philippines</option>
      <option value="de">Germany</option>
      <option value="fr">France</option>
      <option value="it">Italy</option>
    </select>
  </div>

  <div>
    <label className="text-sm font-black text-slate-950">Sort</label>
    <select
      value={sort}
      onChange={(event) => setSort(event.target.value)}
      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    >
      <option value="relevance">Best match</option>
      <option value="recent">Most recent</option>
      <option value="oldest">Oldest first</option>
    </select>
  </div>

  <div>
    <label className="text-sm font-black text-slate-950">Posted within</label>
    <select
      value={maxDaysOld}
      onChange={(event) => setMaxDaysOld(Number(event.target.value))}
      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    >
      <option value={1}>Today</option>
      <option value={3}>3 days</option>
      <option value={7}>7 days</option>
      <option value={14}>14 days</option>
      <option value={30}>30 days</option>
    </select>
  </div>

  <button
    type="button"
    onClick={loadJobs}
    disabled={loading}
    className="mt-7 inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
  >
    {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
    Search
  </button>
</div>

      {hasSearched && data?.query_profile && (
  <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-blue-900">
    <div className="flex items-start gap-3">
      <Sparkles size={20} className="mt-1 shrink-0" />
      <div>
        <p className="font-black">Search profile</p>
        <p className="mt-1 text-sm leading-6">
          Showing live jobs for{' '}
          <span className="font-black">{data.query_profile.primary_query}</span>
          {data.query_profile.country_name ? ` (${data.query_profile.country_name})` : ''}
          {data.query_profile.max_days_old ? ` from the last ${data.query_profile.max_days_old} days` : ''}.
        </p>
      </div>
    </div>
  </div>
)}

{!hasSearched && (
  <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-blue-900">
    <div className="flex items-start gap-3">
      <Sparkles size={20} className="mt-1 shrink-0" />
      <div>
        <p className="font-black">Start your job search</p>
        <p className="mt-1 text-sm leading-6">
          Enter a job title, choose a location/date range, then click Search. CareerLens will not search automatically.
        </p>
      </div>
    </div>
  </div>
)}

  {loading ? (
  <div className="rounded-3xl bg-white p-10 text-center ring-1 ring-slate-200">
    <Loader2 className="mx-auto animate-spin text-blue-600" />
    <p className="mt-3 font-bold text-slate-600">Searching JSearch live job listings...</p>
  </div>
) : hasSearched && jobs.length ? (
  <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
    {jobs.map((job, index) => {
      const jobKey = getJobKey(job);

      return (
        <JobCard
          key={jobKey || index}
          job={job}
          onTrackJob={handleTrackJob}
          trackingKey={trackingKey}
          trackedStatus={trackedJobs[jobKey]}
        />
      );
    })}
  </div>
) : hasSearched ? (
  <div className="rounded-3xl bg-white p-8 ring-1 ring-slate-200">
    <p className="font-bold text-slate-600">
      No live jobs returned yet. Try a broader job title, nearby location, or wider date range.
    </p>
  </div>
) : null}
    </div>
  );
}
