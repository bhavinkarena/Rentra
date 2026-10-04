'use client';

import AccountSwitchButton from '@/components/auth/AccountSwitchButton';
import { requestPortalLeave } from '@/components/portal/UnsavedChangesGuard';

export default function BookPropertyButton() {
  return (
    <AccountSwitchButton
      role="customer"
      beforeSwitch={requestPortalLeave}
      className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-border bg-card px-3 text-tiny font-semibold whitespace-nowrap text-ink-700 hover:bg-ink-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:opacity-60 hover:cursor-pointer"
    >
      Book a property
    </AccountSwitchButton>
  );
}
