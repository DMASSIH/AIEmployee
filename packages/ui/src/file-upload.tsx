'use client';

import { useRef, useState, type DragEvent } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from './lib/cn';

export interface FileUploadProps {
  accept?: string;
  hint?: string;
  onFiles?: (files: File[]) => void;
  className?: string;
}

/** Drag-and-drop upload zone (UI layer — the caller decides what to do with files). */
export function FileUpload({ accept, hint, onFiles, className }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    onFiles?.(Array.from(e.dataTransfer.files));
  };

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed',
        'px-6 py-10 text-center outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-accent/30',
        dragging
          ? 'border-accent bg-accent-soft/50'
          : 'border-border bg-surface-2/40 hover:border-border-strong hover:bg-surface-2',
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-md bg-surface text-text-2 shadow-card">
        <UploadCloud className="size-5" aria-hidden />
      </div>
      <p className="text-sm font-medium text-text">
        Drop files here or <span className="text-accent">browse</span>
      </p>
      {hint && <p className="text-[13px] text-text-3">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="sr-only"
        onChange={(e) => onFiles?.(Array.from(e.target.files ?? []))}
      />
    </button>
  );
}
