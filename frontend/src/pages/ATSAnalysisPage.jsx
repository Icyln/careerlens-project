import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  FileText,
  ListChecks,
  Loader2,
  Search,
  Target,
  UserCheck,
  WandSparkles,
} from 'lucide-react';
import Alert from '../components/Alert.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import ReportExport from '../components/ReportExport.jsx';
import ScoreRing from '../components/ScoreRing.jsx';
import SkillChips from '../components/SkillChips.jsx';
import {
  createAnalysis,
  fetchLatestAnalysisReport,
  fetchResumes,
  getErrorMessage,
} from '../api/client.js';
import { formatDateTime, formatFileSize } from '../utils/format.js';
import { toArray, toText, toNumber } from '../utils/safeRender.js';

function displayValue(item) {
  return toText(item, '');
}

function ResumeSelector({ resumes, selectedResumeId, setSelectedResumeId }) {
  if (!resumes.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#111439]/20 bg-white/50 p-8 text-center backdrop-blur-sm">
        <div className="w-14 h-14 rounded-full bg-[#106EBE]/10 flex items-center justify-center mx-auto mb-4">
          <FileText className="text-[#106EBE]" size={28} />
        </div>
        <h3 className="text-lg font-semibold text-[#111439]">No resume available</h3>
        <p className="mt-2 text-sm text-[#111439]/60">Please upload a resume first to scan it against a job.</p>
        <Link to="/resumes" className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#111439] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1a1f54] transition-all shadow-md">
          Upload Resume
        </Link>
      </div>
    );
  }

  if (resumes.length === 1) {
    const resume = resumes[0];
    return (
      <div className="rounded-2xl bg-white p-6 border border-[#111439]/5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#106EBE] mb-3">Selected Resume</p>
        <h3 className="text-base font-semibold text-[#111439] truncate">{toText(resume.original_name, 'Unnamed resume')}</h3>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#111439]/50 font-medium">
          <span className="bg-[#F8F8F9] border border-[#111439]/5 px-2.5 py-1 rounded-md font-semibold uppercase tracking-wide text-[#111439]">{resume.file_type?.toUpperCase()}</span>
          <span>•</span>
          <span>{formatFileSize(resume.file_size)}</span>
          <span>•</span>
          <span>Added {formatDateTime(resume.uploaded_at)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 border border-[#111439]/5 shadow-sm">
      <label className="block text-xs font-semibold uppercase tracking-widest text-[#111439]/70 mb-4" htmlFor="resume-select">
        Choose a resume to scan
      </label>
      <div className="grid gap-3 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
        {resumes.map((resume) => {
          const isSelected = String(selectedResumeId) === String(resume.id);
          return (
            <button
              key={resume.id}
              type="button"
              onClick={() => setSelectedResumeId(String(resume.id))}
              className={`rounded-xl p-4 text-left transition-all duration-200 border ${
                isSelected 
                  ? 'bg-[#106EBE]/5 border-[#106EBE]/30 shadow-sm' 
                  : 'bg-white border-[#111439]/5 hover:border-[#106EBE]/20 hover:bg-[#F8F8F9]'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-base font-semibold truncate ${isSelected ? 'text-[#106EBE]' : 'text-[#111439]'}`}>
                  {toText(resume.original_name, 'Unnamed resume')}
                </p>
                {isSelected && <CheckCircle2 size={20} className="text-[#106EBE] shrink-0 ml-2" />}
              </div>
              <p className="mt-1.5 text-xs text-[#111439]/50">Added {formatDateTime(resume.uploaded_at)}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AiList({ title, items = [], empty = 'Nothing to show here.' }) {
  const safeItems = toArray(items).map((item) => toText(item, '')).filter(Boolean);
  return (
    <div className="rounded-2xl bg-white p-6 border border-[#111439]/5 shadow-sm h-full">
      <h4 className="text-xs font-bold uppercase tracking-widest text-[#111439]/50">{title}</h4>
      {safeItems.length ? (
        <ul className="mt-5 space-y-4 text-sm leading-relaxed text-[#111439]/80 font-medium">
          {safeItems.map((item, index) => (
            <li key={`${title}-${index}`} className="flex gap-3 items-start">
              <span className="mt-2 w-2 h-2 shrink-0 rounded-full bg-[#106EBE]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-[#111439]/40">{empty}</p>
      )}
    </div>
  );
}

function BulletCard({ title, items = [], empty = 'Nothing to show here.', tone = 'blue', ordered = false }) {
  const safeItems = toArray(items).map((item) => toText(item, '')).filter(Boolean);
  const dotClass =
    tone === 'rose'
      ? 'bg-red-500'
      : tone === 'emerald'
        ? 'bg-[#0D9476]'
        : tone === 'amber'
          ? 'bg-amber-500'
          : 'bg-[#106EBE]';

  const ListTag = ordered ? 'ol' : 'ul';

  const renderItemText = (item) => {
    const colonIndex = item.indexOf(':');

    if (colonIndex > 0 && colonIndex <= 90) {
      const lead = item.slice(0, colonIndex + 1);
      const rest = item.slice(colonIndex + 1);

      return (
        <>
          <span className="font-bold text-[#111439]">{lead}</span>
          <span className="font-normal text-[#111439]/70">{rest}</span>
        </>
      );
    }

    return <span className="font-normal text-[#111439]/70">{item}</span>;
  };

  return (
    <div className="rounded-2xl bg-white p-6 border border-[#111439]/5 shadow-sm">
      <h4 className="text-xs font-bold uppercase tracking-widest text-[#111439]/50">
        {title}
      </h4>

      {safeItems.length ? (
        <ListTag
          className={
            ordered
              ? 'mt-5 space-y-4 pl-5 text-sm leading-relaxed text-[#111439]/70 list-decimal'
              : 'mt-5 space-y-4 text-sm leading-relaxed text-[#111439]/70'
          }
        >
          {safeItems.map((item, index) => (
            <li
              key={`${title}-${index}`}
              className={
                ordered
                  ? 'pl-1 font-normal'
                  : 'flex gap-3 items-start font-normal'
              }
            >
              {ordered ? (
                renderItemText(item)
              ) : (
                <>
                  <span className={`mt-2 w-2 h-2 shrink-0 rounded-full ${dotClass}`} />
                  <span>{renderItemText(item)}</span>
                </>
              )}
            </li>
          ))}
        </ListTag>
      ) : (
        <p className="mt-4 text-sm text-[#111439]/40">{empty}</p>
      )}
    </div>
  );
}

function ScoreCard({ card }) {
  const score = Math.max(0, Math.min(100, toNumber(card?.score, 0)));
  const level = toText(card?.level, '').toLowerCase();

  // Color logic for status labels
  const getColorClasses = (lvl) => {
    if (lvl.includes('good') || lvl.includes('excellent')) 
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (lvl.includes('fair') || lvl.includes('average')) 
      return 'bg-amber-50 text-amber-700 border-amber-100';
    if (lvl.includes('poor') || lvl.includes('bad') || lvl.includes('low')) 
      return 'bg-rose-50 text-rose-700 border-rose-100';
    return 'bg-[#F8F8F9] text-[#111439] border-[#111439]/5';
  };

  const badgeClasses = getColorClasses(level);

  return (
    // 'h-full' ensures all cards in the grid row have the same height
    <div className="rounded-2xl bg-white p-6 border border-[#111439]/5 shadow-sm flex flex-col h-full">
      <div className="flex items-start justify-between gap-3 mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#111439]/50">{toText(card?.name, 'Score')}</p>
        <span className={`rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider border ${badgeClasses}`}>
          {toText(card?.level, 'Unknown')}
        </span>
      </div>
      <p className="text-4xl font-semibold text-[#111439]">{score}%</p>
      {/* 'flex-grow' fills remaining vertical space so content is aligned */}
      <p className="mt-3 text-sm leading-relaxed text-[#111439]/60 flex-grow">
        {toText(card?.feedback, '')}
      </p>
    </div>
  );
}

function IssueGroupCard({ group, icon }) {
  const safeGroup = group || {};
  const groupName = toText(safeGroup.name, 'Report Area');
  const issuesToFix = toNumber(safeGroup.issues_to_fix, 0);

  const detectedItems = toArray(
    safeGroup.items || safeGroup.strengths || safeGroup.matched
  )
    .map((item) => toText(item, ''))
    .filter(Boolean);

  const issueItems = toArray(
    safeGroup.issues || safeGroup.tips || safeGroup.missing
  )
    .map((item) => toText(item, ''))
    .filter(Boolean);

  const isSkillGroup = ['Hard Skills', 'Soft Skills'].includes(groupName);
  const exactMatchGroup = ['Job Title Match', 'Experience Years', 'Education Match'].includes(groupName);

  const detectedLabel = isSkillGroup
    ? `Matched skills (${detectedItems.length})`
    : exactMatchGroup
      ? 'Matches requirement'
      : groupName === 'Recruiter Tips'
        ? 'Looks good'
        : 'Found';

  const issueLabel = isSkillGroup
    ? `Missing skills (${issueItems.length})`
    : exactMatchGroup
      ? 'Missing requirement'
      : groupName === 'Formatting'
        ? 'Needs fixing'
        : 'To improve';

  const badgeText = isSkillGroup
    ? `${issuesToFix} missing`
    : `${issuesToFix} issue${issuesToFix === 1 ? '' : 's'}`;

  const badgeColor = issuesToFix > 0
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-[#0D9476]/10 text-[#0D9476] border-[#0D9476]/20';

  const defaultSuccessFeedback = (() => {
    if (groupName === 'Searchability') {
      return 'Core recruiter contact details were detected and this section has no unresolved issues.';
    }

    if (groupName === 'Job Title Match') {
      return 'The target job title was found in the resume, so this section has no detected issue.';
    }

    if (groupName === 'Experience Years') {
      return 'The resume experience appears to satisfy the experience requirement detected from the job description.';
    }

    if (groupName === 'Education Match') {
      return 'The resume education section matches the education requirement detected from the job description.';
    }

    if (groupName === 'Hard Skills') {
      return 'The hard-skill requirements detected from the job description are covered in the resume.';
    }

    if (groupName === 'Soft Skills') {
      return 'The soft-skill requirements detected from the job description are covered in the resume.';
    }

    if (groupName === 'Formatting') {
      return 'No formatting issues were detected. The uploaded file looks readable for ATS parsing.';
    }

    if (groupName === 'Recruiter Tips') {
      return 'No recruiter-review issues were detected for this section.';
    }

    return 'This section has no detected issues based on the current job description.';
  })();

  const feedbackText = toText(safeGroup.feedback, '') || defaultSuccessFeedback;

  return (
    <div className="rounded-2xl bg-white p-6 border border-[#111439]/5 shadow-sm flex flex-col h-full">
      <div className="flex items-start justify-between gap-3 mb-5 border-b border-[#111439]/5 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="rounded-xl bg-[#F8F8F9] p-3 text-[#106EBE] border border-[#111439]/5">
            {icon}
          </div>

          <div>
            <h4 className="text-base font-semibold text-[#111439]">{groupName}</h4>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#111439]/40 mt-1">
              {toText(safeGroup.status, safeGroup.level || '')}
            </p>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide border ${badgeColor}`}>
          {badgeText}
        </span>
      </div>

      <div className="flex-1 space-y-5">
        {detectedItems.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#0D9476] mb-2.5">
              {detectedLabel}
            </p>

            <ul className="space-y-2 text-sm text-[#111439]/70 font-medium">
              {detectedItems.map((item, index) => (
                <li key={`item-${index}`} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-[#0D9476]" size={16} />
                  <span className="leading-tight">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {issueItems.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 mb-2.5">
              {issueLabel}
            </p>

            <ul className="space-y-3 text-sm text-[#111439]/70 font-medium">
              {issueItems.map((issue, index) => (
                <li key={`issue-${index}`} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={16} />
                  <span className="text-justify leading-relaxed">{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {issuesToFix === 0 && (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-relaxed text-emerald-700">
            {feedbackText}
          </p>
        )}

        {issuesToFix > 0 && safeGroup.feedback && (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
            {toText(safeGroup.feedback, '')}
          </p>
        )}
      </div>
    </div>
  );
}

function ContactInfoCard({ contactInfo }) {
  const displayContactValue = (value, fallback = 'Not detected') => {
    const clean = String(value || '').trim();
    return clean || fallback;
  };

  const email = displayContactValue(contactInfo?.email, 'No email detected');
  const phone = displayContactValue(contactInfo?.phone, 'No phone detected');
  const location = displayContactValue(
    contactInfo?.location_display || contactInfo?.location,
    'No location detected'
  );

  return (
    <div className="rounded-2xl bg-white p-6 border border-[#111439]/5 shadow-sm">
      <h3 className="text-xs font-bold uppercase tracking-widest text-[#111439]/50 mb-5">
        Profile Details Found
      </h3>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-[#F8F8F9] p-4 border border-[#111439]/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#111439]/40">
            Email
          </p>
          <p className="mt-1.5 text-sm font-semibold text-[#111439] truncate" title={email}>
            {email}
          </p>
        </div>

        <div className="rounded-xl bg-[#F8F8F9] p-4 border border-[#111439]/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#111439]/40">
            Phone
          </p>
          <p className="mt-1.5 text-sm font-semibold text-[#111439] truncate" title={phone}>
            {phone}
          </p>
        </div>

        <div className="rounded-xl bg-[#F8F8F9] p-4 border border-[#111439]/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#111439]/40">
            Location
          </p>
          <p
            className={`mt-1.5 text-sm font-semibold truncate ${
              contactInfo?.location ? 'text-[#111439]' : 'text-amber-600'
            }`}
            title={location}
          >
            {location}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ATSAnalysisPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialResumeId = searchParams.get('resume') || '';
  const reportRef = useRef(null);

  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(initialResumeId);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState(null);
  const [reportSource, setReportSource] = useState('');
  const [message, setMessage] = useState(null);

  const selectedResume = useMemo(
    () => resumes.find((resume) => String(resume.id) === String(selectedResumeId)) || null,
    [resumes, selectedResumeId]
  );

  useEffect(() => {
  let isMounted = true;

  async function load() {
    try {
      setLoadingResumes(true);

      const [resumeData, latestReport] = await Promise.all([
        fetchResumes(),
        fetchLatestAnalysisReport(),
      ]);

      if (!isMounted) return;

      setResumes(resumeData);

      const initialResumeExists =
        initialResumeId &&
        resumeData.some((resume) => String(resume.id) === String(initialResumeId));

      const latestResumeId = latestReport?.resume?.id ? String(latestReport.resume.id) : '';
      const latestResumeExists =
        latestResumeId &&
        resumeData.some((resume) => String(resume.id) === String(latestResumeId));

      if (initialResumeExists) {
        setSelectedResumeId(String(initialResumeId));
      } else if (latestResumeExists) {
        setSelectedResumeId(latestResumeId);
      } else if (resumeData.length === 1) {
        setSelectedResumeId(String(resumeData[0].id));
      }

      if (latestReport) {
        setReport(latestReport);
        setReportSource('latest');
        setJobTitle(toText(latestReport.job_title, ''));
        setJobDescription(toText(latestReport.job_description, ''));
      }
    } catch (error) {
      if (isMounted) {
        setMessage({ type: 'error', text: getErrorMessage(error) });
      }
    } finally {
      if (isMounted) {
        setLoadingResumes(false);
      }
    }
  }

  load();

  return () => {
    isMounted = false;
  };
}, [initialResumeId]);

  const handleAnalyze = async (event) => {
    event.preventDefault();
    if (!selectedResumeId) {
      setMessage({ type: 'warning', text: 'Please select a resume first.' });
      return;
    }
    if (!jobTitle.trim()) {
      setMessage({ type: 'warning', text: 'Please enter the target job title.' });
      return;
    }
    if (jobDescription.trim().length < 50) {
      setMessage({ type: 'warning', text: 'Please paste the full job description.' });
      return;
    }

    try {
      setAnalyzing(true);
      const result = await createAnalysis({ resumeId: selectedResumeId, jobTitle, jobDescription });
      setReport(result);
      setReportSource('new');
      setMessage({ type: 'success', text: 'Scan complete! See your results below.' });
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStartNewScan = () => {
  setReport(null);
  setReportSource('');
  setJobTitle('');
  setJobDescription('');
  setMessage(null);

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
};

  const handleOpenTailor = () => {
    if (report) {
      sessionStorage.setItem('careerlens_tailor_report', JSON.stringify(report));
      sessionStorage.setItem('careerlens_tailor_resume', JSON.stringify(report.resume || selectedResume || {}));
    } else if (selectedResume) {
      sessionStorage.setItem('careerlens_tailor_resume', JSON.stringify(selectedResume));
    }
    navigate('/tailor-resume');
  };

  const ats = report?.ats_result;
  const ai = report?.ai_result;
  const atsSummary = ats?.summary || {};
  const scoreCards = toArray(ats?.score_cards);
  const issueGroups = ats?.issue_groups || {};
  const hardSkills = atsSummary.hard_skills || {};
  const softSkills = atsSummary.soft_skills || {};
  const topFixes = toArray(atsSummary.top_fixes);

  return (
    <div className="space-y-8 relative font-['Inter',_ui-sans-serif,_system-ui,_sans-serif] text-[#111439] min-h-screen pb-16 z-0 selection:bg-[#0FFCBE]/30">
      
      {/* Ambient Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] max-w-[800px] h-[600px] bg-gradient-to-br from-[#106EBE]/10 to-[#0FFCBE]/10 blur-[120px] rounded-full -z-10 pointer-events-none"></div>

      {/* Header Section */}
      <section className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] p-8 sm:p-10 shadow-xl shadow-[#111439]/5">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-700 ring-1 ring-blue-100">
              <Target size={14} />
              Resume Scanner
            </div>
            {/* The main heading remains the same size as requested */}
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 mb-3">
              Check if your resume matches the job
            </h1>
            <p className="text-base leading-relaxed text-[#111439]/70">
              We compare your resume against the job description to find missing skills, format issues, and give you clear advice on how to improve your chances.
            </p>
          </div>
          
          {/* UPDATED: Larger, punchier feature cards */}
          <div className="flex gap-4 sm:w-auto w-full">
            <div className="flex-1 lg:w-48 rounded-2xl bg-white border border-[#111439]/5 p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-[#106EBE]/20 transition-all">
              <ListChecks className="text-[#106EBE] mb-3" size={28} />
              <p className="text-sm sm:text-base font-bold text-[#111439]">ATS Check</p>
              <p className="text-xs text-[#111439]/60 mt-1.5 font-medium">Finds exact keywords</p>
            </div>
            <div className="flex-1 lg:w-48 rounded-2xl bg-white border border-[#111439]/5 p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-[#0FFCBE]/30 transition-all">
              <BrainCircuit className="text-[#0D9476] mb-3" size={28} />
              <p className="text-sm sm:text-base font-bold text-[#111439]">Smart Review</p>
              <p className="text-xs text-[#111439]/60 mt-1.5 font-medium">Reads like a recruiter</p>
            </div>
          </div>
        </div>
      </section>

      {message && (
        <Alert type={message.type} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {/* Input Form Section */}
      <form onSubmit={handleAnalyze} className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
          {loadingResumes ? (
            <div className="h-48 animate-pulse rounded-2xl bg-white/50 border border-[#111439]/5" />
          ) : (
            <ResumeSelector resumes={resumes} selectedResumeId={selectedResumeId} setSelectedResumeId={setSelectedResumeId} />
          )}

          {selectedResume && (
            <div className="rounded-2xl bg-[#111439] p-6 text-white shadow-xl shadow-[#111439]/10 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-40 h-40 bg-[#106EBE] opacity-20 blur-2xl rounded-full"></div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50 mb-2">Target File</p>
              <h3 className="text-lg font-semibold truncate pr-4">{toText(selectedResume.original_name, 'Unnamed resume')}</h3>
              <p className="mt-2 text-xs font-medium text-white/60">Ready for scan</p>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white/80 backdrop-blur-md p-6 sm:p-8 shadow-sm border border-[#111439]/5">
          <div className="grid gap-6">
            <div>
              <label htmlFor="job-title" className="block text-xs font-semibold uppercase tracking-widest text-[#111439]/70 mb-3 pl-1">Target Job Title</label>
              <input
                id="job-title"
                type="text"
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                placeholder="e.g. Product Manager, Frontend Developer"
                className="w-full rounded-2xl border border-[#111439]/10 bg-[#F8F8F9] px-5 py-4 text-base font-medium text-[#111439] placeholder-[#111439]/30 focus:border-[#106EBE] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#106EBE]/10 transition-all duration-300"
              />
            </div>

            <div>
              <label htmlFor="job-description" className="block text-xs font-semibold uppercase tracking-widest text-[#111439]/70 mb-3 pl-1">Job Description</label>
              <textarea
                id="job-description"
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste the full job posting here..."
                rows={8}
                className="w-full resize-y rounded-2xl border border-[#111439]/10 bg-[#F8F8F9] px-5 py-4 text-base leading-relaxed text-[#111439] placeholder-[#111439]/30 focus:border-[#106EBE] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#106EBE]/10 transition-all duration-300 custom-scrollbar"
              />
            </div>

            <button
              type="submit"
              disabled={analyzing || loadingResumes || !resumes.length}
              className="relative w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-400 px-6 py-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 group overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              {analyzing ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
              <span className="relative z-10">{analyzing ? 'Scanning...' : 'Start Scan'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* RESULTS SECTION */}
      {report && ats && (
        <section ref={reportRef} className="pt-8 space-y-8" id="analysis-report">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#111439]/5 pb-6">
  <div>
    

    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111439]">
      {reportSource === 'latest' ? 'Latest Saved ATS Report' : 'Scan Results'}
    </h2>

    <p className="text-sm text-[#111439]/50 mt-1.5 font-medium">
      {reportSource === 'latest'
        ? `This report was generated on ${formatDateTime(report.created_at)} and reloaded from your account.`
        : `Report generated on ${formatDateTime(report.created_at)}`}
    </p>
  </div>

  <div className="flex flex-wrap gap-3">
    <button
      type="button"
      onClick={handleStartNewScan}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#111439]/10 bg-white px-5 py-3 text-sm font-semibold text-[#111439] shadow-sm transition hover:bg-[#F8F8F9] hover:-translate-y-0.5"
    >
      <Search size={16} />
      Run New Scan
    </button>

    <ReportExport
      reportId={report.id}
      onError={(error) => setMessage({ type: 'error', text: getErrorMessage(error) })}
    />

    <button
      type="button"
      onClick={handleOpenTailor}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111439] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#111439]/20 transition hover:bg-[#1a1f54] hover:-translate-y-0.5"
    >
      <WandSparkles size={16} className="text-[#0FFCBE]" />
      Tailor Resume
    </button>
  </div>
</div>

          {/* Standard ATS Results Grid */}
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-3xl bg-white p-6 sm:p-10 shadow-sm border border-[#111439]/5 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-b from-[#106EBE]/5 to-transparent rounded-bl-full pointer-events-none"></div>
              <ScoreRing
                score={toNumber(ats.job_match_score ?? ats.overall_score, 0)}
                level={toText(ats.job_match_level ?? ats.match_level, 'Unknown')}
                caption="Overall Match Score"
              />
              <div className="mt-10 w-full space-y-6">
                <ProgressBar value={hardSkills.score ?? 0} label="Hard Skills" caption={`${toArray(hardSkills.matched).length} matched, ${toArray(hardSkills.missing).length} missing`} />
                <ProgressBar value={softSkills.score ?? 0} label="Soft Skills" caption={`${toArray(softSkills.matched).length} matched, ${toArray(softSkills.missing).length} missing`} />
                <ProgressBar value={ats.ats_readability_score ?? atsSummary.ats_readability_score ?? 0} label="Readability" caption="How easily systems read your file." />
              </div>
            </div>

            <div className="space-y-6 text-justify">
              <BulletCard
                title="Recommendations"
                items={topFixes}
                ordered
                tone="amber"
                empty="Everything looks good."
              />
              <div className="grid gap-6 sm:grid-cols-2">
                {(scoreCards.length ? scoreCards.filter((card) => toText(card?.key || card?.name, '').toLowerCase() !== 'recruiter_tips' && toText(card?.name, '').toLowerCase() !== 'recruiter tips') : [
                  { name: 'Match Score', score: ats.overall_score, level: ats.match_level, feedback: atsSummary.job_match_explanation },
                  { name: 'Format Score', score: ats.ats_readability_score, level: ats.ats_readability_level, feedback: 'How well structured your file is.' },
                ]).slice(0, 2).map((card, index) => <ScoreCard key={`${toText(card?.key || card?.name, 'score')}-${index}`} card={card} />)}
              </div>
            </div>
          </div>

          <ContactInfoCard contactInfo={atsSummary.contact_info} />

          <div className="mt-10 mb-6">
            <h3 className="text-xl font-bold text-[#111439] flex items-center gap-2.5">
              <ListChecks size={24} className="text-[#106EBE]" /> Detailed Checklist
            </h3>
            <p className="text-sm text-[#111439]/60 mt-1.5 font-medium">Review what the system found and what you need to fix.</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {issueGroups.searchability && <IssueGroupCard group={issueGroups.searchability} icon={<Search size={20} />} />}
            {issueGroups.job_title && <IssueGroupCard group={issueGroups.job_title} icon={<Target size={20} />} />}
            {issueGroups.experience && <IssueGroupCard group={issueGroups.experience} icon={<ListChecks size={20} />} />}
            {issueGroups.education && <IssueGroupCard group={issueGroups.education} icon={<FileText size={20} />} />}
            {issueGroups.hard_skills && <IssueGroupCard group={issueGroups.hard_skills} icon={<Target size={20} />} />}
            {issueGroups.soft_skills && <IssueGroupCard group={issueGroups.soft_skills} icon={<UserCheck size={20} />} />}
            {issueGroups.formatting && <IssueGroupCard group={issueGroups.formatting} icon={<FileText size={20} />} />}
          </div>

          {/* AI SECTION RE-IMAGINED */}
          {ai && (
            <div className="mt-12 rounded-[2.5rem] bg-gradient-to-b from-white to-[#F8F8F9] p-8 sm:p-12 shadow-xl shadow-[#111439]/5 border border-[#111439]/10 relative overflow-hidden">
              
              {/* Premium AI Glowing Orbs */}
              <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-[#0FFCBE]/20 via-[#106EBE]/10 to-transparent rounded-full blur-[80px] pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-10 border-b border-[#111439]/5 pb-8">
                  <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white shadow-sm border border-[#111439]/5 text-xs font-semibold uppercase tracking-widest text-[#106EBE] mb-4">
                      <BrainCircuit size={16} />
                      Recruiter Review
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-semibold text-[#111439]">AI Analysis</h3>
                    <p className="mt-3 text-base leading-relaxed text-[#111439]/80 font-medium text-justify">
                      {toText(ai.summary_10_second_read || ai.message, 'No summary available.')}
                    </p>
                  </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
                  
                  {/* Left Col: AI Metrics and Graphs */}
                  <div className="space-y-6 text-justify">
                     <div className="bg-white rounded-3xl p-8 border border-[#111439]/5 shadow-sm">
                        <h4 className="text-sm font-semibold uppercase tracking-widest text-[#111439]/50 mb-3">Overall Alignment</h4>
                        <p className="text-3xl font-extrabold text-[#106EBE] mb-3">{toText(ai.alignment_explanation?.level, 'Analyzed')}</p>
                        <p className="text-sm text-[#111439]/70 leading-relaxed font-medium">{toText(ai.alignment_explanation?.explanation, 'No detailed explanation provided.')}</p>
                     </div>

                     <div className="bg-white rounded-3xl p-8 border border-[#111439]/5 shadow-sm">
                        <h4 className="text-sm font-semibold uppercase tracking-widest text-[#111439]/50 mb-6">Recruiter Metric Breakdown</h4>
                        <div className="space-y-6">
                           {(toArray(ai.visualization).length ? toArray(ai.visualization) : [
                             { label: 'Role Fit Overview', value: 0, reason: 'Pending data...' }
                           ]).map((item, index) => (
                             <ProgressBar key={`ai-viz-${index}`} value={item?.value} label={displayValue(item?.label)} caption={displayValue(item?.reason)} />
                           ))}
                        </div>
                     </div>
                  </div>

                  {/* Right Col: AI Lists & Insights */}
                  <div className="space-y-6 flex flex-col justify-between">
                     <AiList title="What you did well" items={ai.strengths || []} />
                     <AiList title="Where you fell short" items={ai.weaknesses || []} />
                     <AiList title="How to improve" items={ai.recommendations || []} />
                  </div>

                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}