'use client';
import { useEffect } from 'react';
import Link from '@/components/navigation/NavigationLink';
import { recordOwnerGuide } from '@/lib/actions/partner';
export default function OwnerApprovalNotice() {
  useEffect(() => {
    recordOwnerGuide({ approvalSeenAt: true });
  }, []);
  return (
    <div role="status" className="mt-5 rounded-lg border border-brand-200 bg-brand-50 p-5">
      <h2 className="text-h3">You’re verified</h2>
      <p className="mt-2 text-meta">
        Your account is approved. Your property can now be submitted for review.
      </p>
      <Link
        href="/partner/listings/new"
        className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand-700"
      >
        Add your first property
      </Link>
    </div>
  );
}
