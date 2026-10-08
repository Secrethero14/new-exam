import React, { useEffect, useRef } from 'react';
import katex from 'katex';

interface KaTeXRendererProps {
  content: string;
  className?: string;
  displayMode?: boolean;
}

/**
 * KaTeX text renderer that handles mixed Bengali/English text and math delimiters
 * like $...$, $$...$$, \(...\), and \[...\]
 */
export const KaTeXRenderer: React.FC<KaTeXRendererProps> = ({ content, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !content) return;

    // Fast tokenizer for LaTeX delimiters in text
    const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[\s\S]*?\$|\\\(.*?\\\))/g;
    const parts = content.split(regex);

    const renderedHtml = parts.map((part) => {
      if (!part) return '';

      // Display math $$ ... $$
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const math = part.slice(2, -2);
        try {
          return katex.renderToString(math, { displayMode: true, throwOnError: false });
        } catch {
          return part;
        }
      }

      // Display math \[ ... \]
      if (part.startsWith('\\[') && part.endsWith('\\]')) {
        const math = part.slice(2, -2);
        try {
          return katex.renderToString(math, { displayMode: true, throwOnError: false });
        } catch {
          return part;
        }
      }

      // Inline math $ ... $
      if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1);
        try {
          return katex.renderToString(math, { displayMode: false, throwOnError: false });
        } catch {
          return part;
        }
      }

      // Inline math \( ... \)
      if (part.startsWith('\\(') && part.endsWith('\\)')) {
        const math = part.slice(2, -2);
        try {
          return katex.renderToString(math, { displayMode: false, throwOnError: false });
        } catch {
          return part;
        }
      }

      // Regular text (escaped HTML)
      return part
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>');
    }).join('');

    containerRef.current.innerHTML = renderedHtml;
  }, [content]);

  return <div ref={containerRef} className={`inline-block w-full ${className}`} />;
};
