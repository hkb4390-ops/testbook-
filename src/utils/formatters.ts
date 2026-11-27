export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatDurationCompact(seconds: number): string {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  if (safe < 60) return `${safe}s`;
  const mins = Math.floor(safe / 60);
  const remSec = safe % 60;
  if (mins < 60) return remSec > 0 ? `${mins}m ${remSec}s` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMin = mins % 60;
  return remMin > 0 ? `${hrs}h ${remMin}m` : `${hrs}h`;
}

export function formatNumber(val: unknown, decimals?: number): string {
  const n = Number(val);
  if (!Number.isFinite(n)) return decimals !== undefined ? (0).toFixed(decimals) : '0';
  if (decimals !== undefined) return n.toFixed(decimals);
  return String(Math.round(n * 100) / 100);
}

export function formatCompactCount(val?: number): string {
  const n = Number(val) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return (
    d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  );
}

export function stripHtml(html?: string | null): string {
  if (!html) return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips scripts, iframes, event handlers, and javascript: URIs before rendering
 * API-supplied rich question/solution HTML.
 */
export function sanitizeRichHtml(html?: string | null): string {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') {
    return stripHtml(html);
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const dangerous = doc.querySelectorAll('script, iframe, object, embed, link[rel="import"]');
  dangerous.forEach((el) => el.remove());

  const all = doc.body.querySelectorAll('*');
  all.forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const val = attr.value.trim().toLowerCase();
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
      } else if (
        (name === 'href' || name === 'src' || name === 'xlink:href') &&
        (val.startsWith('javascript:') || val.startsWith('vbscript:') || val.startsWith('data:text/html'))
      ) {
        el.removeAttribute(attr.name);
      }
    }
    if (el.tagName.toLowerCase() === 'img') {
      el.setAttribute('referrerpolicy', 'no-referrer');
      el.setAttribute('loading', 'lazy');
    }
  });

  return doc.body.innerHTML;
}

export function isSafeExternalUrl(url?: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
