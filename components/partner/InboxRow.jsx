import { Bell, CalendarDays, House, LifeBuoy, Star, Users } from 'lucide-react';
import { updateTitle } from '@/lib/domain/client-updates';
import { earningsTime } from '@/lib/domain/owner-earnings';
const icons = {
  account: Bell,
  property: House,
  booking: CalendarDays,
  case: LifeBuoy,
  review: Star,
  team: Users,
};
export function relativeUpdateTime(value, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - +new Date(value)) / 60000));
  return minutes < 1
    ? 'Just now'
    : minutes < 60
      ? `${minutes} min ago`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)} h ago`
        : `${Math.floor(minutes / 1440)} d ago`;
}
export default function InboxRow({ update }) {
  const Icon = icons[update.category] || Bell;
  return (
    <li className={`border-b border-border last:border-0 ${update.read ? '' : 'bg-brand-50'}`}>
      <a href={`/partner/updates/${update.id}/open`} className="flex min-h-11 gap-3 p-4">
        <Icon className="mt-1 size-5 shrink-0 text-brand-800" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {updateTitle(update)}
            {!update.read && (
              <span className="ml-2 inline-block size-2 rounded-full bg-brand-800">
                <span className="sr-only">Unread</span>
              </span>
            )}
          </p>
          <p className="mt-1 truncate text-meta text-ink-600">
            {update.propertyTitle || update.detail?.reference || 'Your owner account'}
          </p>
          <p className="mt-1 text-tiny text-ink-600">
            <time dateTime={update.createdAt} title={earningsTime(update.createdAt)}>
              {relativeUpdateTime(update.createdAt)}
            </time>
            {update.needsAction && (
              <span className="ml-2 rounded-full bg-warning-bg px-2 text-warning">Needs you</span>
            )}
            {update.detail?.simulation && <span className="ml-2">Test booking</span>}
          </p>
        </div>
      </a>
    </li>
  );
}
