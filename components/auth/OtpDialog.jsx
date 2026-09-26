'use client';

import { useId, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { ShieldCheck, X } from 'lucide-react';

export function OtpInput({ name = 'code', error = false, disabled = false }) {
  const [digits, setDigits] = useState(Array(6).fill(''));
  const inputs = useRef([]);
  const id = useId();
  function fill(value, index) {
    const numbers = value.replace(/\D/g, '').slice(0, 6);
    if (!numbers) {
      setDigits((previous) => previous.map((digit, i) => (i === index ? '' : digit)));
      return;
    }
    const start = numbers.length === 6 ? 0 : index;
    setDigits((previous) => {
      const next = [...previous];
      [...numbers].forEach((digit, offset) => {
        if (start + offset < 6) next[start + offset] = digit;
      });
      return next;
    });
    inputs.current[Math.min(start + numbers.length, 5)]?.focus();
  }
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-3 text-sm font-semibold">6-digit verification code</legend>
      <input type="hidden" name={name} value={digits.join('')} />
      <div className="flex gap-2 sm:gap-3">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => {
              inputs.current[index] = node;
            }}
            id={`${id}-${index}`}
            aria-label={`Digit ${index + 1} of 6`}
            aria-invalid={error || undefined}
            value={digit}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            pattern="[0-9]"
            required
            onChange={(event) => fill(event.target.value, index)}
            onFocus={(event) => event.target.select()}
            onPaste={(event) => {
              event.preventDefault();
              fill(event.clipboardData.getData('text'), index);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Backspace' && !digit && index > 0) {
                event.preventDefault();
                inputs.current[index - 1]?.focus();
                setDigits((previous) => previous.map((value, i) => (i === index - 1 ? '' : value)));
              }
              if (event.key === 'ArrowLeft') inputs.current[Math.max(0, index - 1)]?.focus();
              if (event.key === 'ArrowRight') inputs.current[Math.min(5, index + 1)]?.focus();
            }}
            className="h-14 w-full min-w-0 rounded-md border border-border bg-background text-center text-xl font-semibold outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 disabled:opacity-50 aria-invalid:border-danger"
          />
        ))}
      </div>
    </fieldset>
  );
}

export default function OtpDialog({ open, onOpenChange, description, children, busy = false }) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink-900/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-[100] max-h-[90svh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-background p-6 shadow-xl sm:p-8">
          <div className="mb-5 grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <ShieldCheck className="size-6" />
          </div>
          <Dialog.Title className="text-2xl font-semibold">Check your code</Dialog.Title>
          <Dialog.Description className="mt-2 mb-6 text-sm leading-relaxed text-ink-600">
            {description}
          </Dialog.Description>
          {children}
          <Dialog.Close
            disabled={busy}
            aria-label="Close verification dialog"
            className="absolute top-3 right-3 grid size-11 place-items-center rounded-full hover:bg-ink-50"
          >
            <X className="size-5" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
