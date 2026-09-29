import { cn } from 'cn';
import { Children, cloneElement, isValidElement } from 'react';

/** Shared presentation for native and component-based fields. */
export const fieldClass =
  'min-h-11 w-full min-w-0 rounded-md border border-input bg-card px-3 py-2 text-base text-foreground placeholder:text-muted-foreground transition-colors hover:border-primary focus-visible:border-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-danger md:text-sm';

export function Select({ className, ...props }) {
  return <select className={cn(fieldClass, className)} {...props} />;
}
export function Textarea({ className, ...props }) {
  return <textarea className={cn(fieldClass, 'min-h-28 resize-y', className)} {...props} />;
}

/** Connect a visible label and feedback to its direct, named control. */
export function Field({ id, label, hint, error, children }) {
  const feedbackId = error || hint ? `${id}-feedback` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-meta font-semibold text-ink-700">
        {label}
      </label>
      {Children.map(children, (child) =>
        isValidElement(child) && child.props.id === id
          ? cloneElement(child, {
              'aria-invalid': error ? true : child.props['aria-invalid'],
              'aria-describedby':
                [child.props['aria-describedby'], feedbackId].filter(Boolean).join(' ') ||
                undefined,
            })
          : child,
      )}
      {feedbackId ? (
        <p
          id={feedbackId}
          className={`mt-1.5 text-meta ${error ? 'font-medium text-danger' : 'text-muted-foreground'}`}
        >
          {error || hint}
        </p>
      ) : null}
    </div>
  );
}
