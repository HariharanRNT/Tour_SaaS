import React, { useMemo } from 'react';

interface SafeHTMLProps {
  html: string;
  className?: string;
}

/**
 * SafeHTML component that renders a subset of HTML tags without using dangerouslySetInnerHTML.
 * This ensures maximum security by manually parsing and creating React elements.
 * Allowed tags: b, i, em, strong, p, br, ul, ol, li
 */
const SafeHTML: React.FC<SafeHTMLProps> = ({ html, className }) => {
  const nodes = useMemo(() => {
    if (typeof window === 'undefined') return null;
    
    // Create a temporary container to parse the HTML string
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || '', 'text/html');
    
    const ALLOWED_TAGS = ['B', 'I', 'EM', 'STRONG', 'P', 'BR', 'UL', 'OL', 'LI', 'SPAN', 'DIV'];

    const renderNode = (node: Node, index: number): React.ReactNode => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName;
        
        // Skip if not in allowlist
        if (!ALLOWED_TAGS.includes(tagName)) {
          // Still render children of disallowed tags to keep text content
          return Array.from(el.childNodes).map((child, i) => renderNode(child, i));
        }
        
        const children = Array.from(el.childNodes).map((child, i) => renderNode(child, i));
        const key = `${tagName}-${index}`;
        const className = el.className;
        
        switch (tagName) {
          case 'B': 
          case 'STRONG': 
            return <strong key={key} className={className}>{children}</strong>;
          case 'I': 
          case 'EM': 
            return <em key={key} className={className}>{children}</em>;
          case 'P': 
            return <p key={key} className={className || "mb-2"}>{children}</p>;
          case 'BR': 
            return <br key={key} />;
          case 'UL': 
            return <ul key={key} className={className || "list-disc pl-5 mb-2"}>{children}</ul>;
          case 'OL': 
            return <ol key={key} className={className || "list-decimal pl-5 mb-2"}>{children}</ol>;
          case 'LI': 
            return <li key={key} className={className || "mb-1"}>{children}</li>;
          case 'SPAN':
            return <span key={key} className={className}>{children}</span>;
          case 'DIV':
            return <div key={key} className={className}>{children}</div>;
          default: 
            return <span key={key} className={className}>{children}</span>;
        }
      }
      return null;
    };
    
    return Array.from(doc.body.childNodes).map((node, i) => renderNode(node, i));
  }, [html]);

  return <div className={className}>{nodes}</div>;
};

export default SafeHTML;
