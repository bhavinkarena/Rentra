// Server-only rollout decision; both provider and pages must use the same flag.
export const partnerCacheEnabled = () => process.env.PARTNER_RTK_ENABLED === 'true';
