import { toArray, toText } from '../utils/safeRender.js';

export default function SkillChips({
  title,
  items = [],
  emptyText = 'No items found',
  tone = 'blue',
}) {
  const safeItems = toArray(items)
    .map((item) => toText(item, ''))
    .filter(Boolean);

  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : tone === 'rose'
          ? 'bg-rose-50 text-rose-700 border-rose-200'
          : 'bg-[#106EBE]/10 text-[#106EBE] border-[#106EBE]/20';

  return (
    <div className="rounded-2xl bg-white p-5 border border-[#111439]/5 shadow-sm">
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#111439]/50">
        {title}
      </h4>

      <div className="mt-3 flex flex-wrap gap-2">
        {safeItems.length ? (
          safeItems.map((item, index) => (
            <span
              key={`${title}-${index}-${item}`}
              className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold ${toneClass}`}
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-xs text-[#111439]/40">{emptyText}</span>
        )}
      </div>
    </div>
  );
}