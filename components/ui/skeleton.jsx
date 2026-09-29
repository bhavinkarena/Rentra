import { cn } from 'cn';

/** Decorative blocks; the owning region supplies one loading announcement. */
export default function Skeleton({ className = '', ...props }) {
  return (
    <span
      {...props}
      aria-hidden="true"
      className={cn('rentra-skeleton block max-w-full rounded-md', className)}
    />
  );
}
