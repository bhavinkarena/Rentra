export function verificationOutcome(completion) {
  const reason = completion.decisionReason;
  if (completion.status === 'blocked')
    return {
      title: 'This application is blocked',
      body: reason || 'Three applications were not approved. Contact support for help.',
      href: '/partner/help/requests',
      action: 'Contact support',
    };
  if (completion.submitted)
    return {
      title: 'With Rentra for review',
      body: 'A person checks your details within 2 working days. Check back here for the decision.',
    };
  if (completion.changesRequested)
    return {
      title: `Please fix ${completion.remaining.length} ${completion.remaining.length === 1 ? 'thing' : 'things'}`,
      body: reason || 'Check the flagged steps, then submit again.',
      href: completion.remaining[0]?.href || '/partner/onboarding/review',
      action: 'Fix verification',
    };
  if (completion.status === 'rejected')
    return {
      title: 'We couldn’t approve this application',
      body: `${reason || 'Please check your details before applying again.'} You can apply ${completion.strikesLeft} more ${completion.strikesLeft === 1 ? 'time' : 'times'}.`,
      href: '/partner/onboarding/review',
      action: 'Edit and reapply',
    };
  return null;
}
