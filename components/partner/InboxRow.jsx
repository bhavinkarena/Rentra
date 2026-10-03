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
    <tr className={update.read ? '' : 'bg-brand-50'}>
      <td>
        <p className="flex items-start gap-2 font-semibold">
          <Icon className="mt-0.5 size-4 shrink-0 text-brand-800" aria-hidden="true" />
          {updateTitle(update)}
        </p>
        <span className="block text-tiny text-ink-600">
          {update.propertyTitle || update.detail?.reference || 'Your owner account'}
        </span>
      </td>
      <td className="capitalize">{update.category}</td>
      <td>
        <span className="whitespace-nowrap">
          {update.needsAction ? 'Needs you' : update.read ? 'Read' : 'Unread'}
        </span>
        {update.detail?.simulation && <span className="block text-tiny">Test booking</span>}
      </td>
      <td className="whitespace-nowrap">
        <time dateTime={update.createdAt} title={earningsTime(update.createdAt)}>
          {relativeUpdateTime(update.createdAt)}
        </time>
      </td>
      <td>
        <a
          href={`/partner/updates/${update.id}/open`}
          className="inline-flex min-h-11 items-center rounded-lg border px-3 font-semibold text-brand-800"
        >
          View<span className="sr-only"> {updateTitle(update)}</span>
        </a>
      </td>
    </tr>
  );
}
