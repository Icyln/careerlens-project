import { toNumber, toText } from '../utils/safeRender.js';

export default function ProgressBar({ value = 0, label, caption }) {
  const safeValue = Math.max(0, Math.min(100, toNumber(value, 0)));
  const safeLabel = toText(label, 'Untitled');
  const safeCaption = toText(caption, '');

  return (
    <div className="w-full">
      <div className="mb-2.5 flex items-end justify-between gap-3">
        <span className="text-sm font-bold text-[#111439]">{safeLabel}</span>
        <span className="text-base font-extrabold text-[#111439]">{safeValue}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F8F8F9] border border-[#111439]/5 shadow-inner">
        <div 
          className="h-full rounded-full bg-gradient-to-r from-[#106EBE] to-[#0FFCBE] transition-all duration-1000 ease-out" 
          style={{ width: `${safeValue}%` }} 
        />
      </div>
      {safeCaption && <p className="mt-2 text-xs text-[#111439]/60 font-medium leading-relaxed">{safeCaption}</p>}
    </div>
  );
}