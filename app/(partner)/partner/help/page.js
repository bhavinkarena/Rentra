import Link from '@/components/navigation/NavigationLink';
import ApplicationCommand from '@/components/partner/ApplicationCommand';
import { saveOwnerGuide } from '@/lib/actions/partner';
import HelpHub from '@/components/partner/help/HelpHub';
import { publicContent } from '@/lib/api/content';
import { requireClient } from '@/lib/api/session';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
export const metadata = { title: 'Help & support', robots: { index: false, follow: false } };
export default async function HelpPage() {
  const owner = await requireClient();
  const { data: guide, failure } = await settle(publicContent('owner_help'));
  if (failure)
    return (
      <PortalState kind={failure} backHref="/partner/support/new" backLabel="Contact support" />
    );
  return (
    <>
      <HelpHub body={guide.body} />
      <section className="mt-9 border-t border-border pt-6" aria-labelledby="workspace-help-title">
        <h2 id="workspace-help-title" className="text-h4 font-semibold text-ink-900">
          Get familiar with your workspace
        </h2>
        <div className="mt-2 flex flex-wrap gap-x-6">
          <Link
            href="/partner?tour=1"
            className="inline-flex min-h-11 items-center text-meta font-medium text-brand-800 hover:underline"
          >
            Show me around again
          </Link>
          {owner.accountStatus === 'active' ? (
            <ApplicationCommand
              action={async () => {
                'use server';
                const form = new FormData();
                form.set('checklistDismissedAt', 'false');
                form.set('next', '/partner');
                return saveOwnerGuide({}, form);
              }}
              pendingLabel="Opening guide..."
              className="min-h-11 text-meta font-medium text-brand-800 hover:underline"
            >
              Show setup guide
            </ApplicationCommand>
          ) : null}
        </div>
      </section>
    </>
  );
}
