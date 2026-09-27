'use client';
import Link, { useLinkStatus } from 'next/link';
import NavigationProgress from './NavigationProgress';
function Pending() {
  const { pending } = useLinkStatus();
  return <NavigationProgress active={pending} />;
}
// Next owns pending/cancelled/completed state, including modifier-clicks and
// onNavigate cancellation. No global click interception or guessed timers.
export default function NavigationLink({ children, ...props }) {
  return (
    <Link {...props}>
      {children}
      <Pending />
    </Link>
  );
}
