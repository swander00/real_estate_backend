export function extractSingleFromArrayString(value) {
  if (value == null) return null;
  let arr;
  if (Array.isArray(value)) {
    arr = value;
  } else if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) arr = parsed;
      else if (typeof parsed === 'string') arr = [parsed];
    } catch {
      arr = value
        .replace(/^[\[\]"]+|[\[\]"]+$/g, '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    }
  }
  return Array.isArray(arr) && arr.length ? arr.join(', ') : null;
}

export function joinArray(arr) {
  if (arr == null) return null;
  return Array.isArray(arr) ? arr.join(', ') : String(arr);
}

export function capitalizeWords(input) {
  if (typeof input !== 'string') return input;
  return input
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function normalizeCityName(value) {
  if (typeof value !== 'string') return value;
  const t = value.trim();
  return /^Toronto\s+C\d{2}$/i.test(t) ? 'Toronto' : t;
}
