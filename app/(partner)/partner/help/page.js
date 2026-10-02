import Link from '@/components/navigation/NavigationLink';
import ApplicationCommand from '@/components/partner/ApplicationCommand';
import { saveOwnerGuide } from '@/lib/actions/partner';
import OwnerGuide from '@/components/partner/OwnerGuide';
import { publicContent } from '@/lib/api/content';
import { requireClient } from '@/lib/api/session';
export const metadata = { title: 'Owner guide', robots: { index: false, follow: false } };
export default async function HelpPage() {
  const owner = await requireClient();
  const guide = await publicContent('owner_help');
  return (
    <>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-center gap-5">
          <Link href="/partner?tour=1" className="min-h-11 py-3 font-semibold text-brand-700">
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
              pendingLabel="Opening guide…"
              className="min-h-11 font-semibold text-brand-700"
            >
              Show setup guide
            </ApplicationCommand>
          ) : null}
        </div>
        <h1 className="text-h1">{guide.body.title}</h1>
        <p>{guide.body.intro}</p>
        <OwnerGuide body={guide.body} />
      </div>
    </>
  );
}
