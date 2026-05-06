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
  return purifier.sanitize(input.trim(), { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [] 
  });
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
