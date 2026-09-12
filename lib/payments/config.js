/** Runtime is intentionally fixed until Parts 20–22 implement and verify real payments.
 * Environment variables and browser input cannot turn a schema rollout into live charging.
 */
export const PAYMENT_RUNTIME = Object.freeze({
  mode: 'simulated', provider: 'dummy', environment: 'simulated',
  realPaymentsEnabled: false, savedMethodsEnabled: false,
});
