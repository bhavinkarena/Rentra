import { Check } from 'lucide-react';

/**
 * A consent tick-box the size of a card: the whole card is the label, so a
 * thumb can hit it anywhere. The input stays a real checkbox, which keeps
 * `required`, keyboard and screen-reader behaviour native.
 */
export default function CheckboxCard({
  checked,
  onCheckedChange,
  invalid = false,
  inputRef,
  className = '',
  children,
  ...inputProps
}) {
  const tone = checked
    ? 'border-brand-600 bg-brand-50'
    : invalid
      ? 'border-danger bg-danger-bg'
      : 'border-border bg-card hover:border-brand-300';
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${tone} ${className}`}
    >
      <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
        <input
          {...inputProps}
          ref={inputRef}
          type="checkbox"
          checked={checked}
          aria-invalid={invalid || undefined}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className="peer size-5 cursor-pointer appearance-none rounded-[5px] border-2 border-ink-500 bg-white transition-colors checked:border-brand-600 checked:bg-brand-600"
        />
        <Check
          aria-hidden="true"
          strokeWidth={3.5}
          className="pointer-events-none absolute size-3.5 text-white opacity-0 peer-checked:opacity-100"
        />
      </span>
      <span className="min-w-0 text-sm leading-snug text-ink-800">{children}</span>
    </label>
  );
}
