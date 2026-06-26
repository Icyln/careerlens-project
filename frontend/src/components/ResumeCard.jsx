import { useRef, useState } from 'react';
import { CalendarClock, Download, FileText, RefreshCw, Trash2, WandSparkles, AlertCircle } from 'lucide-react';
import { formatDateTime, formatFileSize } from '../utils/format.js';

export default function ResumeCard({ resume, onUpdate, onDelete, onAnalyze, busy = false }) {
  const fileInputRef = useRef(null);
  const [confirming, setConfirming] = useState(false);

  const handleUpdateFile = (event) => {
    const file = event.target.files?.[0];
    if (file) onUpdate(resume.id, file);
    event.target.value = '';
  };

  const hasWarning = resume.parser_metadata?.warnings?.length > 0;

  return (
    <article 
      onMouseLeave={() => setConfirming(false)}
      className="bg-white border border-[#111439]/5 rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:border-[#106EBE]/30 hover:shadow-lg hover:shadow-[#111439]/5"
    >
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        
        {/* Left Side: Document Information */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#106EBE]/10 to-[#0FFCBE]/10 text-[#106EBE]">
            <FileText size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm sm:text-base font-bold text-[#111439]" title={resume.original_name}>
                {resume.original_name}
              </h3>
              {resume.file_url && (
                <a
                  href={resume.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#111439]/30 hover:text-[#106EBE] transition-colors shrink-0 p-1"
                  title="Download File"
                >
                  <Download size={14} />
                </a>
              )}
            </div>
            
            {/* Simple Details Row */}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] sm:text-xs text-[#111439]/60 font-medium">
              <span className="bg-[#F8F8F9] border border-[#111439]/5 px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-[#111439]">
                {resume.file_type?.toUpperCase() || 'PDF'}
              </span>
              <span>•</span>
              <span>{formatFileSize(resume.file_size)}</span>
              <span>•</span>
              <span className="flex items-center gap-1 shrink-0">
                <CalendarClock size={10} className="sm:w-3 sm:h-3 opacity-60" />
                <span>Added: {formatDateTime(resume.uploaded_at)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Simple Actions */}
        <div className="flex w-full xl:w-auto items-center gap-2 sm:gap-3 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={handleUpdateFile}
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="flex-1 xl:flex-none h-10 px-3 sm:px-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-[#111439]/10 text-xs sm:text-sm font-bold text-[#111439] hover:bg-[#F8F8F9] transition-all disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={14} />
            <span className="hidden sm:inline">Replace</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (confirming) onDelete(resume.id);
              else setConfirming(true);
            }}
            disabled={busy}
            className={`flex-1 xl:flex-none h-10 px-3 sm:px-4 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all disabled:opacity-50 shadow-sm ${
              confirming 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-white border border-red-500/20 text-red-600 hover:bg-red-50'
            }`}
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">{confirming ? 'Sure?' : 'Delete'}</span>
          </button>

          <button
            type="button"
            onClick={() => onAnalyze(resume.id)}
            disabled={busy}
            className="flex-1 xl:flex-none h-10 px-4 sm:px-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#111439] text-xs sm:text-sm font-bold text-white shadow-lg shadow-[#111439]/20 hover:bg-[#1a1f54] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <WandSparkles size={14} className="text-[#0FFCBE]" />
            <span>Analyze</span>
          </button>
        </div>
      </div>

      {/* Simple Warning Message */}
      {hasWarning && (
        <div className="mt-4 bg-red-500/5 border border-red-500/10 rounded-xl p-3 text-xs sm:text-sm text-red-700 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p>
            <span className="font-bold mr-1">Warning:</span> 
            {resume.parser_metadata.warnings[0]}
          </p>
        </div>
      )}
    </article>
  );
}