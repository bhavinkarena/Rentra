import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visibleTasks } from '../../lib/domain/client-updates.js';
import { lockedCtaMessage } from '../../lib/domain/profile-completion.js';
test('Today hides duplicate unread tasks, keeps specific record actions, and never says zero steps left', () => {
  const tasks = visibleTasks([
    { key: 'updates_action', kind: 'action', count: 1 },
    { key: 'updates_unread', kind: 'info', count: 2 },
    {
      key: 'dates_running_out:p',
      kind: 'action',
      count: 1,
      label: 'Open more dates',
      href: '/partner/listings/p/calendar',
    },
  ]);
  assert.equal(
    tasks.some((t) => t.key === 'updates_unread'),
    false,
  );
  assert.equal(tasks[1].label, 'Open more dates');
  const message = lockedCtaMessage({ approved: false, submitted: false, remaining: [] });
  assert.equal(message.items[0].href, '/partner/onboarding/review');
  assert.equal(message.title.includes('0 things'), false);
});
