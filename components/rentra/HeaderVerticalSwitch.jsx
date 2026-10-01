'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { DropdownMenu } from 'radix-ui';
import { Check, ChevronDown } from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
import { VerticalIcon } from './icons/vertical-icons';

/** The compact search keeps its category visible after the header tabs dock away. */
export default function HeaderVerticalSwitch({ items }) {
  const [pointerMotion, setPointerMotion] = useState(false);
  const trigger = useRef(null);
  const active = items.find((item) => item.active);
  const switchScroll = useRef(null);
  useLayoutEffect(() => {
    if (switchScroll.current === null) return;
    // Result grids can change size between categories; keep the header in place.
    window.scrollTo({ top: switchScroll.current, behavior: 'instant' });
    switchScroll.current = null;
  }, [active?.code]);
  if (!active || items.length < 2) return null;

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          ref={trigger}
          type="button"
          aria-label={`Category: ${active.name}. Change category`}
          title={`${active.name} - Change category`}
          onPointerDown={() => setPointerMotion(true)}
          onKeyDown={() => setPointerMotion(false)}
          className="group ml-1 flex h-9 w-10 shrink-0 md:w-13 cursor-pointer items-center justify-center gap-0.5 rounded-full bg-brand-50 text-brand-700 transition-[background-color,transform] duration-150 ease-out-strong hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 motion-safe:active:scale-95 motion-reduce:transition-none"
        >
          <span className="relative block size-6 md:size-7" aria-hidden="true">
            {items.map((item) => (
              <span
                key={item.code}
                className={`absolute inset-0 transition-[opacity,transform] duration-200 ease-out-strong motion-reduce:transition-none ${
                  item.active
                    ? 'translate-y-0 scale-100 opacity-100'
                    : 'translate-y-1 scale-90 opacity-0'
                }`}
              >
                <VerticalIcon code={item.code} className="size-6 md:size-7" />
              </span>
            ))}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-2.5 transition-transform md:size-3 duration-200 ease-out-strong group-data-[state=open]:rotate-180 motion-reduce:transition-none"
          />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={10}
          collisionPadding={12}
          aria-label="Choose category"
          aria-labelledby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            // Focusing the sticky trigger must not scroll back to its flow position.
            if (
              document.activeElement === document.body ||
              document.activeElement?.closest('.header-vertical-menu')
            ) {
              trigger.current?.focus({ preventScroll: true });
            }
          }}
          data-motion={pointerMotion}
          className="header-vertical-menu z-[70] min-w-60 origin-(--radix-dropdown-menu-content-transform-origin) rounded-lg border border-border bg-card p-1.5 shadow-lg"
        >
          <DropdownMenu.Label className="px-3 pt-2 pb-1.5 text-tiny font-semibold text-ink-500">
            Explore
          </DropdownMenu.Label>
          {items.map((item) => (
            <DropdownMenu.Item key={item.code} asChild>
              <Link
                href={item.href}
                scroll={false}
                onNavigate={() => {
                  if (!item.active) switchScroll.current = window.scrollY;
                }}
                aria-current={item.active ? 'page' : undefined}
                className="flex min-h-12 items-center gap-3 rounded-md px-3 text-meta font-semibold text-ink-700 outline-none transition-colors duration-150 data-[highlighted]:bg-brand-50 data-[highlighted]:text-brand-800 aria-[current=page]:bg-brand-50 aria-[current=page]:text-brand-800 motion-reduce:transition-none"
              >
                <VerticalIcon code={item.code} className="size-7 shrink-0" />
                <span className="flex-1">{item.name}</span>
                {item.active ? (
                  <Check className="size-4 text-brand-600" aria-hidden="true" />
                ) : null}
              </Link>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
