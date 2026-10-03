/**
 * Presentation helpers for the onboarding stepper.
 *
 * The completion state itself is DERIVED, never stored, and it is derived on
 * the API — `/auth/me` returns it alongside the actor. What stays here is only
 * the copy that turns that state into something a screen can render, which is
 * pure and belongs next to the components that use it.
 */

/** Which sides each ID type needs. PAN is single-sided. */
export const REQUIRED_SIDES = {
  pan_card: ['front'],
  aadhaar_masked: ['front', 'back'],
  passport: ['front', 'back'],
  driving_licence: ['front', 'back'],
  voter_id: ['front', 'back'],
};

/** Copy for the gated CTA sheet — names the exact remaining steps. */
export function lockedCtaMessage(completion) {
  if (completion.approved) return null;
  if (completion.submitted) {
    return {
      title: 'Your application is with us',
      body: 'We reply within 2 working days. The decision appears on your dashboard.',
      items: [],
    };
  }
  const n = completion.remaining.length;
  if (!n)
    return {
      title: 'Your details are ready for review',
      body: 'Review and submit your verification. You can already start a property draft.',
      items: [{ label: 'Review and submit', href: '/partner/onboarding/review' }],
    };
  return {
    title:
      n === 1 ? 'One thing left in your verification' : `${n} things left in your verification`,
    body: 'Then we review within 2 working days.',
    items: completion.remaining.map((s) => ({
      label: s.label,
      href: s.href,
      minutes: s.minutes,
    })),
  };
}
