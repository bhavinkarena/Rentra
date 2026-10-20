# Hotels · Phase 0 field kit (discovery & business validation)

Phase 0 of [HOTEL-PLAN.md](HOTEL-PLAN.md). Everything needed to run the two weeks of field work: lead list, interview script, pitch, letter of intent, guest survey, questions for the CA, partner-agreement heads of terms, and the sheets to record results.

**Who runs it:** the owner and a BD person. Claude prepared the material; the interviews, signatures, survey and CA opinion must come from real people.

**Exit criteria (from the plan):** ≥ 15 signed LOIs · CA sign-off on the money flow · owner decisions §13.2 Q1–Q10 answered · commission/fee decision recorded · success metrics (§3.7) agreed.

> Templates in this file are drafts, not legal or tax advice. Have the LOI and partner agreement reviewed by a lawyer, and the tax flow by a CA, before anyone signs.

---

## 1. Two-week schedule

| Day | Work | Output |
| --- | --- | --- |
| 1 | Build the lead list (§2): 60 hotels in Surat. Book the CA meeting (§7). Send the guest survey (§6). | `hotel-leads-template.csv` filled · CA date · survey live |
| 2 | Segment leads A/B/C. Print 30 pitch sheets (§4). Call A-segment hotels to book visits. | 20 visits booked |
| 3–8 | Visits: 3–4 per day. Interview (§3) first, pitch (§4) second, LOI (§5) only if interested. Enter each visit the same evening (§9). | 20 interviews · LOIs |
| 6 | CA meeting with §7 questions. | Written CA opinion requested |
| 9 | Close the survey. Summarise (§9.2). Follow up undecided hotels. | Survey summary |
| 10 | Decision meeting: commission, fee, Q1–Q10, go/no-go (§10). | Decision log filled · Phase 0 record in the plan |

## 2. Lead list

**Sources** (manual; do not scrape sites against their terms):
- Google Maps searches: "hotel in Adajan", "hotel near Surat railway station", "hotel Vesu", "hotel Ring Road Surat", "resort Dumas".
- Hotels already listed on large OTAs in Surat (note their visible rating and review count).
- Local hotel and restaurant associations; ask for an introduction at a meeting.
- Existing Rentra farmhouse owners who also own or know hotels.

**Segments**

| Segment | Rule | Target visits |
| --- | --- | --- |
| A | 25–80 rooms, Google rating ≥ 3.8, on at least one OTA | 12 |
| B | 10–25 rooms, any rating | 6 |
| C | Boutique, homestay or resort under 10 rooms | 2 |

**Tracker:** [hotel-leads-template.csv](hotel-leads-template.csv). Import it into Google Sheets. One row per hotel; never delete rows, change `stage`.

Stages: `lead → called → visit_booked → interviewed → interested → loi_signed` or `declined` (with `decline_reason`).

## 3. Hotel interview script (20–25 minutes)

Interview before you pitch. Write their numbers down exactly; the plan's unit economics (§3.3) depend on them.

**Open (1 min).** "We run Rentra, a Surat booking platform for farmhouses. We're deciding whether to add hotels and want to understand how you sell rooms today. No sales pitch for the first 15 minutes."

**About the hotel**
1. How many rooms, and of which types?
2. Average room rate on weekdays and weekends this month? Highest season and rate?
3. Average occupancy this month? Best and worst months?
4. Who are most of your guests? (business, family, couples, pilgrims, wedding/event)

**How you sell today**
5. Which channels give you bookings? Rough share each: walk-in, phone/WhatsApp, MakeMyTrip/Goibibo, Booking.com, Agoda, OYO, others.
6. What commission does each OTA charge you? Any extra for preferred or visibility programmes?
7. How fast are you paid by each? Any problems with payouts or deductions?
8. Do you use a channel manager or PMS? Which one? (STAAH, eZee, AxisRooms, other, none)
9. Who updates rates and availability, and how often?
10. Have you had overbookings in the last 3 months? How did you handle them?

**Pain and fit**
11. What annoys you most about the platforms you use?
12. Which guests do you wish you got more of?
13. Do you accept couples / local ID? Do you have veg-only or Jain kitchens? (filter data)
14. Would you give a new local platform a few rooms per night? How many?
15. At what commission would you list with a new platform? (ask before showing ours)
16. Prepaid only, or do guests expect to pay at the hotel?
17. Do you have a GSTIN? Who prepares your GST returns?

**Close.** "Thank you. Can I show you what we're planning? It takes 5 minutes."

**Scoring (fill after the visit, 1–5 each):** pain with current OTAs · willingness to give rooms · ease of operation (can they update inventory daily?) · property quality vs photos. Total ≥ 14 = priority founding partner.

## 4. Founding-partner pitch (one page, print or WhatsApp)

**Rentra Hotels — founding partners in Surat**

Rentra already brings Surat families and groups to verified farmhouses. From early 2027 we add hotels, starting with 50 founding partners in Surat.

- **10% commission for 12 months** (standard rate after that: 13%). No listing fee.
- **Weekly payouts** every Tuesday for stays that started by Sunday, with a statement per booking.
- **You control the rooms:** choose how many rooms Rentra can sell each night; close tonight in one tap from your phone.
- **Prepaid bookings only** at launch: the guest has paid before arriving.
- **Free owner app:** today's arrivals, rates calendar, bookings and payouts.
- **Verified listing:** our team visits or video-checks your hotel; founding partners get help with photos.
- **Local guests:** couple-friendly, local-ID, veg/Jain and near-landmark filters, shown honestly.

Next step: a 25-minute setup with our team. No cost, no lock-in.

*Show the prototype on a phone: `docs/design/hotels/owner-today.html` and `owner-rates.html`.*

Before printing, confirm with the owner: launch timing, the photo-help offer (plan: first 20 hotels), and whether the 13% standard rate is final (Q2).

## 5. Letter of intent (non-binding) — template

> **Letter of intent — Rentra Hotels founding partner**
>
> Date: ____ · Hotel: ____________ · Legal entity: ____________ · Address: ____________ · Rooms: ____
>
> 1. **Intent.** The hotel intends to list on Rentra Hotels when it launches in Surat, and Rentra intends to list the hotel as a founding partner, subject to Rentra's verification of the property and documents.
> 2. **Proposed terms.** Commission of 10% on room revenue (excluding GST) for 12 months from the hotel's go-live date; weekly payouts; no listing fee. Final terms will be in the partner agreement.
> 3. **Inventory.** The hotel decides how many rooms it offers on Rentra on each date.
> 4. **Non-binding.** This letter records intent only. It creates no obligation for either party to sign the partner agreement, list, or accept bookings, except that each party will keep the other's commercial information confidential.
> 5. **Validity.** This letter lapses on ____ (suggest 90 days) if no partner agreement is signed.
>
> For the hotel: name ________ signature ________ · For Rentra: name ________ signature ________

## 6. Guest survey (existing Rentra customers)

**Send to:** opted-in Rentra customers by WhatsApp/email (marketing consent required under the DPDP Act; send only to people who agreed to receive messages). Target 300 responses. Google Forms is enough. Offer a small incentive only if it is real (for example a ₹100 farmhouse credit) and stated in the message.

1. In the last 12 months, how many nights did you stay in hotels? (0 · 1–2 · 3–5 · 6–10 · 10+)
2. Main reasons? (work · family visit · holiday · religious trip · wedding/event · other)
3. Which cities? (Surat · Ahmedabad · Vadodara · Rajkot · Saputara · Dwarka/Somnath · Statue of Unity · outside Gujarat · other)
4. How did you book your last hotel? (MakeMyTrip/Goibibo · Booking.com · Agoda · OYO · called the hotel · walk-in · company booked · other)
5. Typical price per night you pay? (< ₹1,500 · 1,500–3,000 · 3,000–5,000 · 5,000–7,500 · > 7,500)
6. Which matter most? Pick 3. (lowest price · free cancellation · breakfast · location · reviews · couple-friendly · local ID accepted · veg/Jain food · pay at hotel · GST invoice)
7. Prepaid vs pay at hotel: which do you prefer? (prepay · pay at hotel · either)
8. Would you book a hotel on Rentra if prices were the same as other apps? (yes · maybe · no) Why?
9. What would make you switch from the app you use now? (open text)
10. May we contact you to test the new hotel booking screens? (yes, phone/email · no)

Question 10 recruits the 5 guests for the Phase 1 usability sessions.

## 7. Questions for the CA (bring written answers back)

1. **GST rate:** confirm the current slabs for hotel accommodation (per unit per night, ≤ ₹7,500 at 5% without ITC; above at 18%) and whether the slab is decided on the tariff charged after discounts, per room per night.
2. **Section 9(5):** when a hotel listed on Rentra is not GST-registered (or in other cases), is Rentra liable to pay GST on the accommodation as an e-commerce operator? What registration, invoicing and returns does that need?
3. **TCS under section 52:** current rate, base (net taxable supplies), and filing (GSTR-8) for registered hotels.
4. **TDS under 194-O:** current rate and base (gross amount or excluding GST), interaction with TCS, Form 26Q/16A obligations.
5. **Invoicing:** can Rentra issue the guest's tax invoice on behalf of the hotel? What must it contain? Who issues it under 9(5) cases?
6. **Commission:** confirm 18% GST on Rentra's commission invoice to hotels; place of supply for Gujarat-only and later out-of-state hotels.
7. **Cancellation and no-show charges:** GST treatment of retained amounts; credit notes on refunds.
8. **Funds flow:** is collecting the full payment and paying hotels weekly acceptable, or should payments split at source (for example Razorpay Route)? Any escrow/nodal requirement?
9. **Business guests:** what does Rentra need to capture (GSTIN, legal name, address) for a B2B invoice the guest can claim?
10. **Records:** retention period and format for the payout statements, TCS/TDS certificates and invoices.

Record the CA's answers in §10 and update the plan's §3.4 where they differ.

## 8. Partner agreement — heads of terms (for the lawyer)

| Topic | Proposed term |
| --- | --- |
| Parties & role | Rentra is an intermediary/marketplace; the hotel is the supplier of accommodation and responsible for the stay |
| Commission | % of room revenue excluding GST; founding 10% for 12 months, then the standard rate; changes with 30 days' notice; never applied to bookings already made |
| Payment & payouts | Rentra collects guest payments; weekly payout for stays started; statement per booking; deductions: commission + GST, TCS, TDS, refunds, dispute outcomes |
| Inventory & rates | Hotel sets rooms and rates; must keep them accurate; must honour every confirmed booking at the booked price |
| Overbooking | Hotel relocates the guest to equal or better accommodation at its cost, or pays the price difference Rentra pays; repeated failures allow suspension |
| Cancellation & no-show | Guest policy per rate plan as shown at booking; hotel marks no-show only after the defined time; guest may dispute |
| Content | Hotel warrants photos and descriptions are true and that it holds rights to them; Rentra may edit for accuracy and remove misleading content |
| Compliance | Hotel holds required licences, follows guest-ID and Form C rules, fire and safety rules; provides GSTIN/PAN and keeps them current |
| Guest data | Used only to deliver the stay; no marketing to Rentra guests without their consent; DPDP Act obligations |
| Disputes | Rentra support first line; evidence within set timelines; Rentra may refund the guest and recover from payouts per the decision |
| Price parity | **Do not include a wide price-parity clause** without legal advice. The Competition Commission of India acted against parity obligations in online hotel booking in 2022 (MakeMyTrip-Goibibo/OYO case). Ask the lawyer whether any narrow form is acceptable |
| Term & exit | Either party may end with 30 days' notice; confirmed bookings are honoured |
| Liability | Hotel liable for the stay; Rentra liable for platform errors; caps per the lawyer |

## 9. Recording results

### 9.1 Interview summary (fill one row per visit; keep in the Sheet)

Columns are already in `hotel-leads-template.csv`: rooms, weekday/weekend rate, occupancy, OTAs, commission paid, payout days, channel manager, overbookings, couples/local ID/veg, rooms offered to Rentra, acceptable commission, prepaid OK, GSTIN, score, stage, notes.

### 9.2 Phase 0 summary (fill on day 9–10)

| Measure | Result | Plan assumption |
| --- | --- | --- |
| Interviews done | | 20 |
| LOIs signed | | ≥ 15 |
| Median weekday rate | | ₹2,800 ADR (§3.3) |
| Median occupancy | | — |
| Median OTA commission paid today | | 15–25% |
| Median acceptable commission for Rentra | | 10% founding |
| Hotels using a channel manager (and which) | | decides V1.1 integration (Q10) |
| Hotels with GSTIN | | decides 9(5) volume |
| Prepaid-only acceptable | | MVP is prepaid only |
| Survey responses | | 300 |
| Respondents who would book on Rentra (yes + maybe) | | — |
| Top 3 guest priorities | | — |

## 10. Decision log (day 10)

| # | Decision | Answer | Evidence |
| --- | --- | --- | --- |
| Go / no-go | Continue to Phase 2? | | §9.2 |
| Commission | Founding % and standard % (Q2) | | interviews Q15 |
| Guest fee | Any convenience fee at launch (Q3) | | survey Q6, Q8 |
| Pay at hotel | MVP or V1.1 (Q5) | | interviews Q16, survey Q7 |
| Homestays | Include at launch (Q4) | | segment C interest |
| Channel manager | First integration (Q10) | | interviews Q8 |
| Tax flow | CA opinion summary | | §7 answers |
| Brand, address, wording, invoice | Q1, Q6, Q7, Q8, Q9 | | owner |
| Design decisions | P1-1 … P1-7 (design README §6) | | owner |
| Success metrics | Keep or change plan §3.7 | | §9.2 |

When this table is filled and ≥ 15 LOIs are signed, mark Phase 0 complete in [HOTEL-PLAN.md](HOTEL-PLAN.md) and update §3.3–3.5 with the real numbers.
