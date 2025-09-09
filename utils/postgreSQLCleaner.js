/**
 * postgreSQLCleaner.js
 *
 * Cleans PostgreSQL array-like strings: {"a","b"} or ["a","b"].
 */
export function cleanPostgreSQLArrayString(value) {
  if (!value) return null;
  let str = String(value).trim();

  // If already plain string
  if (!str.startsWith('[') && !str.startsWith('{')) {
    if (['None', 'Unknown', 'null', 'Other'].includes(str)) return null;
    return str;
  }

  // PostgreSQL {} format
  if (str.startsWith('{') && str.endsWith('}')) {
    str = str.slice(1, -1);
    const parts = str.match(/("(?:[^"\\]|\\.)*")|([^,]+)/g) || [];
    const cleaned = parts
      .map(p => p.trim().replace(/^"|"$/g, ""))
      .filter(p => p && !['None', 'Unknown', 'null', 'Other'].includes(p));
    return cleaned.length > 0 ? cleaned.join(', ') : null;
  }

  // JSON [] format
  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(v => v && !['None', 'Unknown', 'null', 'Other'].includes(v));
        return filtered.length > 0 ? filtered.join(', ') : null;
      }
    } catch {
      str = str.slice(1, -1);
      const matches = str.match(/"[^"]*"|'[^']*'|[^,]+/g) || [];
      const cleaned = matches
        .map(m => m.trim().replace(/^["']|["']$/g, ""))
        .filter(v => v && !['None', 'Unknown', 'null', 'Other'].includes(v));
      return cleaned.length > 0 ? cleaned.join(', ') : null;
    }
  }

  return str.replace(/^["']|["']$/g, '').trim() || null;
}
