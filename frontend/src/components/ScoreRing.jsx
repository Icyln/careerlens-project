import { scoreTone } from '../utils/format.js';
import { toNumber, toText } from '../utils/safeRender.js';

export default function ScoreRing({ score = 0, level, caption = 'Overall Match Score' }) {
  const safeScore = Math.max(0, Math.min(100, toNumber(score, 0)));
  const degrees = safeScore * 3.6;
  const safeLevel = toText(level, scoreTone(safeScore));
  const safeCaption = toText(caption, 'Overall Match Score');

  return (
    <div className="flex flex-col items-center relative z-10">
      <div
        className="relative flex h-40 w-40 items-center justify-center rounded-full shadow-lg shadow-[#106EBE]/10"
        style={{ background: `conic-gradient(#106EBE ${degrees}deg, #F8F8F9 0deg)` }}
      >
        <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-white shadow-inner flex-col">
          <p className="text-4xl font-extrabold tracking-tight text-[#111439]">{safeScore}%</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#106EBE]">{safeLevel}</p>
        </div>
      </div>
      <p className="mt-5 text-center text-sm font-bold text-[#111439]/60">{safeCaption}</p>
    </div>
  );
}