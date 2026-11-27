import { useEffect, useMemo, useRef } from 'react';
import renderMathInElement from 'katex/contrib/auto-render';
import { sanitizeRichHtml } from '../utils/formatters';

interface MathHtmlProps {
  html?: string | null;
  className?: string;
  fallbackText?: string;
}

export function MathHtml({ html, className = '', fallbackText = '' }: MathHtmlProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const cleanHtml = useMemo(() => {
    if (!html) return '';
    return sanitizeRichHtml(html);
  }, [html]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !cleanHtml) return;
    try {
      renderMathInElement(el, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true },
        ],
        throwOnError: false,
      });
    } catch {
      // Ignore malformed LaTeX expressions gracefully
    }
  }, [cleanHtml]);

  if (!cleanHtml) {
    return fallbackText ? <div className={`tb-html ${className}`}>{fallbackText}</div> : null;
  }

  return (
    <div
      ref={containerRef}
      className={`tb-html ${className}`}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}
