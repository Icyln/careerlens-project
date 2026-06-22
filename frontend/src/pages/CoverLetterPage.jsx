import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Download,
  FileText,
  Loader2,
  MailCheck,
  PenLine,
  RefreshCcw,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  Zap,
} from 'lucide-react';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import Alert from '../components/Alert.jsx';
import {
  fetchAnalysisReports,
  generateCoverLetter,
  getErrorMessage,
} from '../api/client.js';
import { formatDateTime } from '../utils/format.js';
import { toArray, toText } from '../utils/safeRender.js';

const TONES = [
  { value: 'professional', label: 'Professional', helper: 'Polished and safe for most roles.', icon: Briefcase },
  { value: 'confident', label: 'Confident', helper: 'Stronger, but not arrogant.', icon: Sparkles },
  { value: 'friendly', label: 'Friendly', helper: 'Warm for service roles.', icon: UserRound },
  { value: 'concise', label: 'Concise', helper: 'Short and recruiter-friendly.', icon: Zap },
];

const LENGTHS = [
  { value: 'short', label: 'Short', helper: '180-230 words' },
  { value: 'standard', label: 'Standard', helper: '260-340 words' },
  { value: 'detailed', label: 'Detailed', helper: '360-450 words' },
];

const EMPTY_FORM = {
  company_name: '',
  hiring_manager: '',
  tone: 'professional',
  length: 'standard',
  focus_keywords: '',
  user_notes: '',
};

const INSIGHT_TABS = [
  { key: 'strengths', label: 'Strengths', icon: CheckCircle2, tone: 'emerald' },
  { key: 'keywords', label: 'Keywords', icon: Sparkles, tone: 'blue' },
  { key: 'notes', label: 'Review', icon: ShieldCheck, tone: 'amber' },
  { key: 'missing', label: 'Missing info', icon: AlertTriangle, tone: 'rose' },
];

function cleanReports(value) {
  return Array.isArray(value) ? value : value?.results || [];
}

function splitKeywords(value) {
  return String(value || '')
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function cleanFileName(value = 'cover_letter') {
  return String(value || 'cover_letter')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'cover_letter';
}

function guessCandidateNameFromFileName(filename = '') {
  const withoutExtension = String(filename || '')
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const blocked = new Set([
    'resume',
    'cv',
    'curriculum',
    'vitae',
    'cover',
    'letter',
    'final',
    'updated',
    'latest',
    'new',
    'copy',
    'pdf',
    'docx',
    'doc',
  ]);

  const words = withoutExtension
    .split(' ')
    .map((word) => word.trim())
    .filter(Boolean)
    .filter((word) => !blocked.has(word.toLowerCase()))
    .filter((word) => !/\d/.test(word));

  if (words.length < 2 || words.length > 5) {
    return '';
  }

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function splitCoverLetterParagraphs(text = '') {
  return String(text || '')
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function downloadTextFile(text, filename = 'cover_letter.txt') {
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

async function downloadCoverLetterDocx({
  text,
  jobTitle = 'Cover Letter',
  companyName = '',
}) {
  const paragraphs = splitCoverLetterParagraphs(text);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: companyName
                  ? `Cover Letter - ${jobTitle} at ${companyName}`
                  : `Cover Letter - ${jobTitle}`,
                bold: true,
                size: 28,
              }),
            ],
          }),

          ...paragraphs.map(
            (paragraph) =>
              new Paragraph({
                spacing: { after: 220 },
                children: [
                  new TextRun({
                    text: paragraph,
                    size: 22,
                  }),
                ],
              })
          ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileBase = cleanFileName(
    companyName
      ? `${companyName}_${jobTitle}_cover_letter`
      : `${jobTitle}_cover_letter`
  );

  saveAs(blob, `${fileBase}.docx`);
}

function downloadCoverLetterPdf({
  text,
  jobTitle = 'Cover Letter',
  companyName = '',
}) {
  const pdf = new jsPDF('p', 'mm', 'a4');

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 22;
  const marginTop = 22;
  const lineHeight = 7;
  const maxWidth = pageWidth - marginX * 2;

  let y = marginTop;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);

  const title = companyName
    ? `Cover Letter - ${jobTitle} at ${companyName}`
    : `Cover Letter - ${jobTitle}`;

  const fileBase = cleanFileName(
    companyName
      ? `${companyName}_${jobTitle}_cover_letter`
      : `${jobTitle}_cover_letter`
  );

  pdf.text(title, marginX, y);
  y += 12;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);

  const paragraphs = splitCoverLetterParagraphs(text);

  paragraphs.forEach((paragraph) => {
    const lines = pdf.splitTextToSize(paragraph, maxWidth);

    lines.forEach((line) => {
      if (y > pageHeight - 22) {
        pdf.addPage();
        y = marginTop;
      }

      pdf.text(line, marginX, y);
      y += lineHeight;
    });

    y += 4;
  });

  pdf.save(`${fileBase}.pdf`);
}

async function copyText(text, setMessage) {
  try {
    await navigator.clipboard.writeText(text || '');
    setMessage({ type: 'success', text: 'Copied to clipboard.' });
  } catch {
    setMessage({ type: 'error', text: 'Could not copy. Please select and copy manually.' });
  }
}

function toneClass(tone = 'slate') {
  const classes = {
    blue: 'bg-[#106EBE]/10 text-[#106EBE] ring-[#106EBE]/15',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  };

  return classes[tone] || classes.slate;
}

function Pill({ children, tone = 'slate' }) {
  return (
    <span className={`rounded-full px-3 py-1 text-[12px] font-bold ring-1 ${toneClass(tone)}`}>
      {children}
    </span>
  );
}

function Field({ label, helper, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-widest text-[#111439]/40">
        {label}
      </span>
      <div className="mt-2.5">{children}</div>
      {helper && <p className="mt-2 text-sm leading-5 text-[#111439]/45">{helper}</p>}
    </label>
  );
}

function PageHeader() {
  return (
    <section className="rounded-[2rem] border border-[#111439]/10 bg-white px-6 py-7 shadow-sm sm:px-8 sm:py-8">
      <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-700 ring-1 ring-blue-100">
        <MailCheck size={16} />
        Cover Letter Generator
      </div>

      <h1 className="mt-6 max-w-4xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
        Create a tailored cover letter from an ATS report
      </h1>

      <p className="mt-5 max-w-3xl text-md leading-8 text-slate-600">
        Select a report, choose a tone, and generate a clean letter you can copy or download
      </p>
    </section>
  );
}

function CompactReportCard({ selectedReport }) {
  if (!selectedReport) return null;

  return (
    <div className="mt-3 rounded-2xl border border-[#111439]/5 bg-[#F8F8F9] p-4">
      <div className="flex gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#106EBE] shadow-sm ring-1 ring-[#111439]/10">
          <Briefcase size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-[#111439]">
            {selectedReport.job_title || 'Selected role'}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <FileText size={13} className="text-[#111439]/40" />
            <p className="truncate text-sm font-bold text-[#111439]/50">
              {selectedReport.resume?.original_name || 'Selected resume'}
            </p>
          </div>
          <p className="mt-1 text-[11px] font-medium text-[#111439]/35">
            Analyzed {selectedReport.created_at ? formatDateTime(selectedReport.created_at) : 'recently'}
          </p>
        </div>
      </div>
    </div>
  );
}

function TonePicker({ value, onChange }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {TONES.map((tone) => {
        const active = value === tone.value;
        const Icon = tone.icon;
        
        return (
          <button
            key={tone.value}
            type="button"
            onClick={() => onChange(tone.value)}
            className={`group relative flex flex-col items-start rounded-[1.5rem] border p-5 text-left transition-all duration-200 ${
              active
                ? 'border-[#106EBE] bg-[#106EBE]/5 ring-1 ring-[#106EBE] shadow-sm'
                : 'border-[#111439]/10 bg-white hover:border-[#111439]/25 hover:bg-[#F8F8F9] hover:shadow-sm'
            }`}
          >
            <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
              active ? 'bg-[#106EBE] text-white shadow-md shadow-[#106EBE]/20' : 'bg-[#F8F8F9] text-[#111439]/50 group-hover:bg-white group-hover:text-[#111439]/70'
            }`}>
              <Icon size={18} />
            </div>
            <p className={`text-[15px] font-semibold ${active ? 'text-[#106EBE]' : 'text-[#111439]'}`}>
              {tone.label}
            </p>
            <p className={`mt-1.5 text-sm leading-relaxed ${active ? 'text-[#106EBE]/80' : 'text-[#111439]/50'}`}>
              {tone.helper}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function LengthPicker({ value, onChange }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {LENGTHS.map((item) => {
        const active = value === item.value;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`flex flex-col items-start rounded-[1.5rem] border p-5 text-left transition-all duration-200 ${
              active
                ? 'border-[#111439] bg-[#111439] text-white shadow-md'
                : 'border-[#111439]/10 bg-white hover:border-[#111439]/25 hover:bg-[#F8F8F9] hover:shadow-sm'
            }`}
          >
            <p className="text-[15px] font-semibold">{item.label}</p>
            <p className={`mt-1.5 text-sm font-medium ${active ? 'text-white/70' : 'text-[#111439]/45'}`}>
              {item.helper}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="flex min-h-[28rem] items-center justify-center rounded-[2rem] border border-dashed border-[#111439]/12 bg-white p-8 text-center shadow-sm">
      <div>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#106EBE]/10 text-[#106EBE]">
          <MailCheck size={32} />
        </div>
        <h3 className="mt-6 text-lg font-bold text-[#111439]">Your cover letter will appear here</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#111439]/55">
          Use the settings above and run the generator to create a polished, truthful letter.
        </p>
      </div>
    </div>
  );
}

function LetterPreview({ result, selectedReport, companyName = '', setMessage }) {
  const coverLetter = toText(result?.cover_letter, '');
  const subjectLine = toText(result?.subject_line, 'Cover Letter');
  const wordCount = result?.word_count || coverLetter.split(/\s+/).filter(Boolean).length;
  const jobTitle = selectedReport?.job_title || 'Cover Letter';
  const exportCompanyName = companyName || '';
  const exportText = `${subjectLine}\n\n${coverLetter}`;

  const paragraphs = splitCoverLetterParagraphs(coverLetter);

  const strengths = toArray(result?.highlighted_strengths)
    .map((item) => toText(item, ''))
    .filter(Boolean);

  const keywords = toArray(result?.keywords_used)
    .map((item) => toText(item, ''))
    .filter(Boolean);

  const reviewNotes = toArray(result?.safety_notes)
    .map((item) => toText(item, ''))
    .filter(Boolean);

  const missingInfo = toArray(result?.missing_info)
    .map((item) => toText(item, ''))
    .filter(Boolean);

  const qualityItems = [
    {
      label: 'Strengths Used',
      value: strengths.length,
      helper: strengths[0] || 'No strengths returned yet.',
      icon: CheckCircle2,
      tone: 'text-emerald-700 bg-emerald-50 ring-emerald-100',
    },
    {
      label: 'Keywords included',
      value: keywords.length,
      helper: keywords.slice(0, 3).join(', ') || 'No keywords returned yet.',
      icon: Sparkles,
      tone: 'text-[#106EBE] bg-[#106EBE]/10 ring-[#106EBE]/15',
    },
    {
      label: 'Review notes',
      value: reviewNotes.length,
      helper: reviewNotes[0] || 'No review notes returned yet.',
      icon: ShieldCheck,
      tone: 'text-amber-700 bg-amber-50 ring-amber-100',
    },
    {
      label: 'Missing info',
      value: missingInfo.length,
      helper: missingInfo[0] || 'No missing details reported.',
      icon: AlertTriangle,
      tone: 'text-rose-700 bg-rose-50 ring-rose-100',
    },
  ];

  if (!coverLetter) return <EmptyPreview />;

  return (
    <div className="overflow-hidden rounded-[2rem] border border-[#111439]/10 bg-white shadow-sm">
      <div className="border-b border-[#111439]/5 bg-gradient-to-br from-white via-white to-[#F8F8F9] p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#106EBE]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#106EBE] ring-1 ring-[#106EBE]/15">
              <MailCheck size={14} />
              Generated letter
            </div>

            <h2
              className="mt-4 max-w-3xl truncate text-2xl font-semibold tracking-tight text-[#111439] sm:text-3xl"
              title={subjectLine}
            >
              {subjectLine}
            </h2>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#111439]/55">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 ring-1 ring-[#111439]/10">
                <Briefcase size={14} />
                {jobTitle}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 ring-1 ring-[#111439]/10">
                <Building2 size={14} />
                {exportCompanyName || 'Company not specified'}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 ring-1 ring-[#111439]/10">
                <FileText size={14} />
                {wordCount} words
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copyText(coverLetter, setMessage)}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#111439]/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#111439] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#F8F8F9]"
            >
              <Clipboard size={16} />
              Copy
            </button>

            <button
              type="button"
              onClick={() =>
                downloadCoverLetterPdf({
                  text: exportText,
                  jobTitle,
                  companyName: exportCompanyName,
                })
              }
              className="inline-flex items-center gap-2 rounded-2xl bg-[#111439] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1f244f]"
            >
              <Download size={16} />
              PDF
            </button>

            <button
              type="button"
              onClick={() =>
                downloadCoverLetterDocx({
                  text: exportText,
                  jobTitle,
                  companyName: exportCompanyName,
                })
              }
              className="inline-flex items-center gap-2 rounded-2xl border border-[#111439]/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#111439] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#F8F8F9]"
            >
              <FileText size={16} />
              DOCX
            </button>

            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  exportText,
                  `${cleanFileName(`${exportCompanyName || jobTitle}_cover_letter`)}.txt`
                )
              }
              className="inline-flex items-center gap-2 rounded-2xl border border-[#111439]/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#111439]/65 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#F8F8F9]"
            >
              TXT
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#F8F8F9] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-[#111439]/10 bg-white p-6 shadow-xl shadow-[#111439]/5 sm:p-10 lg:p-12">
          <div className="mb-8 border-b border-[#111439]/10 pb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#111439]/35">
              Cover letter preview
            </p>
            <p className="mt-2 text-sm leading-6 text-[#111439]/50">
              Review the letter carefully before sending. Edit names, dates, and any company-specific details if needed.
            </p>
          </div>

          <div className="max-h-[38rem] overflow-y-auto pr-1">
            <div className="space-y-5 font-serif text-[15.5px] leading-8 text-[#111439]/85">
              {paragraphs.map((paragraph, index) => (
                <p
                  key={`${paragraph.slice(0, 24)}-${index}`}
                  className="text-justify"
                  style={{ textAlign: 'justify' }}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto mt-5 grid max-w-4xl gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {qualityItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="rounded-2xl border border-[#111439]/10 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ring-1 ${item.tone}`}>
                    <Icon size={17} />
                  </div>

                  <span className="text-lg font-semibold text-[#111439]">
                    {item.value}
                  </span>
                </div>

                <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-[#111439]/40">
                  {item.label}
                </p>

                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#111439]/55">
                  {item.helper}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InsightPanel({ result, activeInsight, setActiveInsight }) {
  if (!result) return null;

  const groups = {
    strengths: {
      title: 'Strengths used',
      empty: 'No strengths returned.',
      items: result.highlighted_strengths,
    },
    keywords: {
      title: 'Keywords included',
      empty: 'No keywords returned.',
      items: result.keywords_used,
    },
    notes: {
      title: 'Review notes',
      empty: 'No safety notes returned.',
      items: result.safety_notes,
    },
    missing: {
      title: 'Missing details to consider',
      empty: 'No missing details reported.',
      items: result.missing_info,
    },
  };

  const selectedTab = INSIGHT_TABS.find((tab) => tab.key === activeInsight) || INSIGHT_TABS[0];
  const selectedGroup = groups[selectedTab.key] || groups.strengths;
  const safeItems = toArray(selectedGroup.items)
    .map((item) => toText(item, ''))
    .filter(Boolean);
  const ActiveIcon = selectedTab.icon;

  return (
    <div className="rounded-[2rem] border border-[#111439]/10 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-[#111439]/40">
            Letter quality check
          </p>
          <h3 className="mt-1.5 text-xl font-bold text-[#111439]">Review before submitting</h3>
        </div>

        <div className="flex gap-2 overflow-x-auto rounded-[1.25rem] border border-[#111439]/10 bg-[#F8F8F9] p-1.5">
          {INSIGHT_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeInsight === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveInsight(tab.key)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? 'bg-white text-[#111439] shadow-sm'
                    : 'text-[#111439]/50 hover:bg-white/70 hover:text-[#111439]'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[#111439]/5 bg-[#fbfcff] p-6">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${toneClass(selectedTab.tone)}`}>
            <ActiveIcon size={20} />
          </div>
          <div>
            <h4 className="text-base font-semibold text-[#111439]">{selectedGroup.title}</h4>
            <p className="mt-0.5 text-sm font-semibold text-[#111439]/40">
              {safeItems.length} item{safeItems.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="mt-5 max-h-56 overflow-y-auto pr-2">
          {safeItems.length ? (
            selectedTab.key === 'notes' || selectedTab.key === 'missing' ? (
              <ul className="space-y-3">
                {safeItems.map((item, index) => (
                  <li
                    key={`${selectedTab.key}-${index}-${item}`}
                    className="rounded-2xl border border-[#111439]/5 bg-white px-5 py-4 text-[15px] leading-relaxed text-[#111439]/70 shadow-sm"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {safeItems.map((item, index) => (
                  <Pill key={`${selectedTab.key}-${index}-${item}`} tone={selectedTab.tone}>
                    {item}
                  </Pill>
                ))}
              </div>
            )
          ) : (
            <p className="text-[15px] text-[#111439]/50">{selectedGroup.empty}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CoverLetterPage() {
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [result, setResult] = useState(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeInsight, setActiveInsight] = useState('strengths');

  const selectedReport = useMemo(
    () => reports.find((report) => String(report.id) === String(selectedReportId)) || null,
    [reports, selectedReportId],
  );

  async function loadReports() {
    setLoadingReports(true);
    try {
      const data = await fetchAnalysisReports();
      const clean = cleanReports(data);
      setReports(clean);
      if (clean.length && !selectedReportId) {
        setSelectedReportId(clean[0].id);
      }
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setLoadingReports(false);
    }
  }

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerate(event) {
    event.preventDefault();

    if (!selectedReportId) {
      setMessage({ type: 'error', text: 'Please select an ATS report first.' });
      return;
    }

    setGenerating(true);
    setMessage(null);

    try {
      const candidateName =
        selectedReport?.resume?.candidate_name ||
        selectedReport?.resume?.name ||
        guessCandidateNameFromFileName(selectedReport?.resume?.original_name);

      const data = await generateCoverLetter(selectedReportId, {
        company_name: form.company_name,
        hiring_manager: form.hiring_manager,
        candidate_name: candidateName,
        tone: form.tone,
        length: form.length,
        focus_keywords: splitKeywords(form.focus_keywords),
        user_notes: form.user_notes,
      });

      setResult(data);
      setActiveInsight('strengths');

      if (data.status === 'success') {
        setMessage({ type: 'success', text: 'Cover letter generated successfully.' });
      } else {
        setMessage({ type: 'error', text: data.message || 'Cover letter could not be generated.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setGenerating(false);
    }
  }

  const keywords = splitKeywords(form.focus_keywords);

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 font-['Inter',_ui-sans-serif,_system-ui,_sans-serif]">
      <PageHeader />

      {message && <Alert type={message.type}>{message.text}</Alert>}

      <div className="flex flex-col gap-8">
        {/* Full-width Settings Section */}
        <section>
          <form onSubmit={handleGenerate} className="rounded-[2rem] border border-[#111439]/10 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-8 flex items-start justify-between gap-4 border-b border-[#111439]/5 pb-6">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-[#106EBE]">
                  Settings
                </p>
                <h2 className="mt-1.5 text-2xl font-bold text-[#111439]">Build your letter</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#106EBE]/10 text-[#106EBE]">
                <PenLine size={22} />
              </div>
            </div>

            <div className="space-y-8">
              {/* ATS Report Section */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Field label="ATS report" helper="Uses the selected resume, role, and job description.">
                  <select
                    value={selectedReportId}
                    onChange={(event) => {
                      setSelectedReportId(event.target.value);
                      setResult(null);
                    }}
                    className="w-full rounded-2xl border border-[#111439]/10 bg-white px-5 py-3.5 text-[15px] font-bold text-[#111439] outline-none transition focus:border-[#106EBE] focus:ring-4 focus:ring-[#106EBE]/10"
                    disabled={loadingReports}
                  >
                    {loadingReports && <option>Loading reports...</option>}
                    {!loadingReports && reports.length === 0 && <option value="">No ATS reports yet</option>}
                    {reports.map((report) => (
                      <option key={report.id} value={report.id}>
                        {report.job_title} • {report.resume?.original_name || 'Resume'}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="flex flex-col justify-end">
                  <CompactReportCard selectedReport={selectedReport} />
                </div>
              </div>

              {/* Company & Hiring Manager */}
              <div className="grid gap-6 md:grid-cols-2">
                <Field label="Company" helper="Which company are you applying to?">
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#111439]/35" size={18} />
                    <input
                      value={form.company_name}
                      onChange={(event) => setForm({ ...form, company_name: event.target.value })}
                      placeholder="Example: Marriott"
                      className="w-full rounded-2xl border border-[#111439]/10 py-3.5 pl-12 pr-5 text-[15px] outline-none transition focus:border-[#106EBE] focus:ring-4 focus:ring-[#106EBE]/10"
                    />
                  </div>
                </Field>

                <Field label="Hiring manager" helper="Who should we address this to? (Optional)">
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#111439]/35" size={18} />
                    <input
                      value={form.hiring_manager}
                      onChange={(event) => setForm({ ...form, hiring_manager: event.target.value })}
                      placeholder="Example: Jane Doe"
                      className="w-full rounded-2xl border border-[#111439]/10 py-3.5 pl-12 pr-5 text-[15px] outline-none transition focus:border-[#106EBE] focus:ring-4 focus:ring-[#106EBE]/10"
                    />
                  </div>
                </Field>
              </div>

              {/* Tone & Length Pickers */}
              <Field label="Tone">
                <TonePicker
                  value={form.tone}
                  onChange={(tone) => setForm({ ...form, tone })}
                />
              </Field>

              <Field label="Length">
                <LengthPicker
                  value={form.length}
                  onChange={(length) => setForm({ ...form, length })}
                />
              </Field>

              {/* Optional Details Accordion */}
              <details className="group rounded-[1.5rem] border border-[#111439]/10 bg-[#F8F8F9] p-5 sm:p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-[#111439] outline-none">
                  Advanced Details
                  <ChevronDown className="transition group-open:rotate-180" size={20} />
                </summary>

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <Field label="Focus keywords" helper="Optional. Separate keywords with commas or new lines.">
                    <textarea
                      value={form.focus_keywords}
                      onChange={(event) => setForm({ ...form, focus_keywords: event.target.value })}
                      rows={3}
                      placeholder="Customer service, food safety, leadership..."
                      className="w-full resize-none rounded-2xl border border-[#111439]/10 bg-white px-5 py-3.5 text-[15px] outline-none transition focus:border-[#106EBE] focus:ring-4 focus:ring-[#106EBE]/10"
                    />
                    {keywords.length > 0 && (
                      <div className="mt-3 flex max-h-24 flex-wrap gap-2 overflow-y-auto pr-1">
                        {keywords.map((keyword) => <Pill key={keyword} tone="blue">{keyword}</Pill>)}
                      </div>
                    )}
                  </Field>

                  <Field label="Extra context" helper="Optional. Add real context only, not fake experience.">
                    <textarea
                      value={form.user_notes}
                      onChange={(event) => setForm({ ...form, user_notes: event.target.value })}
                      rows={3}
                      placeholder="Example: I am relocating to this city next month."
                      className="w-full resize-none rounded-2xl border border-[#111439]/10 bg-white px-5 py-3.5 text-[15px] outline-none transition focus:border-[#106EBE] focus:ring-4 focus:ring-[#106EBE]/10"
                    />
                  </Field>
                </div>
              </details>

              {/* Action Buttons */}
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-end pt-4">
                {result && (
                  <button
                    type="button"
                    onClick={() => {
                      setResult(null);
                      setForm(EMPTY_FORM);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#111439]/10 bg-white px-6 py-3.5 text-[15px] font-black text-[#111439]/65 transition hover:bg-[#F8F8F9] hover:shadow-sm sm:w-auto"
                  >
                    <RefreshCcw size={18} />
                    Reset
                  </button>
                )}

                <button
                  type="submit"
                  disabled={generating || !selectedReportId}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-400 px-8 py-3.5 text-[15px] font-black text-white shadow-lg shadow-[#106EBE]/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#106EBE]/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-lg sm:w-auto"
                >
                  {generating ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                  {generating ? 'Generating...' : result ? 'Regenerate letter' : 'Generate letter'}
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* Preview Section Below Settings */}
        <section className="space-y-8">
          <LetterPreview
            result={result}
            selectedReport={selectedReport}
            companyName={form.company_name}
            setMessage={setMessage}
          />

          <InsightPanel
            result={result}
            activeInsight={activeInsight}
            setActiveInsight={setActiveInsight}
          />

          {!selectedReportId && !loadingReports && (
            <div className="rounded-[2rem] border border-dashed border-[#111439]/12 bg-white p-12 text-center shadow-sm">
              <FileText className="mx-auto text-[#111439]/25" size={48} />
              <h3 className="mt-5 text-xl font-black text-[#111439]">No ATS report selected</h3>
              <p className="mx-auto mt-2 max-w-lg text-[15px] leading-relaxed text-[#111439]/55">
                Run an ATS analysis first. The cover letter generator uses the selected report to personalize the letter.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}