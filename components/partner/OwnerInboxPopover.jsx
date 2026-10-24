'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Popover } from 'radix-ui';
import { Bell, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from '@/components/navigation/NavigationLink';
import LoaderCircle from '@/components/ui/rentra-loader';
import { loadInboxPreview, markUpdatesRead } from '@/lib/actions/partner';
import { updateTitle } from '@/lib/domain/client-updates';
import { earningsTime } from '@/lib/domain/owner-earnings';
import { relativeUpdateTime } from './InboxRow';

/** Header bell: the latest updates in a popover, loaded each time it opens. */
export default function OwnerInboxPopover({ badge }) {
  const router = useRouter();
  const [state, setState] = useState(null);
  const [loading, startLoading] = useTransition();
  const [marking, startMarking] = useTransition();
  const load = () =>
    startLoading(async () => {
      setState(await loadInboxPreview());
    });
  const markAll = () =>
    startMarking(async () => {
      const form = new FormData();
      form.set('all', '1');
      form.set('confirm', '1');
      const result = await markUpdatesRead(null, form);
      if (result?.error) return void toast.error(result.error);
      toast.success('All updates marked read.');
      load();
      router.refresh();
    });
  const items = state?.items ?? [];
  const unread = state?.unread ?? 0;

  return (
    <Popover.Root onOpenChange={(open) => open && load()}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          aria-describedby="owner-inbox-count"
          className="relative grid size-11 place-items-center rounded-md text-ink-700 hover:bg-ink-50 data-[state=open]:bg-ink-50"
        >
          <Bell className="size-5" aria-hidden="true" />
          <span
            id="owner-inbox-count"
            className="absolute top-0 right-0 rounded-full bg-brand-800 px-1 text-tiny text-white empty:hidden"
          >
            {badge}
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="portal-ui z-50 flex max-h-[min(32rem,calc(100dvh-6rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="text-meta font-semibold text-ink-900">Notifications</h2>
            <button
              type="button"
              onClick={markAll}
              disabled={marking || !unread}
              aria-label="Mark all as read"
              title="Mark all as read"
              className="grid size-9 place-items-center rounded-md text-brand-700 hover:bg-ink-50 disabled:cursor-default disabled:text-ink-300 disabled:hover:bg-transparent"
            >
              {marking ? (
                <LoaderCircle className="size-4" aria-hidden="true" />
              ) : (
                <CheckCheck className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto" aria-busy={loading}>
            {!state ? (
              <div className="grid place-items-center py-10">
                <LoaderCircle className="size-5 text-ink-500" aria-hidden="true" />
                <span className="sr-only">Loading notifications</span>
              </div>
            ) : state.error ? (
              <p role="alert" className="px-4 py-8 text-center text-meta text-danger">
                {state.error}
              </p>
            ) : items.length ? (
              <ul className="divide-y divide-border">
                {items.map((update) => (
                  <li key={update.id}>
                    <a
                      href={`/partner/updates/${update.id}/open`}
                      className={`flex gap-3 px-4 py-3 hover:bg-ink-50 ${update.read ? '' : 'bg-brand-50'}`}
                    >
                      <span
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${update.read ? '' : 'bg-brand-700'}`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span
                          className={`block text-meta font-semibold ${update.read ? 'text-ink-700' : 'text-ink-900'}`}
                        >
                          {updateTitle(update)}
                          {!update.read && <span className="sr-only"> (unread)</span>}
                        </span>
                        <span className="block truncate text-tiny text-ink-600">
                          {update.propertyTitle || update.detail?.reference || 'Your owner account'}
                        </span>
                        <span className="mt-0.5 flex gap-2 text-tiny text-ink-500">
                          <time dateTime={update.createdAt} title={earningsTime(update.createdAt)}>
                            {relativeUpdateTime(update.createdAt)}
                          </time>
                          {update.needsAction && (
                            <span className="font-semibold text-brand-700">Needs you</span>
                          )}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-10 text-center text-meta text-ink-600">
                You&apos;re all caught up.
              </p>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-tiny font-semibold">
            <Popover.Close asChild>
              <Link
                href="/partner/settings/notifications"
                className="text-ink-600 hover:text-ink-900"
              >
                Manage preferences
              </Link>
            </Popover.Close>
            <Popover.Close asChild>
              <Link href="/partner/updates" className="text-brand-700 hover:underline">
                View all
              </Link>
            </Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
