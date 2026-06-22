import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  BarChart3,
  BrainCircuit,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCheck2,
  FileText,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Building2,
  Compass,
  Lightbulb,
  Rocket,
  X,
  
} from 'lucide-react';
import { fetchDashboard, generateCareerGuidance, getErrorMessage } from '../api/client.js';
import { toArray, toNumber, toText } from '../utils/safeRender.js';

function clamp(value, min = 0, max = 100) {
  const number = Number(value);
  if (Number.isNaN(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function formatToday() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatDate(value) {
  if (!value) return 'Recently';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
  });
}

function getScoreTone(score) {
  if (score >= 85) return 'text-[#0D9476]';
  if (score >= 70) return 'text-[#106EBE]';
  if (score >= 55) return 'text-amber-600';
  return 'text-rose-600';
}

function getStatusStyle(status) {
  const styles = {
    saved: 'bg-slate-100 text-slate-700',
    applied: 'bg-blue-50 text-blue-700',
    screening: 'bg-violet-50 text-violet-700',
    interview: 'bg-amber-50 text-amber-700',
    offer: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-rose-50 text-rose-700',
    withdrawn: 'bg-zinc-100 text-zinc-700',
  };

  return styles[status] || styles.saved;
}

function getStatusLabel(status) {
  const labels = {
    saved: 'Saved',
    applied: 'Applied',
    screening: 'Screening',
    interview: 'Interview',
    offer: 'Offer',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  };

  return labels[status] || 'Unknown';
}

const EMPTY_GUIDANCE_FORM = {
  career_goals: '',
  strengths: '',
  weaknesses: '',
  pain_points: '',
  target_jobs: '',
  target_companies: '',
  preferred_industries: '',
  long_term_goals: '',
  timeline: '',
  constraints: '',
  extra_notes: '',
};

const GUIDANCE_STORAGE_KEY = 'careerlens_career_guidance';

function getDifficultyLabel(value = '') {
  return String(value || '')
    .split('_')
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(' ');
}

function normalizeGuidanceList(value) {
  return toArray(value)
    .map((item) => toText(item, ''))
    .filter(Boolean);
}

function getGuidanceActions(guidance) {
  const priorityActions = toArray(guidance?.priority_actions);

  if (priorityActions.length) {
    return priorityActions.map((item, index) => ({
      id: item?.id || `action-${index + 1}`,
      title: toText(item?.title, 'Priority action'),
      reason: toText(item?.reason, ''),
      nextStep: toText(item?.next_step, ''),
      timeframe: toText(item?.timeframe, ''),
    }));
  }

  return toArray(guidance?.recommendations).map((item, index) => ({
    id: `recommendation-${index + 1}`,
    title: toText(item, 'Priority action'),
    reason: '',
    nextStep: '',
    timeframe: '',
  }));
}

function getGuidancePreviewText(guidance) {
  return (
    toText(guidance?.career_positioning, '') ||
    toText(guidance?.readiness_summary, '') ||
    toText(guidance?.target_direction, '') ||
    toText(guidance?.headline, '') ||
    'Generate a Career Intelligence plan from your goals, target jobs, companies, strengths, and dashboard signals.'
  );
}

function EmptyState({
  title = 'No data yet.',
  text = 'Create more ATS reports to unlock this insight.',
}) {
  return (
    <div className="flex min-h-[12rem] items-center justify-center rounded-2xl border border-dashed border-[#111439]/10 bg-white/50 p-6 text-center">
      <div>
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#111439]/5 text-[#111439]/40">
          <Sparkles size={18} />
        </div>
        <p className="text-sm font-semibold text-[#111439]">{title}</p>
        <p className="mt-1 max-w-sm text-xs leading-5 text-[#111439]/50">{text}</p>
      </div>
    </div>
  );
}

function KpiCard({ label, value, trend, icon: Icon, color = 'text-[#106EBE]' }) {
  return (
    <div className="rounded-2xl border border-[#111439]/5 bg-white/70 p-5 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[#106EBE]/20 hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#111439]/50">
          {label}
        </span>
        <div className={`rounded-lg border border-[#111439]/5 bg-white p-1.5 shadow-sm ${color}`}>
          <Icon size={15} />
        </div>
      </div>

      <p className="text-2xl font-semibold text-[#111439] sm:text-3xl">{value}</p>
      <p className="mt-1 text-[10px] font-semibold text-[#111439]/40 sm:text-xs">{trend}</p>
    </div>
  );
}

function ScoreVelocityChart({ trend }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!trend.length) {
    return (
      <EmptyState
        title="No score trend yet."
        text="Run ATS analysis on resumes to see job match and readability progress."
      />
    );
  }

  return (
    <div className="h-56 pt-4">
      <div className="flex h-full gap-2 sm:gap-4">
        <div className="flex flex-col justify-between pb-7 pr-2 text-[10px] font-semibold text-[#111439]/30">
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>

        <div className="relative flex-1 border-b border-l border-[#111439]/10 pb-1 pl-2">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2].map((item) => (
              <div key={item} className="w-full border-t border-[#111439]/5" />
            ))}
          </div>

          <div className="relative z-10 flex h-full items-end justify-between">
            {trend.map((item, index) => {
              const jobMatch = clamp(item.job_match_score);
              const readability = clamp(item.ats_readability_score);
              const isHovered = hoveredIndex === index;

              return (
                <div
                  key={`${item.label}-${index}`}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="group relative mx-1 flex h-full flex-1 flex-col items-center justify-end sm:mx-2"
                >
                  <div
                    className={`absolute -top-12 max-w-[13rem] whitespace-normal rounded-md bg-[#111439] px-2 py-1 text-center text-[10px] font-semibold text-white shadow-lg transition-all duration-200 ${
                      isHovered ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
                    }`}
                  >
                    <div>{item.job_title || 'ATS report'}</div>
                    <div>
                      Match {jobMatch}% • Readability {readability}%
                    </div>
                  </div>

                  <div className="flex h-full w-full max-w-[46px] items-end justify-center gap-1">
                    <div
                      className={`w-1/2 rounded-t-lg transition-all duration-500 ${
                        isHovered
                          ? 'bg-gradient-to-t from-[#106EBE] to-[#0FFCBE]'
                          : 'bg-[#106EBE]/25'
                      }`}
                      style={{ height: `${jobMatch}%` }}
                    />
                    <div
                      className={`w-1/2 rounded-t-lg transition-all duration-500 ${
                        isHovered ? 'bg-[#0D9476]' : 'bg-[#0D9476]/25'
                      }`}
                      style={{ height: `${readability}%` }}
                    />
                  </div>

                  <span
                    className={`absolute -bottom-6 text-[10px] font-semibold transition-colors ${
                      isHovered ? 'text-[#111439]' : 'text-[#111439]/40'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3 text-[10px] font-semibold uppercase tracking-widest text-[#111439]/40">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#106EBE]" />
          Job match
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#0D9476]" />
          ATS readability
        </span>
      </div>
    </div>
  );
}

function DistributionPanel({ distribution }) {
  const clean = distribution.filter((item) => toNumber(item.count, 0) > 0);

  if (!clean.length) {
    return (
      <EmptyState
        title="No distribution yet."
        text="Create reports to see how your match levels are distributed."
      />
    );
  }

  const total = clean.reduce((sum, item) => sum + toNumber(item.count, 0), 0) || 1;

  return (
    <div className="space-y-4">
      {clean.map((item) => {
        const level = toText(item.level, 'Unknown');
        const count = toNumber(item.count, 0);
        const percent = Math.round((count / total) * 100);

        return (
          <div key={level}>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-semibold text-[#111439]">{level}</p>
              <p className="text-[10px] font-semibold text-[#111439]/40">
                {count} report{count === 1 ? '' : 's'}
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#111439]/5">
              <div
                className="h-full rounded-full bg-[#111439]"
                style={{ width: `${Math.max(8, percent)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function polarPoint(center, radius, angleDegrees) {
  const angleRadians = (Math.PI / 180) * angleDegrees;

  return {
    x: center + radius * Math.cos(angleRadians),
    y: center + radius * Math.sin(angleRadians),
  };
}

function ResumeReadinessRadar({ items }) {
  const cleanItems = toArray(items)
    .map((item) => ({
      axis: toText(item.axis, 'Unknown'),
      score: clamp(toNumber(item.score, 0)),
      description: toText(item.description, ''),
    }))
    .filter((item) => item.axis);

  if (!cleanItems.length) {
    return (
      <EmptyState
        title="No readiness radar yet."
        text="Run an ATS analysis to see multidimensional resume readiness."
      />
    );
  }

  const size = 300;
  const center = size / 2;
  const maxRadius = 92;
  const axisCount = cleanItems.length;
  const rings = [0.25, 0.5, 0.75, 1];

  const axisPoints = cleanItems.map((item, index) => {
    const angle = -90 + (360 / axisCount) * index;
    const outer = polarPoint(center, maxRadius, angle);
    const value = polarPoint(center, (maxRadius * item.score) / 100, angle);

    return {
      ...item,
      angle,
      outer,
      value,
    };
  });

  const valuePolygon = axisPoints
    .map((item) => `${item.value.x},${item.value.y}`)
    .join(' ');

  const readinessAverage = Math.round(
    cleanItems.reduce((sum, item) => sum + item.score, 0) / cleanItems.length,
  );

  return (
    <div>
      <div className="relative mx-auto flex justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="h-[280px] w-full max-w-[360px]"
          role="img"
          aria-label="Resume readiness radar chart"
        >
          {rings.map((ring) => {
            const points = axisPoints
              .map((item) => {
                const point = polarPoint(center, maxRadius * ring, item.angle);
                return `${point.x},${point.y}`;
              })
              .join(' ');

            return (
              <polygon
                key={ring}
                points={points}
                fill="none"
                stroke="#111439"
                strokeOpacity="0.08"
                strokeWidth="1"
              />
            );
          })}

          {axisPoints.map((item) => (
            <line
              key={item.axis}
              x1={center}
              y1={center}
              x2={item.outer.x}
              y2={item.outer.y}
              stroke="#111439"
              strokeOpacity="0.08"
              strokeWidth="1"
            />
          ))}

          <polygon
            points={valuePolygon}
            fill="#106EBE"
            fillOpacity="0.18"
            stroke="#106EBE"
            strokeWidth="2.5"
          />

          {axisPoints.map((item) => (
            <circle
              key={`${item.axis}-point`}
              cx={item.value.x}
              cy={item.value.y}
              r="4"
              fill="#0FFCBE"
              stroke="#106EBE"
              strokeWidth="2"
            />
          ))}

          {axisPoints.map((item) => {
            const labelPoint = polarPoint(center, maxRadius + 34, item.angle);

            return (
              <text
                key={`${item.axis}-label`}
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-[#111439] text-[9px] font-semibold"
              >
                {item.axis.length > 16 ? `${item.axis.slice(0, 15)}…` : item.axis}
              </text>
            );
          })}

          <text
            x={center}
            y={center - 3}
            textAnchor="middle"
            className="fill-[#111439] text-[18px] font-semibold"
          >
            {readinessAverage}%
          </text>
          <text
            x={center}
            y={center + 16}
            textAnchor="middle"
            className="fill-[#111439] text-[9px] font-semibold opacity-50"
          >
            readiness
          </text>
        </svg>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {cleanItems.map((item) => (
          <div key={item.axis} className="rounded-xl border border-[#111439]/5 bg-white/70 p-3">
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-[#111439]">{item.axis}</p>
              <p className={`text-xs font-semibold ${getScoreTone(item.score)}`}>{item.score}%</p>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-[#111439]/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#106EBE] to-[#0FFCBE]"
                style={{ width: `${item.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApplicationPipelinePanel({ applicationMetrics }) {
  const statusDistribution = toArray(applicationMetrics?.status_distribution);
  const clean = statusDistribution.filter((item) => toNumber(item.count, 0) > 0);

  if (!clean.length) {
    return (
      <EmptyState
        title="No applications tracked yet."
        text="Save jobs from JSearch or add applications manually to see your pipeline."
      />
    );
  }

  const total = clean.reduce((sum, item) => sum + toNumber(item.count, 0), 0) || 1;

  return (
    <div className="space-y-4">
      {statusDistribution.map((item) => {
        const status = toText(item.status, '');
        const label = toText(item.label, getStatusLabel(status));
        const count = toNumber(item.count, 0);
        const percent = Math.round((count / total) * 100);

        return (
          <div key={status || label}>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-semibold text-[#111439]">{label}</p>
              <p className="text-[10px] font-semibold text-[#111439]/40">
                {count} application{count === 1 ? '' : 's'}
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#111439]/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#106EBE] to-[#0FFCBE]"
                style={{ width: count ? `${Math.max(8, percent)}%` : '0%' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecentApplicationsList({ applications }) {
  if (!applications.length) {
    return (
      <EmptyState
        title="No recent applications."
        text="Tracked jobs will appear here after you save or apply to them."
      />
    );
  }

  return (
    <div className="space-y-2">
      {applications.slice(0, 6).map((application, index) => {
        const status = toText(application.status, 'saved');
        const title = toText(application.job_title, 'Untitled job');
        const company = toText(application.company_name, 'Company not listed');

        return (
          <div
            key={application.id || index}
            className="rounded-xl border border-transparent bg-white/60 p-3 transition-colors hover:border-[#111439]/5 hover:bg-white"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-[#111439]">{title}</h3>
                <p className="mt-1 truncate text-xs font-semibold text-[#111439]/50">
                  {company}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${getStatusStyle(status)}`}
              >
                {getStatusLabel(status)}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] font-semibold text-[#111439]/40">
              <span>Updated {formatDate(application.updated_at)}</span>
              {application.next_follow_up_date && (
                <span>Follow up {formatDate(application.next_follow_up_date)}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ResumeActivityList({ resumes }) {
  if (!resumes.length) {
    return (
      <EmptyState
        title="No resume activity yet."
        text="Upload resumes to build your personal dashboard activity."
      />
    );
  }

  return (
    <div className="space-y-1">
      {resumes.slice(0, 6).map((resume, index) => {
        const name = toText(resume.name, 'Resume');
        const initial = name.charAt(0).toUpperCase();

        return (
          <div
            key={resume.id || index}
            className="flex items-center justify-between rounded-xl border border-transparent p-3 transition-colors hover:border-[#111439]/5 hover:bg-white"
          >
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#111439]/5 bg-[#F8F8F9] text-xs font-semibold text-[#111439]">
                {initial}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-[#111439]">{name}</h3>
                <p className="text-xs font-medium text-[#111439]/60">
                  {toNumber(resume.reports_count, 0)} ATS report
                  {toNumber(resume.reports_count, 0) === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-[#111439]/40">
              <Clock size={10} />
              {formatDate(resume.uploaded_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AiInsightCard({ type, title, text, actionLabel, actionTo, icon: Icon, tone = 'blue' }) {
  const toneClasses = {
    blue: {
      card: 'from-white to-[#106EBE]/5 border-[#106EBE]/20',
      stripe: 'bg-[#106EBE]',
      badge: 'bg-[#106EBE]/10 text-[#106EBE]',
      button: 'border-[#106EBE]/20 text-[#106EBE] hover:bg-[#106EBE] hover:text-white',
    },
    green: {
      card: 'from-white to-[#0FFCBE]/10 border-[#0D9476]/20',
      stripe: 'bg-[#0D9476]',
      badge: 'bg-[#0FFCBE]/20 text-[#0D9476]',
      button: 'border-[#0D9476]/20 text-[#0D9476] hover:bg-[#0D9476] hover:text-white',
    },
    dark: {
      card: 'from-white to-[#111439]/5 border-[#111439]/10',
      stripe: 'bg-[#111439]',
      badge: 'bg-[#111439]/5 text-[#111439]/60',
      button: 'border-[#111439]/10 text-[#111439] hover:bg-[#111439] hover:text-white',
    },
  };

  const classes = toneClasses[tone] || toneClasses.blue;

  return (
    <div className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-sm ${classes.card}`}>
      <div className={`absolute left-0 top-0 h-full w-1 ${classes.stripe}`} />
      <div className="mb-3 flex items-start justify-between">
        <span
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest ${classes.badge}`}
        >
          <Icon size={10} />
          {type}
        </span>
        <Sparkles
          className="text-[#106EBE] opacity-40 transition-opacity group-hover:opacity-100"
          size={14}
        />
      </div>

      <h3 className="mb-2 text-sm font-semibold leading-tight text-[#111439]">{title}</h3>
      <p className="mb-4 text-xs leading-relaxed text-[#111439]/70">{text}</p>

      {actionTo && actionLabel && (
        <Link
          to={actionTo}
          className={`inline-flex items-center gap-1 rounded-xl border bg-white px-3 py-2 text-xs font-semiboldshadow-sm transition-colors ${classes.button}`}
        >
          {actionLabel}
          <ChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}

function CareerGuidanceModal({
  open,
  form,
  setForm,
  loading,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  const inputClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';

  const labelClass =
    'text-xs font-semibold uppercase tracking-widest text-slate-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-700 ring-1 ring-blue-100">
              <BrainCircuit size={14} />
              Career guidance
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
              Generate personalized career guidance
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Tell CareerLens where you want to go, what is holding you back, and what kind of roles you want. The dashboard signals will be used together with your answers.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="max-h-[calc(92vh-9rem)] overflow-y-auto p-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Career goals</span>
              <textarea
                value={form.career_goals}
                onChange={(event) => setForm({ ...form, career_goals: event.target.value })}
                rows={4}
                placeholder="Example: I want to move into a frontend developer role or a stronger hospitality role..."
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Current struggles / pain points</span>
              <textarea
                value={form.pain_points}
                onChange={(event) => setForm({ ...form, pain_points: event.target.value })}
                rows={4}
                placeholder="Example: I am not sure which jobs fit me, my ATS score is low, I lack experience..."
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Strengths</span>
              <textarea
                value={form.strengths}
                onChange={(event) => setForm({ ...form, strengths: event.target.value })}
                rows={3}
                placeholder="Example: communication, teamwork, React, customer service, fast learner..."
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Weaknesses / gaps</span>
              <textarea
                value={form.weaknesses}
                onChange={(event) => setForm({ ...form, weaknesses: event.target.value })}
                rows={3}
                placeholder="Example: limited experience, missing keywords, weak projects, nervous interviews..."
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Jobs you want</span>
              <input
                value={form.target_jobs}
                onChange={(event) => setForm({ ...form, target_jobs: event.target.value })}
                placeholder="Example: Frontend Developer, Server, Office Assistant"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Companies you want</span>
              <input
                value={form.target_companies}
                onChange={(event) => setForm({ ...form, target_companies: event.target.value })}
                placeholder="Example: hotels, restaurants, tech companies, specific company names"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Preferred industries</span>
              <input
                value={form.preferred_industries}
                onChange={(event) => setForm({ ...form, preferred_industries: event.target.value })}
                placeholder="Example: Hospitality, Software, Admin, Healthcare"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Timeline</span>
              <input
                value={form.timeline}
                onChange={(event) => setForm({ ...form, timeline: event.target.value })}
                placeholder="Example: I want to get interviews within 30 days"
                className={inputClass}
              />
            </label>

            <label className="block lg:col-span-2">
              <span className={labelClass}>Long-term goals</span>
              <textarea
                value={form.long_term_goals}
                onChange={(event) => setForm({ ...form, long_term_goals: event.target.value })}
                rows={3}
                placeholder="Example: I want to become a senior frontend developer, restaurant supervisor, or move into IT support..."
                className={inputClass}
              />
            </label>

            <label className="block lg:col-span-2">
              <span className={labelClass}>Constraints or extra notes</span>
              <textarea
                value={`${form.constraints}${form.extra_notes ? `\n${form.extra_notes}` : ''}`}
                onChange={(event) => setForm({ ...form, constraints: event.target.value })}
                rows={3}
                placeholder="Example: I can only work part-time, I need remote/hybrid, I am a student, I need beginner-friendly roles..."
                className={inputClass}
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-5 text-slate-500">
              CareerLens will combine your answers with ATS scores, readiness radar, repeated gaps, and application pipeline data.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
                {loading ? 'Generating...' : 'Generate guidance'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function CareerGuidancePanel({ guidance, loading, onOpen }) {
  const actions = toArray(guidance?.priority_actions);
  const hasGuidance = Boolean(guidance?.headline || actions.length);

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-700 ring-1 ring-blue-100">
          <Compass size={13} />
          Career guidance
        </span>

        <button
          type="button"
          onClick={onOpen}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {hasGuidance ? 'Regenerate' : 'Generate'}
        </button>
      </div>

      {!hasGuidance ? (
        <div>
          <h3 className="text-base font-semibold leading-7 text-slate-950">
            Build your Career Intelligence brief
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Add your goals, target roles, companies, strengths, weaknesses, and current struggles. CareerLens will turn your dashboard signals into a realistic action plan.
          </p>

          <button
            type="button"
            onClick={onOpen}
            disabled={loading}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            <BrainCircuit size={16} />
            Start guidance form
          </button>
        </div>
      ) : (
        <div>
          <h3 className="text-base font-semibold leading-7 text-slate-950">
            {toText(guidance.headline, 'Personalized career guidance')}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {toText(guidance.career_positioning, guidance.readiness_summary)}
          </p>

          {!!actions.length && (
            <div className="mt-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Priority actions
              </p>

              {actions.slice(0, 3).map((item, index) => (
                <div
                  key={item.id || index}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700 ring-1 ring-slate-200">
                      <Rocket size={15} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-6 text-slate-900">
                        {toText(item.title, 'Career action')}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {toText(item.reason, '')}
                      </p>
                      <p className="mt-2 text-xs font-semibold leading-5 text-blue-700">
                        {toText(item.next_step, '')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!!normalizeGuidanceList(guidance?.next_7_days).length && (
            <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
                Next 7 days
              </p>
              <ul className="mt-3 space-y-2">
                {normalizeGuidanceList(guidance.next_7_days).slice(0, 3).map((item) => (
                  <li key={item} className="flex gap-2 text-xs leading-5 text-emerald-800">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <Link
        to="/career-guidance"
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111439] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1a1f54]"
      >
       See Full Guidance
      <ChevronRight size={16} />
      </Link>
 
    </div>
  );
}

function CareerGuidancePreviewCard({ guidance, loadingAi, onGenerate }) {
  const actions = getGuidanceActions(guidance);
  const hasGuidance = Boolean(guidance?.headline || actions.length);
  const previewText = getGuidancePreviewText(guidance);

  return (
    <div className="rounded-2xl border border-[#111439]/10 bg-white/80 p-5 shadow-sm backdrop-blur-md">
      <div className="mb-3 flex items-start justify-between">
        <span className="inline-flex items-center gap-1 rounded bg-[#106EBE]/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-[#106EBE]">
          <Compass size={10} />
          Career guidance
        </span>

        <Sparkles size={14} className="text-[#106EBE]/40" />
      </div>

      {!hasGuidance ? (
        <>
          <h3 className="mb-2 text-sm font-semibold leading-tight text-[#111439]">
            Build your Career Intelligence plan
          </h3>

          <p className="mb-4 text-xs leading-6 text-[#111439]/65">
            Generate a personalized plan from your goals, target roles, companies,
            strengths, weaknesses, and dashboard signals.
          </p>

          <button
            type="button"
            onClick={onGenerate}
            disabled={loadingAi}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#111439] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1a1f54] disabled:opacity-60"
          >
            {loadingAi ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <BrainCircuit size={14} />
            )}
            {loadingAi ? 'Generating...' : 'Generate guidance'}
          </button>
        </>
      ) : (
        <>
          <h3 className="mb-2 text-sm font-semibold leading-tight text-[#111439]">
            {toText(guidance?.headline, 'Personalized career plan')}
          </h3>

          <p className="mb-4 line-clamp-3 text-xs leading-6 text-[#111439]/65">
            {previewText}
          </p>

          {!!actions.length && (
            <div className="mb-4 space-y-2">
              {actions.slice(0, 2).map((item, index) => (
                <div key={item.id || index} className="rounded-xl bg-[#F8F8F9] p-3">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-[#106EBE] ring-1 ring-[#111439]/5">
                      <Rocket size={12} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-5 text-[#111439]">
                        {item.title}
                      </p>

                      {(item.nextStep || item.reason) && (
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-5 text-[#111439]/55">
                          {item.nextStep || item.reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/career-guidance"
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#111439] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#1a1f54]"
            >
              View full plan
              <ChevronRight size={12} />
            </Link>

            <button
              type="button"
              onClick={onGenerate}
              disabled={loadingAi}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#106EBE]/20 bg-white px-3 py-2.5 text-xs font-semibold text-[#106EBE] transition hover:bg-[#106EBE] hover:text-white disabled:opacity-60"
            >
              {loadingAi ? 'Generating...' : 'Regenerate'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAi, setLoadingAi] = useState(false);
  const [message, setMessage] = useState('');
  const [guidanceModalOpen, setGuidanceModalOpen] = useState(false);
  const [guidanceForm, setGuidanceForm] = useState(EMPTY_GUIDANCE_FORM);
  const [careerGuidance, setCareerGuidance] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem('careerlens_career_guidance') || 'null');
  } catch {
    return null;
  }
});

  async function load(useAi = false) {
    try {
    if (useAi) {
      setLoadingAi(true);
    } else {
      setLoading(true);
    }

    const result = await fetchDashboard({ useAi });

    if (useAi && result?.career_guidance) {
      localStorage.setItem(
        GUIDANCE_STORAGE_KEY,
        JSON.stringify(result.career_guidance),
      );
    }

    setData(result);
    setMessage('');
  } catch (error) {
    setMessage(getErrorMessage(error));
  } finally {
    setLoading(false);
    setLoadingAi(false);
  }
}

  useEffect(() => {
    load();
}, []);

async function handleGenerateCareerGuidance(event) {
  event.preventDefault();

  const hasUsefulInput = Object.values(guidanceForm).some((value) => String(value || '').trim());

  if (!hasUsefulInput) {
    setMessage('Please add at least one career goal, target role, company, strength, weakness, or current struggle.');
    return;
  }

  try {
    setLoadingAi(true);
    setMessage('');

    const result = await generateCareerGuidance(guidanceForm);

    setCareerGuidance(result);
    localStorage.setItem('careerlens_career_guidance', JSON.stringify(result));
    setGuidanceModalOpen(false);
  } catch (error) {
    setMessage(getErrorMessage(error));
  } finally {
    setLoadingAi(false);
  }
}

  const latest = data?.latest_report || {};
  const topMissing = toArray(data?.top_missing_keywords);
  const readinessRadar = toArray(latest?.readiness_radar);
  const distribution = toArray(data?.score_distribution);
  const resumeActivity = toArray(data?.resume_activity);
  const applicationMetrics = data?.application_metrics || {};
  const recentApplications = toArray(applicationMetrics?.recent_applications);

  const trend = toArray(data?.score_trend).map((item, index) => ({
    label: `R${index + 1}`,
    original_label: toText(item.label, ''),
    job_title: toText(item.job_title, ''),
    job_match_score: toNumber(item.job_match_score, 0),
    ats_readability_score: toNumber(item.ats_readability_score, 0),
  }));

  const trendSummary = useMemo(() => {
    if (trend.length < 2) return 'Create more reports for comparison.';

    const current = trend[trend.length - 1]?.job_match_score || 0;
    const previous = trend[trend.length - 2]?.job_match_score || 0;
    const change = Math.round(current - previous);

    if (change > 0) return `+${change} pts vs previous report`;
    if (change < 0) return `${change} pts vs previous report`;
    return 'No change vs previous report.';
  }, [trend]);

  const keywordInsight = topMissing[0]?.keyword || latest?.top_fixes?.[0] || '';
  const latestScore = toNumber(latest?.job_match_score, 0);
  const latestReadability = toNumber(latest?.ats_readability_score, 0);
  const totalReports = toNumber(data?.total_reports, 0);
  const totalApplications = toNumber(applicationMetrics?.total_applications, 0);
  const activeApplications = toNumber(applicationMetrics?.active_applications, 0);
  const interviewCount = toNumber(applicationMetrics?.interview_count, 0);
  const followupsDue = toNumber(applicationMetrics?.followups_due, 0);
  const responseRate = toNumber(applicationMetrics?.response_rate, 0);

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center ring-1 ring-slate-200">
        <Loader2 className="mx-auto animate-spin text-[#106EBE]" size={30} />
        <p className="mt-3 text-sm font-semibold text-[#111439]/60">Loading dashboard...</p>
      </div>
    );
  }

  const resumeKpis = [
    {
      label: 'Uploaded resumes',
      value: toNumber(data?.total_resumes, 0),
      trend: 'Stored in your account',
      icon: FileText,
      color: 'text-[#106EBE]',
    },
    {
      label: 'ATS reports',
      value: totalReports,
      trend: 'Resume/job comparisons',
      icon: Target,
      color: 'text-[#0D9476]',
    },
    {
      label: 'Avg. ATS match',
      value: `${toNumber(data?.average_job_match_score, 0)}%`,
      trend: totalReports
        ? `Across ${totalReports} report${totalReports === 1 ? '' : 's'}`
        : 'No reports yet',
      icon: FileCheck2,
      color: 'text-violet-600',
    },
    {
      label: 'Latest change',
      value: trend.length >= 2 ? trendSummary.split(' ')[0] : '—',
      trend: trend.length >= 2 ? 'Vs previous report' : 'Create more reports',
      icon: TrendingUp,
      color: 'text-[#0D9476]',
    },
  ];

  const applicationKpis = [
    {
      label: 'Tracked applications',
      value: totalApplications,
      trend: 'Saved and applied jobs',
      icon: Briefcase,
      color: 'text-[#106EBE]',
    },
    {
      label: 'Open pipeline',
      value: activeApplications,
      trend: 'Saved, applied, screening, interview',
      icon: CheckCircle2,
      color: 'text-[#0D9476]',
    },
    {
      label: 'Interviews',
      value: interviewCount,
      trend: 'Current interview stage',
      icon: Calendar,
      color: 'text-amber-600',
    },
    {
      label: 'Follow-ups due',
      value: followupsDue,
      trend: responseRate ? `${responseRate}% response rate` : 'Need attention today or earlier',
      icon: Clock,
      color: followupsDue > 0 ? 'text-rose-600' : 'text-[#111439]/50',
    },
  ];

  return (
    <div className="relative z-0 min-h-screen pb-12 font-['Inter',_ui-sans-serif,_system-ui,_sans-serif] text-slate-950 selection:bg-blue-100">
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-full max-w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-[#106EBE]/5 to-[#0FFCBE]/5 blur-[120px]" />

      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-700 ring-1 ring-blue-100">
            <BarChart3 size={12} />
            Command Center
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#111439]">
            Intelligence Dashboard
          </h1>
          <p className="mt-2 text-sm text-[#111439]/60">
            {formatToday()} • Track resume readiness, ATS progress, applications, and next career actions.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setGuidanceModalOpen(true)}
            disabled={loadingAi}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition-all duration-300 hover:bg-blue-50 disabled:opacity-60"
          >
            {loadingAi ? <Loader2 className="animate-spin" size={15} /> : <BrainCircuit size={15} />}
            Generate career guidance
          </button>

          <Link
            to="/jobs"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111439] px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-[#111439]/20 transition-all duration-300 hover:bg-[#1a1f54]"
          >
            <span>Find New Roles</span>
            <ChevronRight size={14} className="opacity-70" />
          </Link>
        </div>
      </header>

      {message && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
          {message}
        </div>
      )}

      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <FileCheck2 size={16} className="text-[#106EBE]" />
          <h2 className="text-sm font-semibold text-[#111439]">Resume Intelligence</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {resumeKpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <Briefcase size={16} className="text-[#0D9476]" />
          <h2 className="text-sm font-semibold text-[#111439]">Application Pipeline</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {applicationKpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <section className="rounded-2xl border border-[#111439]/5 bg-white/60 p-6 shadow-sm backdrop-blur-md">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-[#111439]">
                  ATS Progress Velocity
                </h2>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-[#111439]/50">
                  Recent report performance shown as R1, R2, R3...
                </p>
              </div>
              <span className="rounded-md border border-[#0D9476]/20 bg-[#0D9476]/10 px-2.5 py-1 text-[10px] font-semibold text-[#0D9476]">
                {trendSummary}
              </span>
            </div>

            <ScoreVelocityChart trend={trend} />
          </section>

          <section className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#111439]/5 bg-white/60 p-6 shadow-sm backdrop-blur-md">
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-[#111439]">
                  Application Pipeline
                </h2>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-[#111439]/50">
                  Status breakdown from your tracker
                </p>
              </div>
              <ApplicationPipelinePanel applicationMetrics={applicationMetrics} />
            </div>

            <div className="rounded-2xl border border-[#111439]/5 bg-white/60 p-6 shadow-sm backdrop-blur-md">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-[#111439]">
                    Recent Applications
                  </h2>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-[#111439]/50">
                    Latest saved or applied jobs
                  </p>
                </div>
                <Link
                  to="/applications"
                  className="text-xs font-semibold text-[#106EBE] transition-colors hover:text-[#111439]"
                >
                  View All
                </Link>
              </div>
              <RecentApplicationsList applications={recentApplications} />
            </div>
          </section>

          <section className="rounded-2xl border border-[#111439]/5 bg-white/60 p-6 shadow-sm backdrop-blur-md">
            <div className="mb-5 flex items-center justify-between border-b border-[#111439]/5 pb-4">
              <div>
                <h2 className="text-sm font-semibold text-[#111439]">Resume Activity</h2>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-[#111439]/50">
                  Recent uploads and report usage
                </p>
              </div>
              <Link
                to="/resumes"
                className="text-xs font-semibold text-[#106EBE] transition-colors hover:text-[#111439]"
              >
                View All
              </Link>
            </div>

            <ResumeActivityList resumes={resumeActivity} />
          </section>

          <section className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#111439]/5 bg-white/60 p-6 shadow-sm backdrop-blur-md">
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-[#111439]">
                  Resume Readiness Radar
                </h2>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-[#111439]/50">
                  Latest ATS report across multiple readiness dimensions
                </p>
              </div>
              <ResumeReadinessRadar items={readinessRadar} />
            </div>

            <div className="rounded-2xl border border-[#111439]/5 bg-white/60 p-6 shadow-sm backdrop-blur-md">
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-[#111439]">
                  Match Level Distribution
                </h2>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-[#111439]/50">
                  Report quality mix
                </p>
              </div>
              <DistributionPanel distribution={distribution} />
            </div>
          </section>
        </div>

        <aside className="space-y-4 xl:col-span-1">
          <div className="mb-2 flex items-center gap-2 px-1">
            <BrainCircuit size={16} className="text-[#106EBE]" />
            <h2 className="text-sm font-semibold text-[#111439]">
              CareerLens AI Engine
            </h2>
          </div>

          <AiInsightCard
            type="Application Strategy"
            title={
              totalApplications
                ? `${totalApplications} tracked application${totalApplications === 1 ? '' : 's'}`
                : 'Start tracking applications'
            }
            text={
              totalApplications
                ? `You have ${activeApplications} open pipeline item${activeApplications === 1 ? '' : 's'} and ${interviewCount} interview-stage application${interviewCount === 1 ? '' : 's'}. Move saved jobs to applied after tailoring your resume.`
                : 'Save jobs from JSearch or add applications manually so CareerLens can track your pipeline, follow-ups, and outcomes.'
            }
            actionLabel="Open Tracker"
            actionTo="/applications"
            icon={Briefcase}
            tone="dark"
          />

          <AiInsightCard
            type="Action Required"
            title={keywordInsight ? `Priority gap: ${keywordInsight}` : 'Create your first optimization signal'}
            text={
              keywordInsight
                ? 'This gap appears across your ATS history. Review whether it is truthful to add before tailoring or applying.'
                : 'Run more ATS reports to identify repeated keyword gaps and targeted improvement actions.'
            }
            actionLabel="Tailor Resume Now"
            actionTo="/tailor-resume"
            icon={AlertCircle}
            tone="blue"
          />

          <AiInsightCard
            type="Resume Optimization"
            title={
              latest.id
                ? `${toText(latest.job_title, 'Latest report')} readiness`
                : 'No latest ATS report yet'
            }
            text={
              latest.id
                ? `Your latest job match is ${latestScore}% and readability is ${latestReadability}%. Use these signals to decide whether to tailor again before applying.`
                : 'Create an ATS report to unlock latest resume/job readiness insights.'
            }
            actionLabel="Run ATS Analysis"
            actionTo="/ats"
            icon={TrendingUp}
            tone="green"
          />

          <CareerGuidancePanel
            guidance={careerGuidance}
            loading={loadingAi}
            onOpen={() => setGuidanceModalOpen(true)}
          />
        </aside>
      </div>

      {latest.id && (
        <section className="mt-8 rounded-2xl border border-[#111439]/5 bg-white/70 p-6 shadow-sm backdrop-blur-md">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#111439]">
                Latest ATS Snapshot
              </h2>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-[#111439]/50">
                Most recent resume/job comparison
              </p>
            </div>
            <Link
              to="/tailor-resume"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#106EBE] hover:text-[#111439]"
            >
              Tailor from report
              <ChevronRight size={12} />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-[#F8F8F9] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#111439]/40">
                Target job
              </p>
              <p className="mt-1 font-semibold text-[#111439]">
                {toText(latest.job_title, 'Not available')}
              </p>
              <p className="mt-1 truncate text-xs font-semibold text-[#111439]/40">
                {toText(latest.resume_name, 'Resume')}
              </p>
            </div>

            <div className="rounded-2xl bg-[#F8F8F9] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#111439]/40">
                Job match
              </p>
              <p className={`mt-1 font-semibold ${getScoreTone(latestScore)}`}>
                {latestScore}% - {toText(latest.match_level, 'Unknown')}
              </p>
            </div>

            <div className="rounded-2xl bg-[#F8F8F9] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#111439]/40">
                Readability
              </p>
              <p className={`mt-1 font-semibold ${getScoreTone(latestReadability)}`}>
                {latestReadability}% - {toText(latest.ats_readability_level, 'Unknown')}
              </p>
            </div>
          </div>
        </section>
      )}

      <CareerGuidanceModal
        open={guidanceModalOpen}
        form={guidanceForm}
        setForm={setGuidanceForm}
        loading={loadingAi}
        onClose={() => setGuidanceModalOpen(false)}
        onSubmit={handleGenerateCareerGuidance}
      />
    </div>
  );
}