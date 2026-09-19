'use server';

import { redirect } from 'next/navigation';
import { sql } from '../db/index.js';
import { requireCustomer, getSession } from '../auth/dal.js';
import { getCurrentAdmin } from '../auth/admin.js';
import { createCheckoutHold, readCheckoutStatus } from './checkout.js';
import { startCheckoutPayment, verifyCheckoutPayment, reconcilePayment } from '../payments/checkout-service.js';

async function actor() {
  if (await getCurrentAdmin()) redirect('/login');
  await requireCustomer();
  return getSession();
}
function failure(error) {
  const code=/^[A-Z_]{1,64}$/.test(error.code ?? '')?error.code:'CHECKOUT_UNAVAILABLE';
  return { error:'Your test booking could not complete this step. Check its current status before trying again.',code };
}
export async function holdCustomerCheckout(input) {
  const session=await actor();
  try { return {checkout:await createCheckoutHold(sql,session,input)}; } catch(error) { return failure(error); }
}
export async function startCustomerTestPayment(orderId) {
  const session=await actor();
  try { return {checkout:await startCheckoutPayment(sql,session,orderId)}; } catch(error) { return failure(error); }
}
export async function verifyCustomerTestPayment(input) {
  const session=await actor();
  try { return {checkout:await verifyCheckoutPayment(sql,session,input)}; } catch(error) { return failure(error); }
}
export async function customerCheckoutStatus(orderId) {
  const session=await actor();
  try { return {checkout:await readCheckoutStatus(sql,session,orderId)}; } catch(error) { return failure(error); }
}
export async function refreshCustomerTestPayment(orderId) {
  const session=await actor();
  try {
    const owned=await readCheckoutStatus(sql,session,orderId);
    await reconcilePayment(sql,owned.paymentOrderId);
    return {checkout:await readCheckoutStatus(sql,session,orderId)};
  } catch(error) { return failure(error); }
}
