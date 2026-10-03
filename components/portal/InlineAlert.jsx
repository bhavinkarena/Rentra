import { AlertCircle, CheckCircle } from 'lucide-react';
export default function InlineAlert({ children, tone = 'error', action, className = '' }) {
  const Icon = tone === 'success' ? CheckCircle : AlertCircle;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex gap-3 rounded-md border p-3 text-meta ${tone === 'error' ? 'border-danger/30 bg-danger-bg text-ink-900' : 'border-brand-200 bg-brand-50 text-ink-900'} ${className}`}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {children}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
