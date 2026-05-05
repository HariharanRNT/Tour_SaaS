import DOMPurify from 'dompurify';

export const sanitizeHtml = (dirty: string, options?: any): string => {
  if (typeof window === 'undefined') {
    return dirty;
  }
  const config = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    ALLOWED_ATTR: ['href', 'class', 'target', 'rel', 'style', 'id'],
    ...options,
  };
  return (DOMPurify as any).sanitize(dirty, config);
};

export const sanitizeText = (dirty: string): string => {
  if (typeof window === 'undefined') {
    return dirty;
  }
  return (DOMPurify as any).sanitize(dirty, { ALLOWED_TAGS: [] }); // Strip all tags
};
