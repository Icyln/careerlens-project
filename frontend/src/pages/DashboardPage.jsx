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
} from 'lucide-react';
import { fetchDashboard, getErrorMessage } from '../api/client.js';
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
        <p className="text-sm font-extrabold text-[#111439]">{title}</p>
        <p className="mt-1 max-w-sm text-xs leading-5 text-[#111439]/50">{text}</p>
      </div>
    </div>
  );
}

function KpiCard({ label, value, trend, icon: Icon, color = 'text-[#106EBE]' }) {
  return (
    <div className="rounded-2xl border border-[#111439]/5 bg-white/70 p-5 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[#106EBE]/20 hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#111439]/50">
          {label}
        </span>
        <div className={`rounded-lg border border-[#111439]/5 bg-white p-1.5 shadow-sm ${color}`}>
          <Icon size={15} />
        </div>
      </div>

      <p className="text-2xl font-extrabold text-[#111439] sm:text-3xl">{value}</p>
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
        <div className="flex flex-col justify-between pb-7 pr-2 text-[10px] font-bold text-[#111439]/30">
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
                    className={`absolute -top-12 max-w-[13rem] whitespace-normal rounded-md bg-[#111439] px-2 py-1 text-center text-[10px] font-bold text-white shadow-lg transition-all duration-200 ${
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
                    className={`absolute -bottom-6 text-[10px] font-bold transition-colors ${
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

      <div className="mt-8 flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-widest text-[#111439]/40">
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
              <p className="text-xs font-bold text-[#111439]">{level}</p>
              <p className="text-[10px] font-black text-[#111439]/40">
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
                className="fill-[#111439] text-[9px] font-bold"
              >
                {item.axis.length > 16 ? `${item.axis.slice(0, 15)}…` : item.axis}
              </text>
            );
          })}

          <text
            x={center}
            y={center - 3}
            textAnchor="middle"
            className="fill-[#111439] text-[18px] font-black"
          >
            {readinessAverage}%
          </text>
          <text
            x={center}
            y={center + 16}
            textAnchor="middle"
            className="fill-[#111439] text-[9px] font-bold opacity-50"
          >
            readiness
          </text>
        </svg>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {cleanItems.map((item) => (
          <div key={item.axis} className="rounded-xl border border-[#111439]/5 bg-white/70 p-3">
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="text-xs font-black text-[#111439]">{item.axis}</p>
              <p className={`text-xs font-black ${getScoreTone(item.score)}`}>{item.score}%</p>
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
              <p className="text-xs font-bold text-[#111439]">{label}</p>
              <p className="text-[10px] font-black text-[#111439]/40">
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
                <h3 className="truncate text-sm font-bold text-[#111439]">{title}</h3>
                <p className="mt-1 truncate text-xs font-semibold text-[#111439]/50">
                  {company}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${getStatusStyle(status)}`}
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#111439]/5 bg-[#F8F8F9] text-xs font-extrabold text-[#111439]">
                {initial}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-[#111439]">{name}</h3>
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
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${classes.badge}`}
        >
          <Icon size={10} />
          {type}
        </span>
        <Sparkles
          className="text-[#106EBE] opacity-40 transition-opacity group-hover:opacity-100"
          size={14}
        />
      </div>

      <h3 className="mb-2 text-sm font-bold leading-tight text-[#111439]">{title}</h3>
      <p className="mb-4 text-xs leading-relaxed text-[#111439]/70">{text}</p>

      {actionTo && actionLabel && (
        <Link
          to={actionTo}
          className={`inline-flex items-center gap-1 rounded-xl border bg-white px-3 py-2 text-xs font-bold shadow-sm transition-colors ${classes.button}`}
        >
          {actionLabel}
          <ChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAi, setLoadingAi] = useState(false);
  const [message, setMessage] = useState('');

  async function load(useAi = false) {
    try {
      if (useAi) {
        setLoadingAi(true);
      } else {
        setLoading(true);
      }

      const result = await fetchDashboard({ useAi });
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
    load(false);
  }, []);

  const latest = data?.latest_report || {};
  const guidance = data?.career_guidance || {};
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

  const recommendations = toArray(guidance.recommendations);
  const nextSteps = toArray(guidance.next_steps);

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
        <p className="mt-3 text-sm font-bold text-[#111439]/60">Loading dashboard...</p>
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
    <div className="relative z-0 min-h-screen pb-12 font-['CoFo_Sans',_Inter,_sans-serif] text-[#111439] selection:bg-[#0FFCBE]/30">
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-full max-w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-[#106EBE]/5 to-[#0FFCBE]/5 blur-[120px]" />

      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-[#111439]/10 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#106EBE] shadow-sm">
            <BarChart3 size={12} />
            Command Center
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#111439]">
            Intelligence Dashboard
          </h1>
          <p className="mt-1 text-sm text-[#111439]/60">
            {formatToday()} • Track resume readiness, ATS progress, applications, and next career actions.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => load(true)}
            disabled={loadingAi}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#106EBE]/20 bg-white px-4 py-2.5 text-xs font-bold text-[#106EBE] shadow-sm transition-all duration-300 hover:bg-[#106EBE] hover:text-white disabled:opacity-60"
          >
            {loadingAi ? <Loader2 className="animate-spin" size={14} /> : <BrainCircuit size={14} />}
            Generate AI Guidance
          </button>

          <Link
            to="/jobs"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111439] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#111439]/20 transition-all duration-300 hover:bg-[#1a1f54]"
          >
            <span>Find New Roles</span>
            <ChevronRight size={14} className="opacity-70" />
          </Link>
        </div>
      </header>

      {message && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
          {message}
        </div>
      )}

      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <FileCheck2 size={16} className="text-[#106EBE]" />
          <h2 className="text-sm font-extrabold text-[#111439]">Resume Intelligence</h2>
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
          <h2 className="text-sm font-extrabold text-[#111439]">Application Pipeline</h2>
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
                <h2 className="text-sm font-extrabold text-[#111439]">
                  ATS Progress Velocity
                </h2>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#111439]/50">
                  Recent report performance shown as R1, R2, R3...
                </p>
              </div>
              <span className="rounded-md border border-[#0D9476]/20 bg-[#0D9476]/10 px-2.5 py-1 text-[10px] font-bold text-[#0D9476]">
                {trendSummary}
              </span>
            </div>

            <ScoreVelocityChart trend={trend} />
          </section>

          <section className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#111439]/5 bg-white/60 p-6 shadow-sm backdrop-blur-md">
              <div className="mb-5">
                <h2 className="text-sm font-extrabold text-[#111439]">
                  Application Pipeline
                </h2>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#111439]/50">
                  Status breakdown from your tracker
                </p>
              </div>
              <ApplicationPipelinePanel applicationMetrics={applicationMetrics} />
            </div>

            <div className="rounded-2xl border border-[#111439]/5 bg-white/60 p-6 shadow-sm backdrop-blur-md">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-extrabold text-[#111439]">
                    Recent Applications
                  </h2>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#111439]/50">
                    Latest saved or applied jobs
                  </p>
                </div>
                <Link
                  to="/applications"
                  className="text-xs font-bold text-[#106EBE] transition-colors hover:text-[#111439]"
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
                <h2 className="text-sm font-extrabold text-[#111439]">Resume Activity</h2>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#111439]/50">
                  Recent uploads and report usage
                </p>
              </div>
              <Link
                to="/resumes"
                className="text-xs font-bold text-[#106EBE] transition-colors hover:text-[#111439]"
              >
                View All
              </Link>
            </div>

            <ResumeActivityList resumes={resumeActivity} />
          </section>

          <section className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#111439]/5 bg-white/60 p-6 shadow-sm backdrop-blur-md">
              <div className="mb-5">
                <h2 className="text-sm font-extrabold text-[#111439]">
                  Resume Readiness Radar
                </h2>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#111439]/50">
                  Latest ATS report across multiple readiness dimensions
                </p>
              </div>
              <ResumeReadinessRadar items={readinessRadar} />
            </div>

            <div className="rounded-2xl border border-[#111439]/5 bg-white/60 p-6 shadow-sm backdrop-blur-md">
              <div className="mb-5">
                <h2 className="text-sm font-extrabold text-[#111439]">
                  Match Level Distribution
                </h2>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#111439]/50">
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
            <h2 className="text-sm font-extrabold text-[#111439]">
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

          <div className="rounded-2xl border border-[#111439]/10 bg-white/80 p-5 shadow-sm backdrop-blur-md">
            <div className="mb-3 flex items-start justify-between">
              <span className="inline-flex items-center gap-1 rounded bg-[#111439]/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#111439]/60">
                <Target size={10} />
                AI Recommendations
              </span>
              <Calendar size={14} className="text-[#111439]/30" />
            </div>

            <h3 className="mb-2 text-sm font-bold leading-tight text-[#111439]">
              Smart career guidance
            </h3>

            <p className="mb-4 text-xs leading-relaxed text-[#111439]/70">
              {toText(
                guidance.headline,
                'Generate AI guidance after creating ATS reports. CareerLens will summarize your strongest next actions here.',
              )}
            </p>

            {!!recommendations.length && (
              <div className="mb-5">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#111439]/40">
                  Recommendations
                </p>
                <ul className="space-y-2">
                  {recommendations.slice(0, 3).map((item, index) => (
                    <li
                      key={index}
                      className="grid grid-cols-[10px_1fr] gap-2 text-xs leading-5 text-[#111439]/70"
                    >
                      <span className="pt-[1px] text-[#106EBE]">•</span>
                      <span className="text-justify">{toText(item, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!!nextSteps.length && (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#111439]/40">
                  Next steps
                </p>
                <ul className="space-y-2">
                  {nextSteps.slice(0, 3).map((item, index) => (
                    <li
                      key={index}
                      className="grid grid-cols-[10px_1fr] gap-2 text-xs leading-5 text-[#111439]/70"
                    >
                      <span className="pt-[1px] text-[#0D9476]">•</span>
                      <span className="text-justify">{toText(item, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!recommendations.length && !nextSteps.length && (
              <button
                type="button"
                onClick={() => load(true)}
                disabled={loadingAi}
                className="w-full rounded-xl border border-[#106EBE]/20 bg-white py-2.5 text-xs font-bold text-[#106EBE] shadow-sm transition-colors hover:bg-[#106EBE] hover:text-white disabled:opacity-60"
              >
                {loadingAi ? 'Generating...' : 'Generate AI Guidance'}
              </button>
            )}
          </div>
        </aside>
      </div>

      {latest.id && (
        <section className="mt-8 rounded-2xl border border-[#111439]/5 bg-white/70 p-6 shadow-sm backdrop-blur-md">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-[#111439]">
                Latest ATS Snapshot
              </h2>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#111439]/50">
                Most recent resume/job comparison
              </p>
            </div>
            <Link
              to="/tailor-resume"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#106EBE] hover:text-[#111439]"
            >
              Tailor from report
              <ChevronRight size={12} />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-[#F8F8F9] p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#111439]/40">
                Target job
              </p>
              <p className="mt-1 font-black text-[#111439]">
                {toText(latest.job_title, 'Not available')}
              </p>
              <p className="mt-1 truncate text-xs font-semibold text-[#111439]/40">
                {toText(latest.resume_name, 'Resume')}
              </p>
            </div>

            <div className="rounded-2xl bg-[#F8F8F9] p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#111439]/40">
                Job match
              </p>
              <p className={`mt-1 font-black ${getScoreTone(latestScore)}`}>
                {latestScore}% - {toText(latest.match_level, 'Unknown')}
              </p>
            </div>

            <div className="rounded-2xl bg-[#F8F8F9] p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#111439]/40">
                Readability
              </p>
              <p className={`mt-1 font-black ${getScoreTone(latestReadability)}`}>
                {latestReadability}% - {toText(latest.ats_readability_level, 'Unknown')}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}