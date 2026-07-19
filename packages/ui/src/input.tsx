import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { cn } from './lib/cn';
import { Kbd } from './kbd';

const base =
  'w-full rounded-md border border-border bg-surface text-sm text-text placeholder:text-text-3 ' +
  'shadow-card outline-none transition-colors duration-150 ' +
  'hover:border-border-strong focus:border-accent focus:ring-2 focus:ring-accent/20 ' +
  'disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-danger/20';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(base, 'h-9 px-3', className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea ref={ref} className={cn(base, 'min-h-24 px-3 py-2 leading-relaxed', className)} {...props} />
  );
});

export interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  shortcut?: string;
}

/** Search field with icon and optional keyboard hint (used in toolbars). */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { className, shortcut, ...props },
  ref,
) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-3" />
      <input ref={ref} type="search" className={cn(base, 'h-9 pl-9 pr-12')} {...props} />
      {shortcut && (
        <Kbd className="absolute right-2.5 top-1/2 -translate-y-1/2">{shortcut}</Kbd>
      )}
    </div>
  );
});
