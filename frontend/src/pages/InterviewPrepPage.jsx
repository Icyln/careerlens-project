import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Circle,
  Clipboard,
  Download,
  Eye,
  EyeOff,
  FileText,
  HelpCircle,
  ListChecks,
  Loader2,
  MessageSquareText,
  PenLine,
  RefreshCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  UploadCloud,
  UserRound,
} from 'lucide-react';
import Alert from '../components/Alert.jsx';
import FileDropzone from '../components/FileDropzone.jsx';
import {
  fetchResumes,
  generateResumeInterviewPrep,
  getErrorMessage,
  uploadResume,
} from '../api/client.js';
import { formatDateTime } from '../utils/format.js';
import { toArray, toText } from '../utils/safeRender.js';

const INTERVIEW_TYPES = [
  {
    value: 'role_specific',
    label: 'Role-specific',
    helper: 'Daily responsibilities, role expectations, and job-specific fit.',
    icon: Target,
  },
  {
    value: 'behavioral',
    label: 'Behavioral',
    helper: 'Teamwork, pressure, communication, conflict, and reliability.',
    icon: UserRound,
  },
  {
    value: 'technical_practical',
    label: 'Technical / Practical',
    helper: 'Hands-on tasks, tools, workflow, accuracy, and scenarios.',
    icon: ListChecks,
  },
  {
    value: 'final_round',
    label: 'Final round',
    helper: 'Motivation, strengths, availability, fit, and final decision questions.',
    icon: MessageSquareText,
  },
];

const DIFFICULTIES = [
  { value: 'starter', label: 'Starter', helper: 'Simple and confidence-building' },
  { value: 'real_interview', label: 'Real Interview', helper: 'Balanced and realistic' },
  { value: 'challenging', label: 'Challenging', helper: 'More demanding practice' },
];

const FOCUS_AREAS = [
  { value: 'all', label: 'All areas' },
  { value: 'resume_experience', label: 'Resume experience' },
  { value: 'job_requirements', label: 'Job requirements' },
  { value: 'missing_skills', label: 'Missing skills / gaps' },
  { value: 'customer_service', label: 'Customer service / teamwork' },
  { value: 'technical_skills', label: 'Technical skills' },
];

const EMPTY_FORM = {
  job_title: '',
  job_description: '',
  interview_type: 'role_specific',
  difficulty: 'real_interview',
  focus_area: 'all',
  user_notes: '',
};

const COOLDOWN_SECONDS = 18;

const RESULT_TABS = [
  { value: 'questions', label: 'Practice questions' },
  { value: 'intro', label: '60-second intro' },
  { value: 'extras', label: 'Extra prep' },
];

function cleanResumes(value) {
  return Array.isArray(value) ? value : value?.results || [];
}

function safeList(value) {
  return toArray(value)
    .map((item) => toText(item, ''))
    .filter(Boolean);
}

function getDifficultyLabel(value) {
  return DIFFICULTIES.find((item) => item.value === value)?.label || 'Real Interview';
}

function getInterviewTypeLabel(value) {
  return INTERVIEW_TYPES.find((item) => item.value === value)?.label || 'Role-specific';
}

async function copyText(text, setMessage, label = 'Copied to clipboard.') {
  try {
    await navigator.clipboard.writeText(text || '');
    setMessage({ type: 'success', text: label });
  } catch {
    setMessage({ type: 'error', text: 'Could not copy text. Please copy it manually.' });
  }
}

function downloadTextFile(text, filename = 'interview_prep.txt') {
  const blob = new Blob([text || ''], {
    type: 'text/plain;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function cleanFileName(value = 'interview_prep') {
  return String(value || 'interview_prep')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'interview_prep';
}

function questionKey(question, index, prefix = 'main') {
  return `${prefix}-${question?.id || index}`;
}

function formatQuestionForExport(question, index, note = '', practiced = false) {
  return [
    `${index + 1}. ${toText(question?.question, 'Interview question')}`,
    `Category: ${toText(question?.category, 'Interview')}`,
    `Practiced: ${practiced ? 'Yes' : 'No'}`,
    '',
    'Sample answer:',
    toText(question?.sample_answer, ''),
    note ? `\nMy notes:\n${note}` : '',
  ].filter(Boolean).join('\n');
}

function formatPrepForExport(result, notesByQuestion = {}, practicedByQuestion = {}) {
  if (!result) return '';

  const mainQuestions = toArray(result.questions);
  const toughQuestions = toArray(result.tough_questions);

  return [
    toText(result.interview_title, 'CareerLens Interview Prep'),
    '',
    `Target role: ${toText(result.target_role, '')}`,
    `Interview type: ${getInterviewTypeLabel(toText(result.interview_type, ''))}`,
    `Difficulty: ${getDifficultyLabel(toText(result.difficulty, 'real_interview'))}`,
    `Main risk area: ${toText(result.main_risk_area, '')}`,
    '',
    '60-Second Introduction',
    toText(result.self_intro, ''),
    '',
    'Resume Talking Points',
    ...safeList(result.resume_talking_points).map((item) => `- ${item}`),
    '',
    'Practice Questions',
    ...mainQuestions.map((item, index) => {
      const key = questionKey(item, index, 'main');
      return `\n${formatQuestionForExport(
        item,
        index,
        notesByQuestion[key],
        Boolean(practicedByQuestion[key]),
      )}`;
    }),
    '',
    'Tough Question to Prepare For',
    ...toughQuestions.map((item, index) => {
      const key = questionKey(item, index, 'tough');
      return `\n${formatQuestionForExport(
        item,
        index,
        notesByQuestion[key],
        Boolean(practicedByQuestion[key]),
      )}`;
    }),
    '',
    'Questions to Ask the Employer',
    ...safeList(result.questions_to_ask).map((item) => `- ${item}`),
    '',
    'Final Tips',
    ...safeList(result.final_tips).map((item) => `- ${item}`),
    '',
    'Truthfulness Reminders',
    ...safeList(result.safety_notes).map((item) => `- ${item}`),
  ].join('\n');
}

function Pill({ children, tone = 'slate' }) {
  const classes = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${classes[tone] || classes.slate}`}>
      {children}
    </span>
  );
}

function Field({ label, helper, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <div className="mt-2">{children}</div>
      {helper && <p className="mt-1.5 text-xs leading-5 text-slate-400">{helper}</p>}
    </label>
  );
}

function TypeCard({ item, selected, onClick }) {
  const Icon = item.icon || Target;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-2xl border p-4 text-left transition ${
        selected
          ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-500/10'
          : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-blue-700'
          }`}
        >
          <Icon size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-950">{item.label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{item.helper}</p>
        </div>
      </div>
    </button>
  );
}

function OptionCard({ selected, title, helper, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-left transition ${
        selected
          ? 'border-slate-950 bg-slate-950 text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      <p className="text-sm font-semibold">{title}</p>
      {helper && (
        <p className={`mt-1 text-xs ${selected ? 'text-white/65' : 'text-slate-400'}`}>
          {helper}
        </p>
      )}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[28rem] items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-white/70 p-8 text-center shadow-sm">
      <div>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-50 text-blue-700">
          <BrainCircuit size={27} />
        </div>
        <h3 className="mt-5 text-xl font-semibold text-slate-950">
          Your interview practice set will appear here
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Choose a resume, paste a job description, select one question type, then generate a focused practice set.
        </p>
      </div>
    </div>
  );
}

function SnapshotCard({ icon: Icon, label, value, tone = 'blue' }) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-700'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-blue-50 text-blue-700';

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${toneClass}`}>
        <Icon size={17} />
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">
        {value || 'N/A'}
      </p>
    </div>
  );
}

function PracticeProgress({ total, practiced }) {
  const percent = total ? Math.round((practiced / total) * 100) : 0;

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-950">Practice progress</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Mark questions as practiced after you answer them aloud.
          </p>
        </div>
        <Pill tone={percent >= 100 ? 'emerald' : 'blue'}>{percent}%</Pill>
      </div>

      <div className="mt-4 h-2 rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-3 text-xs font-semibold text-slate-500">
        {practiced} of {total} questions practiced
      </p>
    </div>
  );
}

function PrepWorkflowCard() {
  const items = [
    {
      title: 'Resume aligned',
      text: 'Answers are guided by the selected resume, so practice stays realistic.',
    },
    {
      title: 'JD targeted',
      text: 'Questions are shaped by the pasted job description and selected interview type.',
    },
    {
      title: 'Practice ready',
      text: 'Use answer reveal, notes, progress tracking, copy, and export for rehearsal.',
    },
  ];

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Sparkles size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-950">Preparation workflow</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            A focused workspace for interview rehearsal.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.title} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              {item.title}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  practiceMode,
  expanded,
  practiced,
  note,
  onToggle,
  onTogglePracticed,
  onNoteChange,
  onCopy,
}) {
  const showDetails = !practiceMode || expanded;

  return (
    <article className={`rounded-[1.5rem] border bg-white p-5 shadow-sm transition ${
      practiced ? 'border-emerald-200 ring-4 ring-emerald-500/5' : 'border-slate-200'
    }`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="blue">{toText(question?.category, 'Interview')}</Pill>
            <Pill tone={practiced ? 'emerald' : 'slate'}>
              {practiced ? 'Practiced' : `Question ${index + 1}`}
            </Pill>
          </div>

          <h3 className="mt-4 text-base font-semibold leading-7 text-slate-900">
            {toText(question?.question, 'Interview question')}
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onTogglePracticed}
            className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
              practiced
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {practiced ? <CheckCircle2 size={15} /> : <Circle size={15} />}
            {practiced ? 'Done' : 'Mark done'}
          </button>

          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <Clipboard size={15} />
            Copy
          </button>

          {practiceMode && (
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              {expanded ? <EyeOff size={15} /> : <Eye size={15} />}
              {expanded ? 'Hide answer' : 'Show answer'}
            </button>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2">
              <MessageSquareText size={16} className="text-blue-700" />
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Sample answer
              </p>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
              {toText(
                question?.sample_answer,
                'Prepare a truthful answer using your own real experience.'
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2">
              <PenLine size={15} className="text-slate-400" />
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                My practice notes
              </p>
            </div>
            <textarea
              value={note || ''}
              onChange={(event) => onNoteChange(event.target.value)}
              rows={3}
              placeholder="Write your own example, keywords to remember, or a better answer in your own voice..."
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </div>
      )}
    </article>
  );
}

function BulletPanel({ title, icon: Icon, items = [], tone = 'blue', empty = 'Nothing returned.' }) {
  const safeItems = safeList(items);
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-700'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-blue-50 text-blue-700';

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon size={18} />
        </div>
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      </div>

      <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
        {safeItems.length ? (
          safeItems.map((item) => (
            <li key={item} className="flex gap-2">
              <CheckCircle2 size={16} className="mt-1 shrink-0 text-emerald-600" />
              <span>{item}</span>
            </li>
          ))
        ) : (
          <li className="text-slate-400">{empty}</li>
        )}
      </ul>
    </div>
  );
}

function ResultsSection({
  result,
  selectedResume,
  selectedInterviewType,
  activeTab,
  setActiveTab,
  practiceMode,
  setPracticeMode,
  expandedQuestions,
  setExpandedQuestions,
  practicedQuestions,
  setPracticedQuestions,
  questionNotes,
  setQuestionNotes,
  setMessage,
}) {
  if (!result) return <EmptyState />;

  const questions = toArray(result.questions);
  const toughQuestions = toArray(result.tough_questions);
  const questionsToAsk = safeList(result.questions_to_ask);
  const finalTips = safeList(result.final_tips);
  const safetyNotes = safeList(result.safety_notes);

  const practicedCount = questions.reduce((count, question, index) => {
    const key = questionKey(question, index, 'main');
    return practicedQuestions[key] ? count + 1 : count;
  }, 0);

  const exportText = formatPrepForExport(result, questionNotes, practicedQuestions);
  const difficultyLabel = getDifficultyLabel(toText(result.difficulty, 'real_interview'));

  function toggleQuestion(key) {
    setExpandedQuestions((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function setAllExpanded(value) {
    const next = {};

    questions.forEach((question, index) => {
      next[questionKey(question, index, 'main')] = value;
    });

    toughQuestions.forEach((question, index) => {
      next[questionKey(question, index, 'tough')] = value;
    });

    setExpandedQuestions(next);
  }

  function togglePracticed(key) {
    setPracticedQuestions((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function updateNote(key, value) {
    setQuestionNotes((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <div className="space-y-6">
      {result.status === 'fallback' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium leading-6 text-amber-800">
          {result.message || 'CareerLens created a safe fallback interview prep kit.'}
          {' '}Review and personalize the sample answers before using them.
        </div>
      )}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
              Practice set
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              {selectedInterviewType.label} Questions
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {selectedResume?.original_name || 'Selected resume'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copyText(exportText, setMessage, 'Interview prep copied.')}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Clipboard size={16} />
              Copy all
            </button>

            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  exportText,
                  `${cleanFileName(`${result.target_role || 'interview'}_${selectedInterviewType.value}_prep`)}.txt`
                )
              }
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Download size={16} />
              Download TXT
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <SnapshotCard
            icon={Target}
            label="Target role"
            value={toText(result.target_role, '') || 'Target role'}
          />
          <SnapshotCard
            icon={MessageSquareText}
            label="Question type"
            value={selectedInterviewType.label}
          />
          <SnapshotCard
            icon={BrainCircuit}
            label="Difficulty"
            value={difficultyLabel}
          />
          <SnapshotCard
            icon={AlertTriangle}
            label="Main risk"
            value={toText(result.main_risk_area, '') || 'Prepare truthful examples and avoid claiming unsupported skills.'}
            tone="amber"
          />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_20rem]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">Practice workspace</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Try answering first, then reveal the sample answer and write your own notes.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPracticeMode((value) => !value)}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                  practiceMode
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {practiceMode ? <EyeOff size={16} /> : <Eye size={16} />}
                {practiceMode ? 'Practice mode on' : 'Practice mode off'}
              </button>

              <button
                type="button"
                onClick={() => setAllExpanded(true)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Show all
              </button>

              <button
                type="button"
                onClick={() => setAllExpanded(false)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Hide all
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {RESULT_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                  activeTab === tab.value
                    ? 'bg-slate-950 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <PracticeProgress total={questions.length} practiced={practicedCount} />
      </section>

      {activeTab === 'questions' && (
        <div className="space-y-4">
          {questions.length ? (
            questions.map((question, index) => {
              const key = questionKey(question, index, 'main');

              return (
                <QuestionCard
                  key={key}
                  question={question}
                  index={index}
                  practiceMode={practiceMode}
                  expanded={Boolean(expandedQuestions[key])}
                  practiced={Boolean(practicedQuestions[key])}
                  note={questionNotes[key] || ''}
                  onToggle={() => toggleQuestion(key)}
                  onTogglePracticed={() => togglePracticed(key)}
                  onNoteChange={(value) => updateNote(key, value)}
                  onCopy={() =>
                    copyText(
                      formatQuestionForExport(
                        question,
                        index,
                        questionNotes[key],
                        Boolean(practicedQuestions[key]),
                      ),
                      setMessage,
                      'Question copied.',
                    )
                  }
                />
              );
            })
          ) : (
            <EmptyState />
          )}
        </div>
      )}

      {activeTab === 'intro' && (
        <section className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
                  60-second intro
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">
                  Tell me about yourself
                </h3>
              </div>

              <button
                type="button"
                onClick={() => copyText(result.self_intro, setMessage, 'Self-introduction copied.')}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Clipboard size={16} />
                Copy intro
              </button>
            </div>

            <p className="mt-5 whitespace-pre-line text-sm leading-8 text-slate-700">
              {toText(result.self_intro, 'Generate questions to see your self-introduction.')}
            </p>
          </div>

          <BulletPanel
            title="Resume talking points"
            icon={UserRound}
            items={result.resume_talking_points}
            tone="emerald"
            empty="No talking points returned."
          />
        </section>
      )}

      {activeTab === 'extras' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <BulletPanel
            title="Questions to ask the employer"
            icon={HelpCircle}
            items={questionsToAsk}
            tone="blue"
            empty="No employer questions returned."
          />

          <BulletPanel
            title="Final interview tips"
            icon={Sparkles}
            items={finalTips}
            tone="emerald"
            empty="No final tips returned."
          />

          <div className="lg:col-span-2">
            <BulletPanel
              title="Truthfulness reminders"
              icon={ShieldCheck}
              items={safetyNotes}
              tone="amber"
              empty="No safety notes returned."
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function InterviewPrepPage() {
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [result, setResult] = useState(null);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [activeTab, setActiveTab] = useState('questions');
  const [practiceMode, setPracticeMode] = useState(true);
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [practicedQuestions, setPracticedQuestions] = useState({});
  const [questionNotes, setQuestionNotes] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const selectedResume = useMemo(
    () => resumes.find((resume) => String(resume.id) === String(selectedResumeId)) || null,
    [resumes, selectedResumeId],
  );

  const selectedInterviewType = useMemo(
    () => INTERVIEW_TYPES.find((item) => item.value === form.interview_type) || INTERVIEW_TYPES[0],
    [form.interview_type],
  );

  const selectedDifficulty = useMemo(
    () => DIFFICULTIES.find((item) => item.value === form.difficulty) || DIFFICULTIES[1],
    [form.difficulty],
  );

  async function loadResumes() {
    setLoadingResumes(true);

    try {
      const data = await fetchResumes();
      const clean = cleanResumes(data);
      setResumes(clean);

      if (clean.length && !selectedResumeId) {
        setSelectedResumeId(clean[0].id);
      }
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setLoadingResumes(false);
    }
  }

  useEffect(() => {
    loadResumes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldownLeft <= 0) return undefined;

    const timer = window.setTimeout(() => {
      setCooldownLeft((value) => Math.max(value - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldownLeft]);

  function resetPracticeState() {
    setExpandedQuestions({});
    setPracticedQuestions({});
    setQuestionNotes({});
    setActiveTab('questions');
  }

  async function handleUploadResume(file) {
    try {
      setUploadingResume(true);
      setMessage(null);

      const uploaded = await uploadResume(file);
      await loadResumes();

      if (uploaded?.id) {
        setSelectedResumeId(uploaded.id);
      }

      setMessage({ type: 'success', text: 'Resume uploaded and ready for interview prep.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setUploadingResume(false);
    }
  }

  async function handleGenerate(event) {
    event.preventDefault();

    if (!selectedResumeId) {
      setMessage({ type: 'error', text: 'Please choose or upload a resume first.' });
      return;
    }

    if (!form.job_title.trim()) {
      setMessage({ type: 'error', text: 'Please enter the target role.' });
      return;
    }

    if (!form.job_description.trim()) {
      setMessage({ type: 'error', text: 'Please paste the job description.' });
      return;
    }

    if (cooldownLeft > 0) {
      setMessage({
        type: 'error',
        text: `Please wait ${cooldownLeft}s before generating again.`,
      });
      return;
    }

    setGenerating(true);
    setMessage(null);
    resetPracticeState();

    try {
      const data = await generateResumeInterviewPrep(selectedResumeId, {
        job_title: form.job_title,
        job_description: form.job_description,
        interview_type: form.interview_type,
        difficulty: form.difficulty,
        focus_area: form.focus_area,
        user_notes: form.user_notes,
      });

      setResult(data);
      setCooldownLeft(COOLDOWN_SECONDS);

      if (data.status === 'success') {
        setMessage({
          type: 'success',
          text: `${selectedInterviewType.label} interview questions generated successfully.`,
        });
      } else if (data.status === 'fallback') {
        setMessage({
          type: 'warning',
          text: data.message || 'CareerLens created a safe fallback interview prep kit.',
        });
      } else {
        setMessage({
          type: 'error',
          text: data.message || 'Interview questions could not be generated.',
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-7">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-700 ring-1 ring-blue-100">
              <BrainCircuit size={14} />
              Gemini interview coach
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
              Interview Prep
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              Prepare for a real interview with focused questions, sample answers, practice notes, and export-ready prep materials.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[27rem]">
            <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <p className="text-xl font-semibold text-slate-950">Resume</p>
              <p className="mt-1 text-xs font-medium text-slate-500">selected source</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <p className="text-xl font-semibold text-slate-950">Interview</p>
              <p className="mt-1 text-xs font-medium text-slate-500">guided questions</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <p className="text-xl font-semibold text-slate-950">Notes</p>
              <p className="mt-1 text-xs font-medium text-slate-500">practice tracking</p>
            </div>
          </div>
        </div>
      </section>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      <form onSubmit={handleGenerate} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
              Settings
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              Build a focused practice set
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Choose the resume, target role, job description, and one interview question type.
            </p>
          </div>

          <button
            type="submit"
            disabled={generating || uploadingResume || !selectedResumeId || cooldownLeft > 0}
            className="inline-flex min-w-[15rem] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-400 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {generating ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {generating
              ? 'Generating...'
              : cooldownLeft > 0
                ? `Wait ${cooldownLeft}s`
                : result
                  ? `Regenerate ${selectedInterviewType.label}`
                  : `Generate ${selectedInterviewType.label}`}
          </button>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[0.95fr_1.15fr_0.8fr]">
          <div className="space-y-4">
            <Field label="Resume" helper="Choose an existing resume or upload another one.">
              <select
                value={selectedResumeId}
                onChange={(event) => {
                  setSelectedResumeId(event.target.value);
                  setResult(null);
                  resetPracticeState();
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                disabled={loadingResumes || uploadingResume}
              >
                {loadingResumes && <option>Loading resumes...</option>}
                {!loadingResumes && resumes.length === 0 && <option value="">No resumes yet</option>}
                {resumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.original_name || 'Resume'} • {resume.uploaded_at ? formatDateTime(resume.uploaded_at) : 'Uploaded'}
                  </option>
                ))}
              </select>
            </Field>

            {selectedResume && (
              <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700 ring-1 ring-slate-200">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {selectedResume.original_name || 'Selected resume'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {selectedResume.uploaded_at ? formatDateTime(selectedResume.uploaded_at) : 'Recently uploaded'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <UploadCloud size={16} />
                Upload another resume
              </div>
              <FileDropzone
                compact
                disabled={uploadingResume}
                onFileSelected={handleUploadResume}
              />
            </div>
          </div>

          <div className="space-y-4">
            <Field label="Target role" helper="Example: Server, Frontend Developer, Office Assistant">
              <input
                value={form.job_title}
                onChange={(event) => {
                  setForm({ ...form, job_title: event.target.value });
                  setResult(null);
                }}
                placeholder="Server"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </Field>

            <Field label="Job description" helper="Paste the role description you are preparing for.">
              <textarea
                value={form.job_description}
                onChange={(event) => {
                  setForm({ ...form, job_description: event.target.value });
                  setResult(null);
                }}
                rows={7}
                placeholder="Paste the job description here..."
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </Field>
          </div>

          <div className="space-y-4">
            <Field label="Difficulty" helper={selectedDifficulty.helper}>
              <select
                value={form.difficulty}
                onChange={(event) => setForm({ ...form, difficulty: event.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                {DIFFICULTIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>

            <PrepWorkflowCard />
          </div>
        </div>

        <div className="mt-5">
          <Field label="Question type" helper="Only the selected type will be generated.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {INTERVIEW_TYPES.map((item) => (
                <TypeCard
                  key={item.value}
                  item={item}
                  selected={form.interview_type === item.value}
                  onClick={() => {
                    setForm({ ...form, interview_type: item.value });
                    setResult(null);
                    resetPracticeState();
                  }}
                />
              ))}
            </div>
          </Field>
        </div>

        <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <button
            type="button"
            onClick={() => setShowAdvanced((value) => !value)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div>
              <p className="text-sm font-semibold text-slate-950">Optional focus</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Add a focus area or notes if you want more specific prep.
              </p>
            </div>
            <Pill tone={showAdvanced ? 'blue' : 'slate'}>
              {showAdvanced ? 'Hide' : 'Show'}
            </Pill>
          </button>

          {showAdvanced && (
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <Field label="Focus area">
                <select
                  value={form.focus_area}
                  onChange={(event) => setForm({ ...form, focus_area: event.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                >
                  {FOCUS_AREAS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Extra notes" helper="Optional. Example: focus on rotating shifts, POS, teamwork, or guest complaints.">
                <textarea
                  value={form.user_notes}
                  onChange={(event) => setForm({ ...form, user_notes: event.target.value })}
                  rows={3}
                  placeholder="Please include questions about rotating shifts and guest complaints."
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </Field>
            </div>
          )}
        </div>

        {result && (
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setForm(EMPTY_FORM);
              resetPracticeState();
            }}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCcw size={16} />
            Reset
          </button>
        )}
      </form>

      <ResultsSection
        result={result}
        selectedResume={selectedResume}
        selectedInterviewType={selectedInterviewType}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        practiceMode={practiceMode}
        setPracticeMode={setPracticeMode}
        expandedQuestions={expandedQuestions}
        setExpandedQuestions={setExpandedQuestions}
        practicedQuestions={practicedQuestions}
        setPracticedQuestions={setPracticedQuestions}
        questionNotes={questionNotes}
        setQuestionNotes={setQuestionNotes}
        setMessage={setMessage}
      />
    </div>
  );
}
