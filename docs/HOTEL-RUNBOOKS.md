# Rentra Stays — runbooks and support playbooks

Hotel plan Phase 9. For Rentra operations, finance and support during the closed beta and launch. Keep this open during beta weeks. Every money or inventory correction goes through an admin screen or a booking case, never direct database edits.

**Where to look first**

- **Admin → Operations → Service health:** alerts include `overbooked_room_nights`, `stuck_room_holds`, `stay_hold_expiry_spike`, `webhook_backlog`, `refund_backlog`, `unallocated_captures` and `payments_worker_unhealthy`.
- **Readiness report:** `npm run release:hotels -- beta` (or `-- public`) in `rentra-backend`. It is read-only and prints every check with pass/fail and the hotels that fail.
- **Admin → Finance:** Payments, Refunds, Hotel payouts, Hotel analytics.
- **Booking detail:** `/admin/bookings/{order}`. It shows the order, rooms, payment, refunds and lifecycle events.

---

## 1. Payment incident

**Signs:** a guest says they paid but sees no booking; `webhook_backlog`, `unallocated_captures` or `payments_worker_unhealthy` alerts; a spike in "Check payment status" from guests.

1. **Find the order.** Search the guest phone or booking reference in admin. Open the booking: is the payment order `processing`, `succeeded` or `failed`? Is the hold still live?
2. **Reconcile with Razorpay.** The guest's "Check payment status" button or the payment worker asks Razorpay for the truth. Wait 5 minutes for the worker, or ask the guest to press the button once. Never mark a payment paid by hand.
3. **Captured and confirmed:** nothing to do. Tell the guest the booking is in My trips.
4. **Captured after the hold expired:** the system does not take rooms back. It cancels the booking and creates an automatic refund (`refund_required` event), and the guest sees "needs resolution". Tell the guest the refund is on its way (normally 5–7 working days to the card or UPI). If they still want the stay, they book again; prices may differ.
5. **Payments worker unhealthy or webhooks backing up:** check Render worker logs and Razorpay webhook delivery. Holds keep expiring correctly without the worker (they are checked on every read), but captures wait. Restart the worker. Webhooks are idempotent, so replays are safe.
6. **Money mismatch** (`unallocated_captures` > 0, or the readiness check "every confirmed stay is paid exactly" fails): stop and escalate to finance. Do not run a payout run until it is explained.

**Escalate** to the tech lead for any capture without an order, any amount different from the quote, or webhook signature failures.

## 2. Overbooking

The database refuses more rooms than the allotment (`sold + held ≤ allotment`), so a true overbooking can only come from a hotel selling the same room elsewhere (walk-in, another OTA) or from a wrong room count.

1. **Alert `overbooked_room_nights` > 0:** this should never happen. Escalate to tech at once; it means the database rule was bypassed.
2. **The hotel says it has no room for a guest** (oversold outside Rentra):
   - Call the hotel and ask for an equal or better room at the same hotel at no extra cost.
   - If they can't, relocate: find an equal or better hotel nearby (Hotels search, same dates).
   - Open a **booking case** (type "owner cancellation") from the booking. Rentra refunds the guest in full (room and tax, using the *full refund* basis) and books the alternative.
   - Record the relocation in the case notes.
   - The original hotel pays the price difference under the partner agreement.
   - Ask the hotel to fix its room counts in **Rates & rooms** (rooms open to Rentra).
3. **Rooms stuck in an expired hold** (`stuck_room_holds` > 0): holds are released on the next read of that hotel. If the alert persists for more than an hour, escalate; the readiness check also fails on it.

## 3. Refund failure

**Signs:** `refund_backlog` alert; Admin → Finance → Refunds shows `unknown` or a failure code; a guest says the refund never arrived.

1. Open the refund in Admin → Finance → Refunds. A refund stays reserved even when Razorpay reports failure, so it is never paid twice.
2. **`processing` for less than 5 working days:** normal bank time. Share the refund ID (RRN once Razorpay shows it).
3. **`unknown` or failed:** in Razorpay, check whether the refund exists for the payment. Use the investigation tools in Admin → Finance to reconcile; never create a second refund in the Razorpay dashboard.
4. **Payment method closed** (card cancelled or UPI handle gone): collect bank details from the guest through support and record a manual refund case for finance.
5. **Every stay refund stuck for more than a day** fails the readiness check. Clear these before running the Tuesday payout.

## 4. Weekly hotel payout (Tuesday)

1. Admin → Finance → **Hotel payouts**, environment **Live**.
2. Read the reconciliation sentence: paid − refunds − GST Rentra owes − commission − GST on commission − TCS − TDS = net. Check the held list: a stay is held when its payout method is not verified or no commission rule covers the stay date. Fix those first if they should be paid this week.
3. **Make payout run** → confirm. The run is frozen (snapshot) and each stay is paid once only.
4. Pay each hotel's net by bank transfer. Then use **Record transfer** to save the UTR. Owners see "Settled · UTR" on their statement.
5. **Before the first live run:** set `RENTRA_LEGAL_NAME`, `RENTRA_GSTIN` and `RENTRA_LEGAL_ADDRESS`. Until then commission invoices are drafts. Get the CA's sign-off on the rates (TCS 0.5%, TDS 0.1% on room revenue, 9(5) GST for unregistered hotels).

## 5. Closed beta operations

1. Hotels stays **Open to partners** (Admin → Catalogues → Verticals).
2. **Invite guests:** Admin → Catalogues → **Hotel beta** → paste mobile numbers (one per line). Send each guest this message: "You're invited to Rentra Stays. Log in at rentra…/login with this number, then open rentra…/beta."
3. **What an invited guest sees:** after opening `/beta`, the guest sees `/hotels`, search, hotel pages and checkout for 7 days. The pass renews by opening `/beta` again while the guest is still invited. Removing a guest stops renewal; access ends within 7 days.
4. **Daily during beta:**
   - run `npm run release:hotels -- beta` (it must pass);
   - review Service health;
   - read new hotel reviews and support tickets;
   - log every bug with severity P1–P4 (P1 = money or booking wrong; P2 = a guest or hotel cannot complete a task).
5. **Beta exit (plan acceptance):**
   - 2 weeks of beta;
   - at least 50 real bookings;
   - zero overbookings;
   - zero payment mismatches;
   - all P1/P2 bugs closed;
   - launch checklist (§11.4) signed.

## 6. Launch switch

1. Run `npm run release:hotels -- public`. The admin switch runs the same inspection and refuses **Public** while any check fails. It names the failing checks:
   - 40+ live hotels with 8+ photos;
   - rooms, rates, commission rule, verified payout method and GST answer for every hotel;
   - hotels open on most of the next 90 nights;
   - tax slabs cover today;
   - live payments enabled;
   - policies published;
   - plus every integrity check.
2. The paper checklist covers the rest: partner agreements, message templates, support rota, the CA's sample invoices and the restore drill.
3. Switch Admin → Catalogues → Verticals → Hotels → **Public**, with a reason. The tab and search appear for everyone after the registry cache refreshes (up to 5 minutes).

## 7. Support playbooks (guest and hotel)

| Situation | Say / do |
| --- | --- |
| "I can't see Hotels" (beta) | Check the number is on Hotel beta, then ask the guest to log in with that number and open /beta again. |
| Guest wants to cancel | My trips → booking → Cancel. The preview shows the exact refund under the rate's rule. Support cannot override a non-refundable rate; open a case if the hotel agrees to waive. |
| Guest can't check in (hotel refuses ID or the couple policy) | Call the hotel and quote the policy shown on the booking. If the hotel breaks its own published policy, relocate (§2) and open a case against the hotel. |
| Guest needs a GST invoice | The hotel issues it to the GSTIN given at checkout (shown on the booking and the hotel's Bookings). If it was missed at checkout, the hotel can still invoice; send them the booking details. |
| Hotel asks when it gets paid | Payable after check-in (or 24 hours after check-in time); paid every Tuesday. Earnings → Hotel earnings shows the next payout and held stays with reasons. |
| Hotel disputes commission or TDS/TCS | Show the payout statement line (room, GST, commission + 18% GST, TCS 0.5%, TDS 0.1%, net). Escalate rate disagreements to finance with the partner agreement. |
| No-show | The hotel reports it from Bookings after the arrival window. The rate's no-show rule decides the charge; the guest may dispute within the case window. |

**Contacts during beta:** fill in before day 1.
- Tech on-call: ______
- Finance: ______
- Support lead: ______
- Razorpay account manager: ______
