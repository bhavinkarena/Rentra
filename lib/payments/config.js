/**
 * Installed execution capabilities, separate from the admin's gateway selection.
 * Part 11 will add checkout execution. A configured gateway cannot enable an
 * unimplemented flow, and an absent/disabled gateway never selects dummy or live.
 */
export const PAYMENT_RUNTIME = Object.freeze({
  mode: null, provider: null, environment: null,
  realPaymentsEnabled: false,
  customerCheckoutEnabled: false,
  savedMethodsEnabled: false,
  gatewayConfigurationEnabled: true,
});
