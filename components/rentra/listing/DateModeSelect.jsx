'use client';
import { Select } from 'radix-ui';
import { CalendarDays, CalendarPlus, CalendarRange, Check, ChevronDown } from 'lucide-react';

const DATE_MODES = [
  { value: 'single', label: 'Single date', hint: 'One visit on one day', icon: CalendarDays },
  {
    value: 'consecutive',
    label: 'Consecutive dates',
    hint: 'Back-to-back days, like Fri to Sun',
    icon: CalendarRange,
  },
  {
    value: 'separate',
    label: 'Separate dates',
    hint: 'Pick any days you like',
    icon: CalendarPlus,
  },
];

/**
 * How dates are picked. A dropdown whose options explain themselves — icon,
 * name and a one-line hint — rather than three bare words in a native select.
 * Radix keeps it a real listbox: arrows, typeahead, Escape and screen readers.
 */
export default function DateModeSelect({ value, onValueChange, disabled = false }) {
  const current = DATE_MODES.find((mode) => mode.value === value) ?? DATE_MODES[0];
  const Icon = current.icon;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span id="date-mode-label" className="text-meta font-semibold">
        Date mode
      </span>
      <Select.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <Select.Trigger
          aria-labelledby="date-mode-label"
          className="group inline-flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-ink-300 bg-card px-3.5 text-left text-sm text-ink-900 transition-colors hover:border-brand-500 data-[state=open]:border-brand-600 disabled:opacity-50 sm:w-72"
        >
          <Icon className="size-4 shrink-0 text-brand-700" aria-hidden="true" />
          <Select.Value />
          <Select.Icon className="ml-auto">
            <ChevronDown
              className="size-4 text-ink-500 transition-transform group-data-[state=open]:rotate-180"
              aria-hidden="true"
            />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position="popper"
            sideOffset={6}
            collisionPadding={16}
            className="z-100 w-(--radix-select-trigger-width) min-w-72 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-lg"
          >
            <Select.Viewport>
              {DATE_MODES.map(({ value: option, label, hint, icon: OptionIcon }) => (
                <Select.Item
                  key={option}
                  value={option}
                  className="group/item flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 outline-none select-none data-highlighted:bg-ink-50"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 group-data-[state=checked]/item:bg-brand-600 group-data-[state=checked]/item:text-white">
                    <OptionIcon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <Select.ItemText>
                      <span className="font-semibold">{label}</span>
                    </Select.ItemText>
                    <span className="block text-xs text-ink-500">{hint}</span>
                  </span>
                  <Select.ItemIndicator>
                    <Check className="size-4 text-brand-700" aria-hidden="true" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
