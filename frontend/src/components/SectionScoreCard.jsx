import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import ProgressBar from './ProgressBar.jsx';
import { toArray, toText, toNumber } from '../utils/safeRender.js';

export default function SectionScoreCard({ section }) {
  const [open, setOpen] = useState(true);
  const checks = toArray(section?.checks);
  const sectionName = toText(section?.name, 'Section');
  const sectionFeedback = toText(section?.feedback, '');
  const sectionScore = Math.max(0, Math.min(100, toNumber(section?.score, 0)));
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-start justify-between gap-4 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-black text-slate-950">{sectionName}</h3>
            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">{sectionScore}%</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">{sectionFeedback}</p>
        </div>
        <span className="rounded-full bg-slate-100 p-2 text-slate-500">{open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
      </button>

      {open && (
        <div className="mt-5 space-y-5 border-t border-slate-100 pt-5">
          {checks.map((check, index) => (
            <div key={`${toText(check?.name, 'check')}-${index}`} className="rounded-2xl bg-slate-50 p-4">
              <ProgressBar value={check?.score ?? (check?.passed ? 100 : 0)} label={check?.name} caption={check?.feedback} />
              {(toArray(check?.matched).length > 0 || toArray(check?.missing).length > 0) && (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {toArray(check?.matched).length > 0 && (
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Matched</p>
                      <p className="mt-1 text-sm text-slate-600">{toArray(check?.matched).map((item) => toText(item)).filter(Boolean).join(', ')}</p>
                    </div>
                  )}
                  {toArray(check?.missing).length > 0 && (
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-rose-700">Missing</p>
                      <p className="mt-1 text-sm text-slate-600">{toArray(check?.missing).map((item) => toText(item)).filter(Boolean).join(', ')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
