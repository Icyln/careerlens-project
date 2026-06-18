export function toText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => toText(item)).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    const preferred = value.name ?? value.skill ?? value.label ?? value.title ?? value.requirement ?? value.text ?? value.value ?? value.reason ?? value.explanation ?? value.feedback;
    if (preferred !== undefined && preferred !== null && preferred !== value) return toText(preferred, fallback);
    try {
      return JSON.stringify(value);
    } catch {
      return fallback || '[Object]';
    }
  }
  return String(value);
}

export function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  return [value];
}

export function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
