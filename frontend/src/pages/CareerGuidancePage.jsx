import { Link, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  Clipboard,
  Compass,
  FileText,
  Lightbulb,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import { toArray, toText } from '../utils/safeRender.js';

function safeList(value) {
  return toArray(value)
    .map((item) => toText(item, ''))
    .filter(Boolean);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text || '');
  } catch {
    // Silent fallback. User can still select manually.
  }
}

function formatGuidanceForCopy(guidance) {
  if (!guidance) return '';

  const actions = toArray(guidance.priority_actions);

  return [
    toText(guidance.headline, 'Career Intelligence Plan'),
    '',
    'Career positioning:',
    toText(guidance.career_positioning, ''),
    '',
    'Target direction:',
    toText(guidance.target_direction, ''),
    '',
    'Readiness summary:',
    toText(guidance.readiness_summary, ''),
    '',
    'Priority actions:',
    ...actions.map((item, index) => {
      return `${index + 1}. ${toText(item.title, 'Action')}\nReason: ${toText(item.reason, '')}\nNext step: ${toText(item.next_step, '')}\nTimeframe: ${toText(item.timeframe, '')}`;
    }),
    '',
    'Next 7 days:',
    ...safeList(guidance.next_7_days).map((item) => `- ${item}`),
    '',
    'Next 30 days:',
    ...safeList(guidance.next_30_days).map((item) => `- ${item}`),
  ].join('\n');
}

function SectionCard({ title, icon: Icon, children, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  };

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${tones[tone] || tones.blue}`}>
          <Icon size={20} />
        </div>
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function BulletList({ items, empty = 'No items generated.' }) {
  const clean = safeList(items);

  if (!clean.length) {
    return <p className="text-sm leading-6 text-slate-400">{empty}</p>;
  }

  return (
    <ul className="space-y-3">
      {clean.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600">
          <CheckCircle2 size={17} className="mt-1 shrink-0 text-emerald-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ActionCard({ item, index }) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700 ring-1 ring-slate-200">
          {index + 1}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold leading-7 text-slate-950">
              {toText(item?.title, 'Career action')}
            </h3>
            {item?.timeframe && (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                {toText(item.timeframe, '')}
              </span>
            )}
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {toText(item?.reason, 'This action will improve your career readiness.')}
          </p>

          <div className="mt-4 rounded-2xl border border-blue-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
              Next step
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {toText(item?.next_step, 'Choose one specific step and complete it this week.')}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function CareerGuidancePage() {
  const location = useLocation();
  const guidance = location.state?.guidance || null;
  const actions = toArray(guidance?.priority_actions);
  const copyBody = formatGuidanceForCopy(guidance);

  if (!guidance) {
    return (
      <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-50 text-blue-700">
          <BrainCircuit size={26} />
        </div>

        <h1 className="mt-5 text-2xl font-semibold text-slate-950">
          No Career Action Plan yet
        </h1>

        <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-slate-500">
          Go back to the dashboard and run an ATS analysis. CareerLens will create an instant rule-based action plan from your latest ATS report.
        </p>

        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <ArrowLeft size={17} />
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-7 font-['Inter',_ui-sans-serif,_system-ui,_sans-serif] text-slate-950">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-4"> {/* <-- Added wrapper with gap */}
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
              >
               <ArrowLeft size={14} />
               Dashboard
              </Link>

             <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-700 ring-1 ring-blue-100">
               <Compass size={14} />
               Career Action Plan
             </div>
            </div>

            <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950">
              {toText(guidance.headline, 'Personalized career guidance')}
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
              {toText(guidance.career_positioning, guidance.readiness_summary)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => copyText(copyBody)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Clipboard size={17} />
            Copy plan
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-blue-50 p-5 ring-1 ring-blue-100">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
              Direction
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {toText(guidance.target_direction, 'Focus on the roles with strongest fit first.')}
            </p>
          </div>

          <div className="rounded-3xl bg-emerald-50 p-5 ring-1 ring-emerald-100">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
              Readiness
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {toText(guidance.readiness_summary, 'Use your dashboard scores as practical signals.')}
            </p>
          </div>

          <div className="rounded-3xl bg-amber-50 p-5 ring-1 ring-amber-100">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">
              Status
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {guidance.status === 'success'
                ? 'Generated instantly from your latest ATS report.'
                : toText(guidance.message, 'Rule-based career action plan was generated safely.')}
            </p>
          </div>
        </div>
      </section>

      <SectionCard title="Priority actions" icon={Rocket} tone="blue">
        <div className="space-y-4">
          {actions.length ? (
            actions.slice(0, 3).map((item, index) => (
              <ActionCard key={item.id || index} item={item} index={index} />
            ))
          ) : (
            <p className="text-sm text-slate-400">No priority actions generated.</p>
          )}
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="7-day sprint" icon={CheckCircle2} tone="emerald">
          <BulletList items={guidance.next_7_days} />
        </SectionCard>

        <SectionCard title="30-day roadmap" icon={Target} tone="blue">
          <BulletList items={guidance.next_30_days} />
        </SectionCard>

        <SectionCard title="Resume focus" icon={FileText} tone="slate">
          <BulletList items={guidance.resume_focus} />
        </SectionCard>

        <SectionCard title="Application strategy" icon={Compass} tone="blue">
          <BulletList items={guidance.application_strategy} />
        </SectionCard>

        <SectionCard title="Skill plan" icon={Lightbulb} tone="emerald">
          <BulletList items={guidance.skill_plan} />
        </SectionCard>

        <SectionCard title="Risks to avoid" icon={AlertTriangle} tone="amber">
          <BulletList items={guidance.risk_warnings} />
        </SectionCard>
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-cyan-300">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold">Use this plan honestly</h2>
            <p className="mt-2 text-sm leading-7 text-white/65">
              Treat this plan as guidance, not a promise. Keep your resume truthful, prioritize roles where you have real evidence, and rerun ATS analysis after editing to validate improvements.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}