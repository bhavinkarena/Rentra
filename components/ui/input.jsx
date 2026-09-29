import { cn } from 'cn';
import { fieldClass } from './field';

export function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        fieldClass,
        'file:mr-3 file:inline-flex file:min-h-9 file:rounded-sm file:border-0 file:bg-secondary file:px-3 file:text-sm file:font-medium file:text-foreground',
        className,
      )}
      {...props}
    />
  );
}
