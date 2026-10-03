/** Stable article anchors shared by page headers and the owner workspace header. */
export function ownerHelpHref(context = '') {
  const article = /calendar|date|pricing|booking-rules/.test(context)
    ? 'calendar-pricing'
    : /caretaker|team/.test(context)
      ? 'caretakers'
      : /earning|payout|finance/.test(context)
        ? 'getting-paid'
        : /booking|arrival|dispute/.test(context)
          ? 'booking-help'
          : /review/.test(context)
            ? 'reviews'
            : /verif|application|onboarding|settings|support|update/.test(context)
              ? 'verification-details'
              : 'adding-property';
  return `/partner/help#${article}`;
}
