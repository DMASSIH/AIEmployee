'use client';

import { Fragment, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './lib/cn';
import { Button } from './button';

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({
  items,
  renderLink,
  className,
}: {
  items: Crumb[];
  /** Injected so the design system stays framework-agnostic (pass next/link). */
  renderLink: (href: string, children: ReactNode) => ReactNode;
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-1.5 text-[13px]">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              {i > 0 && <ChevronRight className="size-3.5 text-text-3" aria-hidden />}
              <li>
                {item.href && !last ? (
                  <span className="text-text-2 transition-colors hover:text-text">
                    {renderLink(item.href, item.label)}
                  </span>
                ) : (
                  <span aria-current={last ? 'page' : undefined} className="font-medium text-text">
                    {item.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  className,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-between gap-3', className)}>
      <p className="text-[13px] text-text-3">
        Page <span className="font-medium text-text-2">{page}</span> of {pageCount}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" /> Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next <ChevronRight className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
