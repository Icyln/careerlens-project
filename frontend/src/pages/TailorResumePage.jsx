import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Download,
  FileText,
  LayoutTemplate,
  Loader2,
  ShieldCheck,
  WandSparkles,
} from 'lucide-react';
import { fetchAnalysisReports, getErrorMessage, tailorResume } from '../api/client.js';
import { formatDateTime } from '../utils/format.js';
import { toText } from '../utils/safeRender.js';

const TEMPLATES = [
  {
    key: 'classic_ats',
    name: 'Classic ATS Template',
    tag: 'Recommended',
    description: 'Simple one-column format with standard headings. Safest for ATS parsing.',
  },
  {
    key: 'modern_professional',
    name: 'Modern Professional Template',
    tag: 'Clean',
    description: 'Polished layout with a professional header and clear grouped sections.',
  },
  {
    key: 'compact_graduate',
    name: 'Compact Template',
    tag: 'Students',
    description: 'Compact structure for fresh graduates, internships, and project-heavy resumes.',
  },
];

const EMPTY_FIELDS = {
  full_name: '',
  target_title: '',
  email: '',
  phone: '',
  location: '',
  links: '',
  professional_summary: '',
  skills: '',
  hard_skills: '',
  soft_skills: '',
  work_experience: '',
  projects: '',
  education: '',
  certifications: '',
  additional_sections: '',
};

function getStoredJson(key) {
  try {
    const value = sessionStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function cleanString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(cleanString).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    const preferred = ['text', 'bullet', 'name', 'title', 'degree', 'institution', 'company', 'content', 'description', 'summary'];
    for (const key of preferred) {
      if (value[key]) return cleanString(value[key]);
    }
    return Object.values(value).map(cleanString).filter(Boolean).join(' - ');
  }
  return String(value).trim();
}

function cleanList(value) {
  const arr = Array.isArray(value) ? value : value ? [value] : [];
  const output = [];
  for (const item of arr) {
    if (Array.isArray(item)) {
      output.push(...cleanList(item));
    } else if (typeof item === 'object' && item !== null) {
      const text = cleanString(item);
      if (text) output.push(text);
    } else {
      const text = cleanString(item).replace(/^[-•]\s*/, '');
      if (text) output.push(text);
    }
  }
  return Array.from(new Set(output));
}

function normalName(value) {
  const text = cleanString(value);
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length >= 6 && parts.every((part) => /^[A-Za-z]$/.test(part))) return parts.join('');
  return text;
}

function getKeywords(report) {
  const summary = report?.ats_result?.summary || {};
  const titleMatch = summary.job_title_match || {};
  const experienceMatch = summary.experience_year_match || {};
  const educationMatch = summary.education_match || {};
  return {
    hard: cleanList(summary.hard_skills?.missing),
    soft: cleanList(summary.soft_skills?.missing),
    title: cleanList(titleMatch.missing),
    experience: cleanList(experienceMatch.applied ? experienceMatch.missing : []),
    education: cleanList(educationMatch.applied ? educationMatch.missing : []),
  };
}

function keywordGroups(report) {
  const keywords = getKeywords(report);
  return [
    { key: 'hard', title: 'Hard Skills / Tools', items: keywords.hard },
    { key: 'soft', title: 'Soft Skills', items: keywords.soft },
    { key: 'title', title: 'Role / Title', items: keywords.title },
    { key: 'education', title: 'Education', items: keywords.education },
    { key: 'experience', title: 'Experience', items: keywords.experience },
  ];
}

function flattenConfirmed(selected) {
  return {
    hard: Object.keys(selected.hard || {}).filter((key) => selected.hard[key]),
    soft: Object.keys(selected.soft || {}).filter((key) => selected.soft[key]),
    title: Object.keys(selected.title || {}).filter((key) => selected.title[key]),
    education: Object.keys(selected.education || {}).filter((key) => selected.education[key]),
    experience: Object.keys(selected.experience || {}).filter((key) => selected.experience[key]),
  };
}

function selectedCount(selected) {
  return Object.values(flattenConfirmed(selected)).reduce((total, list) => total + list.length, 0);
}


function keywordDetailKey(value) {
  return cleanString(value)
    .toLowerCase()
    .replace(/\s*:.*/, '')
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .trim();
}

function splitKeywordDetail(item) {
  const text = cleanString(item);
  if (!text) return null;

  const colonIndex = text.indexOf(':');

  if (colonIndex > 0 && colonIndex <= 80) {
    const name = text.slice(0, colonIndex).trim();
    const detail = text.slice(colonIndex + 1).trim();
    return { name, detail };
  }

  return { name: text, detail: '' };
}

function mergeKeywordDetails(...sources) {
  const byKey = new Map();

  sources.flatMap((source) => cleanList(source)).forEach((item) => {
    const parsed = splitKeywordDetail(item);
    if (!parsed?.name) return;

    const key = keywordDetailKey(parsed.name);
    if (!key) return;

    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, parsed);
      return;
    }

    if (!existing.detail && parsed.detail) {
      byKey.set(key, parsed);
    }
  });

  return Array.from(byKey.values());
}

function MiniStat({ label, value, tone = 'slate' }) {
  const toneClass = tone === 'emerald'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
    : tone === 'rose'
      ? 'bg-rose-50 text-rose-700 ring-rose-100'
      : tone === 'violet'
        ? 'bg-violet-50 text-violet-700 ring-violet-100'
        : 'bg-slate-50 text-slate-700 ring-slate-200';

  return (
    <div className={`rounded-2xl px-4 py-3 ring-1 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function KeywordPill({ children, tone = 'slate' }) {
  const toneClass = tone === 'emerald'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
    : tone === 'rose'
      ? 'bg-rose-50 text-rose-700 ring-rose-100'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-700 ring-amber-100'
        : 'bg-slate-50 text-slate-700 ring-slate-200';

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black ring-1 ${toneClass}`}>
      {children}
    </span>
  );
}

function TailoringAuditPanel({ tailored }) {
  const included = cleanList(tailored?.included_keywords);
  const includedKeys = new Set(included.map((item) => keywordDetailKey(item)));
  const skipped = mergeKeywordDetails(tailored?.not_included_keywords, tailored?.unconfirmed_keywords)
    .filter((item) => !includedKeys.has(keywordDetailKey(item.name)));
  const notes = cleanList(tailored?.safety_notes);

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-violet-700 ring-1 ring-violet-100">
            <ShieldCheck size={14} />
            Tailoring safety summary
          </div>
          <h3 className="mt-3 text-xl font-black text-slate-950">Keyword review and safety notes</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            This keeps the generated resume reviewable without making the page too long. Included items are confirmed by you. Skipped items are not added unless you explicitly support them with real experience.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:min-w-[320px]">
          <MiniStat label="Included" value={included.length} tone="emerald" />
          <MiniStat label="Skipped" value={skipped.length} tone="rose" />
          <MiniStat label="Notes" value={notes.length || 1} tone="violet" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.32fr_0.38fr_0.30fr]">
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <h4 className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Included confirmed keywords</h4>
          <div className="mt-3 flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
            {included.length ? (
              included.map((item, index) => <KeywordPill key={`included-${index}-${item}`} tone="emerald">{item}</KeywordPill>)
            ) : (
              <p className="text-sm text-slate-400">No confirmed keywords were reported as included.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <h4 className="text-xs font-black uppercase tracking-[0.18em] text-rose-700">Skipped / unconfirmed keywords</h4>
          <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
            {skipped.length ? (
              skipped.map((item, index) => (
                <div key={`skipped-${index}-${item.name}`} className="rounded-2xl bg-white p-3 ring-1 ring-rose-100">
                  <p className="text-sm font-black text-slate-800">{item.name}</p>
                  {item.detail && <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No skipped keywords were reported.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            <AlertTriangle size={15} /> Review notes
          </h4>
          <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
            {(notes.length ? notes : ['Review all AI edits before using.']).map((note, index) => (
              <div key={`note-${index}`} className="rounded-2xl bg-white p-3 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">
                {note}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatWorkExperienceItem(item) {
  if (!item || typeof item !== 'object') return cleanString(item);
  const title = cleanString(item.title || item.role || item.position || item.job_title);
  const meta = [item.company, item.location, item.dates || item.period].map(cleanString).filter(Boolean).join(' | ');
  const bullets = cleanList(item.bullets || item.responsibilities || item.achievements || item.content);
  return [title && (meta ? `${title} : ${meta}` : title), ...bullets.map((bullet) => `• ${bullet.replace(/^[-•]\s*/, '')}`)].filter(Boolean).join('\n');
}

function formatProjectItem(item) {
  if (!item || typeof item !== 'object') return cleanString(item);
  const name = cleanString(item.name || item.title || item.project);
  const bullets = cleanList(item.bullets || item.description || item.details || item.content);
  return [name, ...bullets.map((bullet) => `• ${bullet.replace(/^[-•]\s*/, '')}`)].filter(Boolean).join('\n');
}

function formatEducationItem(item) {
  if (!item || typeof item !== 'object') return cleanString(item);

  const institution = cleanString(
    item.institution || item.school || item.university || item.college
  );

  const degree = cleanString(
    item.degree || item.qualification || item.program
  );

  const dates = cleanString(item.dates || item.period);

  return [
    institution,
    degree ? `• ${degree}` : '',
    dates,
  ].filter(Boolean).join('\n');
}

function formatAdditionalSection(item) {
  if (!item || typeof item !== 'object') return cleanString(item);
  const heading = cleanString(item.heading || item.title || item.name || 'Additional Information');
  const content = cleanList(item.content || item.items || item.bullets || item.text);
  return [heading, ...content.map((line) => `• ${line.replace(/^[-•]\s*/, '')}`)].filter(Boolean).join('\n');
}

function fieldsFromStructured(structured, fallbackText = '', report = null) {
  const contact = structured?.contact || {};
  const fallbackContact = report?.ats_result?.summary?.contact_info || {};
  const work = Array.isArray(structured?.work_experience) ? structured.work_experience.map(formatWorkExperienceItem).filter(Boolean) : cleanList(structured?.work_experience);
  const projects = Array.isArray(structured?.projects) ? structured.projects.map(formatProjectItem).filter(Boolean) : cleanList(structured?.projects);
  const education = Array.isArray(structured?.education) ? structured.education.map(formatEducationItem).filter(Boolean) : cleanList(structured?.education);
  const additional = Array.isArray(structured?.additional_sections) ? structured.additional_sections.map(formatAdditionalSection).filter(Boolean) : cleanList(structured?.additional_sections);
  const hardSkills = cleanList(structured?.hard_skills || structured?.technical_skills);
  const softSkills = cleanList(structured?.soft_skills || structured?.transferable_skills);
  const fallbackSkills = cleanList(structured?.skills);
  return {
    full_name: normalName(structured?.full_name),
    target_title: cleanString(structured?.target_title || report?.job_title || ''),
    email: cleanString(contact.email || fallbackContact.email || ''),
    phone: cleanString(contact.phone || fallbackContact.phone || ''),
    location: cleanString(contact.location || fallbackContact.location || ''),
    links: cleanList(contact.links).join('\n'),
    professional_summary: cleanString(structured?.professional_summary),
    hard_skills: hardSkills.length ? hardSkills.join('\n') : fallbackSkills.join('\n'),
    soft_skills: softSkills.join('\n'),
    skills: fallbackSkills.join('\n'),
    work_experience: work.join('\n'),
    projects: projects.join('\n'),
    education: education.join('\n'),
    certifications: cleanList(structured?.certifications).join('\n'),
    additional_sections: additional.join('\n'),
    fallback_text: fallbackText,
  };
}

function lineItems(text) {
  return String(text || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function plainTextFromFields(fields) {
  const sections = [];
  const header = [fields.full_name, fields.target_title, fields.email, fields.phone, fields.location, fields.links].filter(Boolean).join('\n');
  if (header) sections.push(header);
  if (fields.professional_summary) sections.push(`PROFESSIONAL SUMMARY\n${fields.professional_summary}`);
  if (fields.hard_skills || fields.soft_skills || fields.skills) {
  const skillParts = [];

  if (fields.hard_skills) {
    skillParts.push(`Hard Skills\n${fields.hard_skills}`);
  }

  if (fields.soft_skills) {
    skillParts.push(`Soft Skills\n${fields.soft_skills}`);
  }

  if (!fields.hard_skills && !fields.soft_skills && fields.skills) {
    skillParts.push(fields.skills);
  }

  sections.push(`SKILLS\n${skillParts.join('\n\n')}`);
}
  if (fields.work_experience) sections.push(`WORK EXPERIENCE\n${fields.work_experience}`);
  if (fields.projects) sections.push(`PROJECTS\n${fields.projects}`);
  if (fields.education) sections.push(`EDUCATION\n${fields.education}`);
  if (fields.certifications) sections.push(`CERTIFICATIONS\n${fields.certifications}`);
  if (fields.additional_sections) sections.push(`ADDITIONAL INFORMATION\n${fields.additional_sections}`);
  return sections.join('\n\n').trim();
}

function downloadText(filename, text) {
  const blob = new Blob([text || ''], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function makePdfSafe(root) {
  if (!root) return;

  const nodes = [root, ...root.querySelectorAll('*')];

  nodes.forEach((node) => {
    const tag = String(node.tagName || '').toLowerCase();
    const className = String(node.className || '');

    const insideHeader = node.closest?.('header');

    node.style.boxShadow = 'none';
    node.style.textShadow = 'none';
    node.style.filter = 'none';
    node.style.outline = 'none';
    node.style.backgroundImage = 'none';

    node.style.borderColor = '#cbd5e1';
    node.style.borderTopColor = '#cbd5e1';
    node.style.borderRightColor = '#cbd5e1';
    node.style.borderBottomColor = '#cbd5e1';
    node.style.borderLeftColor = '#cbd5e1';

    if (insideHeader || tag === 'header') {
      node.style.color = '#ffffff';
    } else {
      node.style.color = '#0f172a';
    }

    if (tag === 'header' || className.includes('bg-slate-950')) {
      node.style.backgroundColor = '#0f172a';
    } else if (
      tag === 'aside' ||
      className.includes('bg-slate-50') ||
      className.includes('bg-slate-100')
    ) {
      node.style.backgroundColor = '#f8fafc';
    } else if (
      className.includes('bg-white') ||
      node === root
    ) {
      node.style.backgroundColor = '#ffffff';
    } else if (
      className.includes('bg-violet') ||
      className.includes('bg-blue') ||
      className.includes('bg-emerald') ||
      className.includes('bg-rose') ||
      className.includes('bg-amber')
    ) {
      node.style.backgroundColor = '#f1f5f9';
    } else {
      node.style.backgroundColor = 'transparent';
    }
  });
}

async function exportPreviewPdf(element, setMessage) {
  if (!element) {
    setMessage?.({
      type: 'error',
      text: 'PDF preview is not ready yet. Please generate the resume first.',
    });
    return;
  }

  let printWrapper = null;

  try {
    printWrapper = document.createElement('div');
    printWrapper.style.position = 'fixed';
    printWrapper.style.left = '-10000px';
    printWrapper.style.top = '0';
    printWrapper.style.width = '794px';
    printWrapper.style.backgroundColor = '#ffffff';
    printWrapper.style.color = '#0f172a';
    printWrapper.style.zIndex = '-1';

    const clone = element.cloneNode(true);
    clone.setAttribute('data-pdf-export-root', 'true');

    clone.style.width = '794px';
    clone.style.minHeight = '1123px';
    clone.style.backgroundColor = '#ffffff';
    clone.style.color = '#0f172a';
    clone.style.boxShadow = 'none';
    clone.style.transform = 'none';

    printWrapper.appendChild(clone);
    document.body.appendChild(printWrapper);

    makePdfSafe(clone);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const canvas = await html2canvas(clone, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 794,
      windowHeight: clone.scrollHeight,
      onclone: (clonedDocument) => {
        const clonedRoot = clonedDocument.querySelector('[data-pdf-export-root="true"]');
        makePdfSafe(clonedRoot);
      },
    });

    const pdf = new jsPDF('p', 'mm', 'a4');

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 8;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;

    const pageCanvasHeight = Math.floor((contentHeight * canvas.width) / contentWidth);

    let sourceY = 0;
    let pageIndex = 0;

    while (sourceY < canvas.height) {
      const sliceHeight = Math.min(pageCanvasHeight, canvas.height - sourceY);

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;

      const ctx = pageCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

      ctx.drawImage(
        canvas,
        0,
        sourceY,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight
      );

      const imgData = pageCanvas.toDataURL('image/png');
      const imgHeight = (sliceHeight * contentWidth) / canvas.width;

      if (pageIndex > 0) {
        pdf.addPage();
      }

      pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, imgHeight);

      sourceY += sliceHeight;
      pageIndex += 1;
    }

    pdf.save('careerlens_tailored_resume.pdf');

    setMessage?.({
      type: 'success',
      text: 'PDF downloaded successfully.',
    });
  } catch (error) {
    console.error('PDF export failed:', error);

    setMessage?.({
      type: 'error',
      text: `Could not export PDF: ${error?.message || 'Unknown browser rendering error.'}`,
    });
  } finally {
    if (printWrapper && document.body.contains(printWrapper)) {
      document.body.removeChild(printWrapper);
    }
  }
}

function docxHeading(text) {
  return new Paragraph({
    spacing: { before: 260, after: 100 },
    border: {
      bottom: {
        color: 'CBD5E1',
        space: 1,
        style: 'single',
        size: 6,
      },
    },
    children: [
      new TextRun({
        text: String(text || '').toUpperCase(),
        bold: true,
        size: 22,
        color: '334155',
      }),
    ],
  });
}

function docxNormal(text, options = {}) {
  return new Paragraph({
    spacing: { after: options.after ?? 80 },
    alignment: options.align || AlignmentType.LEFT,
    children: [
      new TextRun({
        text: String(text || ''),
        bold: !!options.bold,
        italics: !!options.italics,
        size: options.size || 21,
        color: options.color || '334155',
      }),
    ],
  });
}

function docxBullet(text) {
  const clean = String(text || '').replace(/^[-•]\s*/, '').trim();
  if (!clean) return null;

  return new Paragraph({
    spacing: { after: 70 },
    indent: { left: 360, hanging: 220 },
    children: [
      new TextRun({
        text: '• ',
        size: 21,
        color: '475569',
      }),
      new TextRun({
        text: clean,
        size: 21,
        color: '334155',
      }),
    ],
  });
}

function addDocxSection(paragraphs, title, content, mode = 'bullets') {
  const items = lineItems(content);
  if (!items.length) return;

  paragraphs.push(docxHeading(title));

  if (mode === 'paragraph') {
    paragraphs.push(docxNormal(items.join(' '), { after: 120 }));
    return;
  }

  if (mode === 'structured') {
    items.forEach((item) => {
      const isBullet = /^[-•]\s*/.test(item);
      const clean = item.replace(/^[-•]\s*/, '');

      if (isBullet) {
        const bullet = docxBullet(clean);
        if (bullet) paragraphs.push(bullet);
      } else {
        paragraphs.push(docxNormal(clean, { bold: true, after: 60 }));
      }
    });
    return;
  }

  items.forEach((item) => {
    const bullet = docxBullet(item);
    if (bullet) paragraphs.push(bullet);
  });
}

function addDocxEducation(paragraphs, educationText) {
  const items = lineItems(educationText);
  if (!items.length) return;

  paragraphs.push(docxHeading('Education'));

  items.forEach((item, index) => {
    const isBullet = /^[-•]\s*/.test(item);
    const clean = item.replace(/^[-•]\s*/, '');

    const looksLikeDate =
      /\b\d{4}\b|\b\d{2}\/\d{4}\b|\b\d{2}\/\d{2}\b|present|current|now/i.test(clean);

    if (isBullet) {
      const bullet = docxBullet(clean);
      if (bullet) paragraphs.push(bullet);
    } else if (looksLikeDate && index > 0) {
      paragraphs.push(docxNormal(clean, { italics: true, color: '64748B', after: 120 }));
    } else {
      paragraphs.push(docxNormal(clean, { bold: true, after: 40 }));
    }
  });
}

function addDocxCertifications(paragraphs, certificationsText) {
  const items = lineItems(certificationsText);
  if (!items.length) return;

  paragraphs.push(docxHeading('Certifications'));

  items.forEach((item) => {
    const clean = item.replace(/^[-•]\s*/, '');
    const parts = clean.split(' — ');
    const certificateName = parts[0] || '';
    const institution = parts.slice(1).join(' — ');

    if (institution && certificateName) {
      paragraphs.push(docxNormal(institution, { bold: true, after: 40 }));
      const bullet = docxBullet(certificateName);
      if (bullet) paragraphs.push(bullet);
    } else {
      const bullet = docxBullet(certificateName || clean);
      if (bullet) paragraphs.push(bullet);
    }
  });
}

async function exportResumeDocx(fields, setMessage) {
  try {
    const paragraphs = [];

    if (fields.full_name) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: fields.full_name.toUpperCase(),
              bold: true,
              size: 34,
              color: '0F172A',
            }),
          ],
        })
      );
    }

    if (fields.target_title) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: fields.target_title,
              bold: true,
              size: 24,
              color: '475569',
            }),
          ],
        })
      );
    }

    const contactLine = [fields.email, fields.phone, fields.location, fields.links]
      .filter(Boolean)
      .join(' | ');

    if (contactLine) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 220 },
          children: [
            new TextRun({
              text: contactLine,
              size: 20,
              color: '475569',
            }),
          ],
        })
      );
    }

    addDocxSection(paragraphs, 'Professional Summary', fields.professional_summary, 'paragraph');

    if (fields.hard_skills || fields.soft_skills || fields.skills) {
      paragraphs.push(docxHeading('Skills'));

      if (fields.hard_skills) {
        paragraphs.push(docxNormal('Hard Skills', { bold: true, after: 40 }));
        lineItems(fields.hard_skills).forEach((item) => {
          const bullet = docxBullet(item);
          if (bullet) paragraphs.push(bullet);
        });
      }

      if (fields.soft_skills) {
        paragraphs.push(docxNormal('Soft Skills', { bold: true, after: 40 }));
        lineItems(fields.soft_skills).forEach((item) => {
          const bullet = docxBullet(item);
          if (bullet) paragraphs.push(bullet);
        });
      }

      if (!fields.hard_skills && !fields.soft_skills && fields.skills) {
        lineItems(fields.skills).forEach((item) => {
          const bullet = docxBullet(item);
          if (bullet) paragraphs.push(bullet);
        });
      }
    }

    addDocxSection(paragraphs, 'Work Experience', fields.work_experience, 'structured');
    addDocxSection(paragraphs, 'Projects', fields.projects, 'structured');
    addDocxEducation(paragraphs, fields.education);
    addDocxCertifications(paragraphs, fields.certifications);
    addDocxSection(paragraphs, 'Additional Information', fields.additional_sections, 'bullets');

    const document = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 720,
                right: 720,
                bottom: 720,
                left: 720,
              },
            },
          },
          children: paragraphs,
        },
      ],
    });

    const blob = await Packer.toBlob(document);
    downloadBlob('careerlens_tailored_resume.docx', blob);

    setMessage?.({
      type: 'success',
      text: 'DOCX downloaded successfully.',
    });
  } catch (error) {
    setMessage?.({
      type: 'error',
      text: 'Could not export DOCX. Make sure the docx package is installed.',
    });
  }
}

function Notice({ type = 'info', children }) {
  const classes = type === 'warning'
    ? 'border-amber-200 bg-amber-50 text-amber-900'
    : type === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : type === 'error'
        ? 'border-rose-200 bg-rose-50 text-rose-900'
        : 'border-blue-200 bg-blue-50 text-blue-900';
  return <div className={`rounded-2xl border p-4 text-sm font-semibold leading-6 ${classes}`}>{children}</div>;
}

function ReportSelector({ reports, selectedReportId, setSelectedReportId }) {
  if (!reports.length) {
    return <Notice type="warning">No ATS reports are available yet. Run an ATS analysis first, then come back to tailor the resume.</Notice>;
  }

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
      <label htmlFor="report-select" className="text-sm font-black text-slate-950">Choose ATS report</label>
      <select
        id="report-select"
        value={selectedReportId || ''}
        onChange={(event) => setSelectedReportId(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      >
        <option value="">Select a report</option>
        {reports.map((report) => (
          <option key={report.id} value={report.id}>
            {report.job_title} - {report.resume?.original_name || 'Resume'} - {formatDateTime(report.created_at)}
          </option>
        ))}
      </select>
    </div>
  );
}

function TemplatePicker({ selectedTemplate, setSelectedTemplate }) {
  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
      <h3 className="flex items-center gap-2 text-lg font-black text-slate-950"><LayoutTemplate size={20} /> Choose template</h3>
      <div className="mt-4 grid gap-3">
        {TEMPLATES.map((template) => {
          const active = selectedTemplate === template.key;
          return (
            <button
              key={template.key}
              type="button"
              onClick={() => setSelectedTemplate(template.key)}
              className={`rounded-2xl p-4 text-left ring-1 transition ${active ? 'bg-violet-50 ring-violet-200' : 'bg-slate-50 ring-slate-200 hover:bg-white'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-black text-slate-950">{template.name}</p>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-100">{template.tag}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{template.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function KeywordConfirmPanel({ groups, selectedKeywords, setSelectedKeywords }) {
  const toggle = (groupKey, item) => {
    setSelectedKeywords((current) => ({
      ...current,
      [groupKey]: {
        ...(current[groupKey] || {}),
        [item]: !current[groupKey]?.[item],
      },
    }));
  };

  const selectGroup = (groupKey, items, value) => {
    setSelectedKeywords((current) => ({
      ...current,
      [groupKey]: Object.fromEntries(items.map((item) => [item, value])),
    }));
  };

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
      <h3 className="flex items-center gap-2 text-lg font-black text-slate-950"><ShieldCheck size={20} /> Confirm truthful ATS keywords</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        CareerLens found these missing exact ATS keywords. Select only the keywords that truthfully describe your experience, education, or skills. AI will not add unselected keywords.
      </p>
      <div className="mt-5 space-y-5">
        {groups.map((group) => (
          <div key={group.key} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-black uppercase tracking-wide text-slate-500">{group.title}</h4>
              {!!group.items.length && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => selectGroup(group.key, group.items, true)} className="text-xs font-black text-violet-700 hover:text-violet-900">Select all</button>
                  <button type="button" onClick={() => selectGroup(group.key, group.items, false)} className="text-xs font-black text-slate-500 hover:text-slate-700">Clear</button>
                </div>
              )}
            </div>
            {group.items.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {group.items.map((item) => {
                  const checked = !!selectedKeywords[group.key]?.[item];
                  return (
                    <label key={`${group.key}-${item}`} className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-bold ring-1 transition ${checked ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-100'}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggle(group.key, item)} className="h-4 w-4 accent-emerald-600" />
                      {item}
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-400">No missing items in this group.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EditorField({ label, value, onChange, rows = 4, placeholder = '' }) {
  return (
    <div>
      <label className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</label>
      <textarea
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
      />
    </div>
  );
}

function ResumeEditor({ fields, setFields }) {
  const [activeSection, setActiveSection] = useState('profile');
  const update = (key, value) => setFields((current) => ({ ...current, [key]: value }));

  const sections = [
    {
      key: 'profile',
      label: 'Profile',
      description: 'Name, title, contact, and summary.',
      count: [fields.full_name, fields.target_title, fields.email, fields.phone, fields.location, fields.professional_summary].filter(Boolean).length,
      content: (
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <EditorField label="Full name" rows={2} value={fields.full_name} onChange={(value) => update('full_name', value)} />
            <EditorField label="Target title" rows={2} value={fields.target_title} onChange={(value) => update('target_title', value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <EditorField label="Email" rows={2} value={fields.email} onChange={(value) => update('email', value)} />
            <EditorField label="Phone" rows={2} value={fields.phone} onChange={(value) => update('phone', value)} />
            <EditorField label="Location" rows={2} value={fields.location} onChange={(value) => update('location', value)} />
          </div>
          <EditorField label="Links" rows={2} value={fields.links} onChange={(value) => update('links', value)} placeholder="LinkedIn, portfolio, GitHub, website" />
          <EditorField label="Professional summary" rows={5} value={fields.professional_summary} onChange={(value) => update('professional_summary', value)} />
        </div>
      ),
    },
    {
      key: 'skills',
      label: 'Skills',
      description: 'Hard and soft skills only.',
      count: lineItems(fields.hard_skills).length + lineItems(fields.soft_skills).length + lineItems(fields.skills).length,
      content: (
        <div className="grid gap-4">
          <EditorField
            label="Hard Skills"
            rows={7}
            value={fields.hard_skills}
            onChange={(value) => update('hard_skills', value)}
            placeholder="Tools, platforms, technical skills, role-specific skills"
          />
          <EditorField
            label="Soft Skills"
            rows={6}
            value={fields.soft_skills}
            onChange={(value) => update('soft_skills', value)}
            placeholder="Communication, teamwork, adaptability, problem solving"
          />
        </div>
      ),
    },
    {
      key: 'experience',
      label: 'Experience',
      description: 'Work history and role bullets.',
      count: lineItems(fields.work_experience).length,
      content: (
        <EditorField
          label="Work experience"
          rows={12}
          value={fields.work_experience}
          onChange={(value) => update('work_experience', value)}
          placeholder="Role line, then one bullet per line"
        />
      ),
    },
    {
      key: 'projects',
      label: 'Projects',
      description: 'Portfolio, academic, or practical projects.',
      count: lineItems(fields.projects).length,
      content: (
        <EditorField
          label="Projects"
          rows={10}
          value={fields.projects}
          onChange={(value) => update('projects', value)}
        />
      ),
    },
    {
      key: 'education',
      label: 'Education',
      description: 'Education and certificates.',
      count: lineItems(fields.education).length + lineItems(fields.certifications).length,
      content: (
        <div className="grid gap-4">
          <EditorField label="Education" rows={7} value={fields.education} onChange={(value) => update('education', value)} />
          <EditorField label="Certifications" rows={6} value={fields.certifications} onChange={(value) => update('certifications', value)} />
        </div>
      ),
    },
    {
      key: 'additional',
      label: 'Other',
      description: 'Awards, languages, availability, or extra sections.',
      count: lineItems(fields.additional_sections).length,
      content: (
        <EditorField
          label="Additional sections"
          rows={8}
          value={fields.additional_sections}
          onChange={(value) => update('additional_sections', value)}
        />
      ),
    },
  ];

  const active = sections.find((section) => section.key === activeSection) || sections[0];

  return (
    <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200 shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-black text-slate-950">
              <FileText size={20} /> Live editor
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Edit one section at a time so the page stays short. The preview updates live.
            </p>
          </div>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-100">
            {active.label}
          </span>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {sections.map((section) => {
            const activeTab = activeSection === section.key;
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                className={`shrink-0 rounded-2xl px-4 py-3 text-left ring-1 transition ${
                  activeTab
                    ? 'bg-violet-600 text-white ring-violet-600 shadow-lg shadow-violet-600/20'
                    : 'bg-slate-50 text-slate-600 ring-slate-200 hover:bg-white hover:text-slate-950'
                }`}
              >
                <span className="block text-xs font-black uppercase tracking-wide">{section.label}</span>
                <span className={`mt-1 block text-[11px] font-bold ${activeTab ? 'text-white/70' : 'text-slate-400'}`}>
                  {section.count} item{section.count === 1 ? '' : 's'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5">
        <div className="mb-4 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Editing section</p>
          <p className="mt-1 text-sm font-bold text-slate-700">{active.description}</p>
        </div>
        <div className="max-h-[68vh] overflow-y-auto pr-1">
          {active.content}
        </div>
      </div>
    </div>
  );
}

function hasLines(text) {
  return lineItems(text).length > 0;
}

function Section({ title, children, show = true }) {
  if (!show) return null;
  return (
    <section className="mt-5">
      <h3 className="border-b border-slate-300 pb-1 text-xs font-black uppercase tracking-[0.18em] text-slate-700">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-slate-700 text-justify">{children}</div>
    </section>
  );
}

function SplitSkillsList({ hardSkills, softSkills, fallbackSkills }) {
  const hard = lineItems(hardSkills);
  const soft = lineItems(softSkills);
  const fallback = lineItems(fallbackSkills);

  if (!hard.length && !soft.length && !fallback.length) return null;

  if (!hard.length && !soft.length) {
    return <BulletList text={fallbackSkills} />;
  }

  return (
    <div className="space-y-4">
      {!!hard.length && (
        <div>
          <p className="font-black text-slate-800">Hard Skills</p>
          <BulletList text={hardSkills} />
        </div>
      )}

      {!!soft.length && (
        <div>
          <p className="font-black text-slate-800">Soft Skills</p>
          <BulletList text={softSkills} />
        </div>
      )}
    </div>
  );
}

function BulletList({ text }) {
  const items = lineItems(text);
  if (!items.length) return null;

  return (
    <ul className="space-y-1.5">
      {items.map((item, index) => {
        const clean = item.replace(/^[-•]\s*/, '');

        return (
          <li key={index} className="grid grid-cols-[0.8rem_1fr] gap-2 text-left">
            <span className="pt-[0.42rem] text-[0.55rem] leading-none text-slate-500">●</span>
            <span className="leading-6">{clean}</span>
          </li>
        );
      })}
    </ul>
  );
}

function StructuredLines({ text }) {
  const items = lineItems(text);
  if (!items.length) return null;
  return (
    <div className="space-y-1">
      {items.map((item, index) => {
        const isBullet = /^[-•]\s*/.test(item);
        const clean = item.replace(/^[-•]\s*/, '');
        return isBullet ? (
          <div key={index} className="grid grid-cols-[0.8rem_1fr] gap-2 text-justify">
            <span className="pt-[0.42rem] text-[0.6rem] leading-none text-slate-500">●</span>
            <span>{clean}</span>
          </div>
        ) : (
          <p key={index} className="font-bold text-slate-800">
           {clean}
          </p>
        );
      })}
    </div>
  );
}

function EducationLines({ text }) {
  const items = lineItems(text);
  if (!items.length) return null;

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const clean = item.replace(/^[-•]\s*/, '');
        const isBullet = /^[-•]\s*/.test(item);

        if (isBullet) {
          return (
            <div key={index} className="grid grid-cols-[0.8rem_1fr] gap-2 text-justify">
              <span className="pt-[0.42rem] text-[0.6rem] leading-none text-slate-500">●</span>
              <span className="text-sm text-slate-700">{clean}</span>
            </div>
          );
        }

        const looksLikeDateOrLocation =
          /\b\d{4}\b|\b\d{2}\/\d{4}\b|\b\d{2}\/\d{2}\b|present|current|now/i.test(clean) ||
          clean.includes(',') ||
          clean.includes('|');

        if (looksLikeDateOrLocation && index > 0) {
          return (
            <p key={index} className="text-sm text-slate-500">
              {clean}
            </p>
          );
        }

        return (
          <p key={index} className="font-black text-slate-950">
            {clean}
          </p>
        );
      })}
    </div>
  );
}

function CertificationLines({ text }) {
  const items = lineItems(text);
  if (!items.length) return null;

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const clean = item.replace(/^[-•]\s*/, '');
        const parts = clean.split(' — ');
        const certificateName = parts[0] || '';
        const institution = parts.slice(1).join(' — ');

        if (institution && certificateName) {
          return (
            <div key={index}>
              <p className="font-black text-slate-950">{institution}</p>
              <p className="mt-1 text-sm text-slate-700">• {certificateName}</p>
            </div>
          );
        }

        return (
          <p key={index} className="text-sm text-slate-700">
            • {certificateName || clean}
          </p>
        );
      })}
    </div>
  );
}

function TemplatePreview({ template, fields, previewRef }) {
  const skills = lineItems(fields.hard_skills || fields.skills);
  const hasSkillLines = hasLines(fields.hard_skills) || hasLines(fields.soft_skills) || hasLines(fields.skills);
  const contact = [fields.email, fields.phone, fields.location, fields.links].filter(Boolean);

  if (template === 'modern_professional') {
    return (
      <div ref={previewRef} className="min-h-[29.7cm] bg-white p-8 text-slate-900 shadow-sm ring-1 ring-slate-200">
        <header className="rounded-2xl bg-slate-950 p-6 text-white">
          <h1 className="text-3xl font-black tracking-tight">{fields.full_name || 'Your Name'}</h1>
          <p className="mt-1 text-lg font-bold text-violet-200">{fields.target_title || 'Target Job Title'}</p>
          <p className="mt-4 text-sm leading-6 text-slate-300">{contact.join(' | ')}</p>
        </header>
        <div className="mt-6 grid gap-6 md:grid-cols-[0.34fr_0.66fr]">
          <aside>
            <Section title="Skills" show={hasSkillLines}>
              <SplitSkillsList
                hardSkills={fields.hard_skills}
                softSkills={fields.soft_skills}
                fallbackSkills={fields.skills}
              />
            </Section>
            <Section title="Education" show={hasLines(fields.education)}><EducationLines text={fields.education} /></Section>
            <Section title="Certifications" show={hasLines(fields.certifications)}><CertificationLines text={fields.certifications} /></Section>
          </aside>
          <main>
            <Section title="Professional Summary" show={!!fields.professional_summary}><p>{fields.professional_summary}</p></Section>
            <Section title="Work Experience" show={hasLines(fields.work_experience)}><StructuredLines text={fields.work_experience} /></Section>
            <Section title="Projects" show={hasLines(fields.projects)}><StructuredLines text={fields.projects} /></Section>
            <Section title="Additional Information" show={hasLines(fields.additional_sections)}><BulletList text={fields.additional_sections} /></Section>
          </main>
        </div>
      </div>
    );
  }

  if (template === 'compact_graduate') {
  return (
    <div ref={previewRef} className="min-h-[29.7cm] bg-white text-slate-900 shadow-sm ring-1 ring-slate-200">
      <header className="bg-slate-950 px-8 py-7 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-[0.12em]">
              {fields.full_name || 'Your Name'}
            </h1>
            <p className="mt-2 text-sm font-bold uppercase tracking-[0.22em] text-violet-200">
              {fields.target_title || 'Target Job Title'}
            </p>
          </div>

          {!!contact.length && (
            <div className="max-w-xs rounded-2xl bg-white/10 px-4 py-3 text-right text-xs leading-5 text-slate-200 ring-1 ring-white/10">
              {contact.map((item, index) => (
                <p key={index}>{item}</p>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="grid gap-0 md:grid-cols-[0.34fr_0.66fr]">
        <aside className="bg-slate-50 px-6 py-6 ring-1 ring-slate-200">
          <Section title="Skills" show={hasSkillLines}>
            <SplitSkillsList
              hardSkills={fields.hard_skills}
              softSkills={fields.soft_skills}
              fallbackSkills={fields.skills}
            />
          </Section>

          <Section title="Education" show={hasLines(fields.education)}>
            <EducationLines text={fields.education} />
          </Section>

          <Section title="Certifications" show={hasLines(fields.certifications)}>
            <CertificationLines text={fields.certifications} />
          </Section>

          <Section title="Additional Information" show={hasLines(fields.additional_sections)}>
            <BulletList text={fields.additional_sections} />
          </Section>
        </aside>

        <main className="px-8 py-6">
          <Section title="Profile" show={!!fields.professional_summary}>
            <p className="text-left leading-6">{fields.professional_summary}</p>
          </Section>

          <Section title="Projects" show={hasLines(fields.projects)}>
            <StructuredLines text={fields.projects} />
          </Section>

          <Section title="Experience" show={hasLines(fields.work_experience)}>
            <StructuredLines text={fields.work_experience} />
          </Section>
        </main>
      </div>
    </div>
  );
}

  return (
    <div ref={previewRef} className="min-h-[29.7cm] bg-white p-8 text-slate-900 shadow-sm ring-1 ring-slate-200">
      <header>
        <h1 className="text-3xl font-black uppercase tracking-wide">{fields.full_name || 'Your Name'}</h1>
        <p className="mt-1 text-base font-bold text-slate-700">{fields.target_title || 'Target Job Title'}</p>
        <p className="mt-3 text-sm leading-6 text-slate-600">{contact.join(' | ')}</p>
      </header>
      <Section title="Professional Summary" show={!!fields.professional_summary}><p>{fields.professional_summary}</p></Section>
      <Section title="Skills" show={hasSkillLines}>
        <SplitSkillsList
          hardSkills={fields.hard_skills}
          softSkills={fields.soft_skills}
          fallbackSkills={fields.skills}
        />
      </Section>
      <Section title="Work Experience" show={hasLines(fields.work_experience)}><StructuredLines text={fields.work_experience} /></Section>
      <Section title="Projects" show={hasLines(fields.projects)}><StructuredLines text={fields.projects} /></Section>
      <Section title="Education" show={hasLines(fields.education)}><EducationLines text={fields.education} /></Section>
      <Section title="Certifications" show={hasLines(fields.certifications)}><CertificationLines text={fields.certifications} /></Section>
      <Section title="Additional Information" show={hasLines(fields.additional_sections)}><BulletList text={fields.additional_sections} /></Section>
    </div>
  );
}

export default function TailorResumePage() {
  const previewRef = useRef(null);
  const storedReport = getStoredJson('careerlens_tailor_report');
  const [reports, setReports] = useState(storedReport ? [storedReport] : []);
  const [selectedReportId, setSelectedReportId] = useState(storedReport?.id || '');
  const [loadingReports, setLoadingReports] = useState(!storedReport);
  const [selectedTemplate, setSelectedTemplate] = useState('classic_ats');
  const [selectedKeywords, setSelectedKeywords] = useState({ hard: {}, soft: {}, title: {}, education: {}, experience: {} });
  const [truthConfirmed, setTruthConfirmed] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [tailored, setTailored] = useState(null);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    async function loadReports() {
      try {
        setLoadingReports(true);
        const data = await fetchAnalysisReports();
        const clean = Array.isArray(data) ? data : data?.results || [];
        setReports((current) => {
          const combined = [...current];
          for (const report of clean) {
            if (!combined.some((item) => String(item.id) === String(report.id))) combined.push(report);
          }
          return combined;
        });
        if (!selectedReportId && clean.length) setSelectedReportId(clean[0].id);
      } catch (error) {
        setMessage({ type: 'error', text: getErrorMessage(error) });
      } finally {
        setLoadingReports(false);
      }
    }
    loadReports();
  }, []);

  const selectedReport = useMemo(
    () => reports.find((report) => String(report.id) === String(selectedReportId)) || null,
    [reports, selectedReportId]
  );

  const groups = useMemo(() => keywordGroups(selectedReport), [selectedReport]);
  const selectedTotal = selectedCount(selectedKeywords);
  const plainText = plainTextFromFields(fields) || tailored?.tailored_resume_text || '';

  useEffect(() => {
    setTailored(null);
    setFields(EMPTY_FIELDS);
    setSelectedKeywords({ hard: {}, soft: {}, title: {}, education: {}, experience: {} });
    setTruthConfirmed(false);
  }, [selectedReportId]);

  const handleTailor = async () => {
    if (!selectedReport?.id) {
      setMessage({ type: 'warning', text: 'Choose an ATS report first.' });
      return;
    }
    if (!truthConfirmed) {
      setMessage({ type: 'warning', text: 'Confirm that selected keywords are truthful before generating the tailored resume.' });
      return;
    }
    try {
      setTailoring(true);
      setMessage(null);
      const result = await tailorResume(selectedReport.id, {
        template: selectedTemplate,
        confirmed_keywords: flattenConfirmed(selectedKeywords),
      });
      setTailored(result);
      setFields(fieldsFromStructured(result.structured_resume || {}, result.tailored_resume_text || '', selectedReport));
      setMessage({
        type: result.status === 'success' ? 'success' : 'warning',
        text: result.status === 'success' ? 'AI tailored resume generated. Review and edit it before exporting.' : toText(result.message, 'AI tailoring returned a fallback result.'),
      });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setTailoring(false);
    }
  };

  const copyResume = () => {
    if (!plainText) return;
    navigator.clipboard?.writeText(plainText)
      .then(() => setMessage({ type: 'success', text: 'Tailored resume copied to clipboard.' }))
      .catch(() => setMessage({ type: 'error', text: 'Could not copy automatically. Select and copy manually.' }));
  };

  return (
    <div className="space-y-8">
      <section className="glass-panel rounded-[2rem] p-7 sm:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-sm font-black text-violet-700 ring-1 ring-violet-100">
              <WandSparkles size={16} />
              Tailor Your Resume
            </div>
            <h1 className="mt-6 max-w-4xl text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Choose a CV template, confirm truthful ATS keywords, and let AI tailor your resume safely.
            </h1>
            <p className="mt-5 max-w-4xl text-lg leading-8 text-slate-600">
              CareerLens uses Gemini to rewrite only with user-confirmed, truthful keywords. AI does not change the ATS score and does not preserve the original PDF design exactly.
            </p>
          </div>
          <Link to="/ats" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
            Back to ATS
          </Link>
        </div>
      </section>

      {message && <Notice type={message.type}>{message.text}</Notice>}

      <div className="grid gap-6 xl:grid-cols-[0.38fr_0.62fr]">
        <div className="space-y-6">
          {loadingReports ? <div className="h-32 animate-pulse rounded-3xl bg-white ring-1 ring-slate-200" /> : <ReportSelector reports={reports} selectedReportId={selectedReportId} setSelectedReportId={setSelectedReportId} />}
          <TemplatePicker selectedTemplate={selectedTemplate} setSelectedTemplate={setSelectedTemplate} />
          <KeywordConfirmPanel groups={groups} selectedKeywords={selectedKeywords} setSelectedKeywords={setSelectedKeywords} />

          <Notice type="warning">
            AI can only use the keywords you select here. Select a missing keyword only if it truthfully describes your real skills, education, experience, tools, or background.
          </Notice>

          <label className="flex cursor-pointer gap-3 rounded-3xl bg-white p-5 ring-1 ring-slate-200">
            <input type="checkbox" checked={truthConfirmed} onChange={(event) => setTruthConfirmed(event.target.checked)} className="mt-1 h-5 w-5 accent-violet-600" />
            <span className="text-sm font-bold leading-6 text-slate-700">
              I confirm that the selected skills, tools, education, experience, and keywords are truthful and supported by my background.
            </span>
          </label>

          <button
            type="button"
            onClick={handleTailor}
            disabled={tailoring || !selectedReport?.id || !truthConfirmed}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-violet-600/20 transition hover:-translate-y-0.5 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {tailoring ? <Loader2 className="animate-spin" size={18} /> : <WandSparkles size={18} />}
            {tailoring ? 'Generating tailored resume...' : `Generate AI Tailored Resume${selectedTotal ? ` (${selectedTotal} confirmed)` : ''}`}
          </button>
        </div>

        <div className="space-y-6">
          {selectedReport && (
            <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-2xl shadow-slate-950/20">
              <p className="text-sm font-black uppercase tracking-wide text-violet-200">Selected ATS report</p>
              <h2 className="mt-2 text-2xl font-black">{toText(selectedReport.job_title, 'Target role')}</h2>
              <p className="mt-2 text-sm text-slate-300">{selectedReport.resume?.original_name || 'Resume'} - {formatDateTime(selectedReport.created_at)}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-5 ring-1 ring-slate-200">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-black text-slate-950"><CheckCircle2 size={20} /> Review, edit, and export</h3>
              <p className="mt-1 text-sm text-slate-500">Left side editor updates the selected CV template preview live.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copyResume} disabled={!plainText} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200 disabled:opacity-40"><Clipboard size={14} /> Copy</button>
              <button
                type="button"
                onClick={() => exportResumeDocx(fields, setMessage)}
                disabled={!plainText}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200 disabled:opacity-40"
              >
                <Download size={14} /> DOCX
              </button>
              <button type="button" onClick={() => exportPreviewPdf(previewRef.current, setMessage)} disabled={!plainText} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-40"><Download size={14} /> PDF</button>
            </div>
          </div>

          {!tailored && (
            <Notice>
              Choose a template, select truthful missing keywords, confirm honesty, and generate the tailored resume. The live editor and preview will appear here.
            </Notice>
          )}

          {tailored && (
            <>
              <div className="grid gap-6 2xl:grid-cols-[0.48fr_0.52fr]">
                <ResumeEditor fields={fields} setFields={setFields} />
                <div className="self-start rounded-3xl bg-slate-100 p-4 ring-1 ring-slate-200 2xl:sticky 2xl:top-24">
                  <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="flex items-center gap-2 text-lg font-black text-slate-950"><LayoutTemplate size={20} /> Live CV preview</h3>
                    <span className="text-xs font-black uppercase tracking-wide text-slate-400">Scroll inside preview</span>
                  </div>
                  <div className="max-h-[82vh] overflow-auto rounded-2xl bg-white p-2">
                    <div className="min-w-[794px]">
                      <TemplatePreview template={selectedTemplate} fields={fields} previewRef={previewRef} />
                    </div>
                  </div>
                </div>
              </div>

              <TailoringAuditPanel tailored={tailored} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
