import DOMPurify from 'dompurify';

// Safe wrapper to handle SSR gracefully
const getPurifier = () => {
  if (typeof window === 'undefined') return null;
  return DOMPurify;
};

// Use this for plain text fields (description, title, notes)
// Strips ALL HTML — output is always safe plain text
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return '';
  const purifier = getPurifier();
  if (!purifier) {
    // Basic SSR fallback: strip all tags
    return input.replace(/<[^>]*>?/gm, '').trim();
  }
  const sanitized = purifier.sanitize(input.trim(), { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [] 
  });
  
  // Decode common HTML entities that DOMPurify introduces for safety
  // since this function is intended for PLAIN TEXT fields.
  // React will safely escape these when rendering.
  return sanitized
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// Use this ONLY if HTML formatting must be preserved (rich text)
// Keeps safe tags only
export function sanitizeHTML(input: string): string {
  if (!input || typeof input !== 'string') return '';
  const purifier = getPurifier();
  if (!purifier) {
    // Basic SSR fallback: return as-is (will be sanitized on client hydration)
    // or strip script tags minimally
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
  }
  return purifier.sanitize(input.trim(), {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'li'],
    ALLOWED_ATTR: []
  });
}

// Use this for any dynamic URL (href, src, router.push)
// Blocks javascript:, data:, vbscript: URIs
export function sanitizeURL(input: string): string {
  if (!input || typeof input !== 'string') return '#';
  const url = input.trim().toLowerCase();
  if (
    url.startsWith('javascript:') ||
    url.startsWith('data:') ||
    url.startsWith('vbscript:')
  ) return '#';
  return input.trim();
}

// ---------------------------------------------------------------------------
// PDF Customizer helpers
// ---------------------------------------------------------------------------

/**
 * Validate a hex color string (#RRGGBB). Returns fallback if invalid.
 * Prevents CSS injection through crafted color values.
 */
export function sanitizeColor(value: string, fallback = '#000000'): string {
  return /^#[0-9A-Fa-f]{6}$/.test((value || '').trim()) ? value.trim() : fallback;
}

/**
 * Strict URL validator — only http:// and https:// are permitted.
 * Use for logo_url and any other URL typed by the agent (not file-upload).
 * Returns '' for anything that fails.
 */
export function sanitizeLogoUrl(value: string): string {
  if (!value) return '';
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) ? value.trim() : '';
  } catch {
    return '';
  }
}

/**
 * Recursively sanitize every string inside a nested PDF-customizer settings object.
 * Color and URL keys receive their respective strict validators.
 * All other strings go through sanitizeText (DOMPurify / SSR fallback).
 * Call this as a final pass before submitting the settings blob to the API.
 */
export function deepSanitizeSettings(obj: unknown): unknown {
  if (typeof obj === 'string') return sanitizeText(obj);
  if (Array.isArray(obj)) return obj.map(deepSanitizeSettings);
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      if (key === 'primary_color' || key === 'accent_color') {
        result[key] = sanitizeColor(val as string);
      } else if (key === 'logo_url') {
        result[key] = sanitizeLogoUrl(val as string);
      } else {
        result[key] = deepSanitizeSettings(val);
      }
    }
    return result;
  }
  return obj;
}
