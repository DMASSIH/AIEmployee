'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from './lib/cn';

export function CodeBlock({
  code,
  language,
  className,
}: {
  code: string;
  language?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={cn('overflow-hidden rounded-md border border-border bg-ink', className)}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="text-xs font-medium text-ink-text/60">{language ?? 'code'}</span>
        <button
          onClick={copy}
          aria-label="Copy code"
          className="flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-xs text-ink-text/60 transition-colors hover:text-ink-text"
        >
          {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-ink-text/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Minimal markdown renderer for trusted, internal content (docs blurbs, agent
 * replies in mock data). Supports headings, paragraphs, bold, inline code,
 * links and lists — deliberately no raw HTML.
 */
export function Markdown({ content, className }: { content: string; className?: string }) {
  const blocks = content.trim().split(/\n{2,}/);
  return (
    <div className={cn('flex flex-col gap-3 text-sm leading-relaxed text-text-2', className)}>
      {blocks.map((block, i) => {
        if (block.startsWith('### ')) {
          return (
            <h4 key={i} className="mt-1 text-sm font-semibold text-text">
              {renderInline(block.slice(4))}
            </h4>
          );
        }
        if (block.startsWith('## ')) {
          return (
            <h3 key={i} className="mt-2 text-[15px] font-semibold text-text">
              {renderInline(block.slice(3))}
            </h3>
          );
        }
        if (/^[-*] /m.test(block)) {
          return (
            <ul key={i} className="ml-4 list-disc space-y-1">
              {block.split('\n').map((line, j) => (
                <li key={j}>{renderInline(line.replace(/^[-*] /, ''))}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{renderInline(block)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-text">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-[12px] text-text">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
