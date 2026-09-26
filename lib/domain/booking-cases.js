/** CP14 booking case labels shared by server pages and client forms. */
export const CASE_TYPES = [
  ['owner_cancellation', 'Owner cannot host (cancellation)'],
  ['customer_cancellation', 'Customer cancellation request'],
  ['change_request', 'Date or guest change'],
  ['no_show', 'No-show'],
  ['late_arrival', 'Late arrival'],
  ['operational', 'Operational issue'],
];

export const OWNER_CASE_TYPES = ['owner_cancellation', 'no_show', 'late_arrival', 'operational'];

export const CASE_AUDIENCES = [
  ['internal', 'Internal — Rentra only'],
  ['client', 'Owner and Rentra'],
  ['customer', 'Customer and Rentra'],
  ['everyone', 'Owner, customer and Rentra'],
];
