import { useId, type LabelHTMLAttributes, type ReactNode } from 'react';
import { cn } from './lib/cn';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('text-[13px] font-medium leading-none text-text', className)}
      {...props}
    />
  );
}

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (props: { id: string; 'aria-invalid': boolean | undefined }) => ReactNode;
}

/** Label + control + hint/error wrapper. Wires ids and aria-invalid for you. */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </Label>
      {children({ id, 'aria-invalid': error ? true : undefined })}
      {error ? (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-text-3">{hint}</p>
      ) : null}
    </div>
  );
}
