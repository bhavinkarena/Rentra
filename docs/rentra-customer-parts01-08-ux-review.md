# Rentra customer UI/UX review — Parts 01–08

**Reviewed:** 14 September 2026  
**Purpose:** Explain why the completed work can still feel unfinished to a customer, and give the developer a practical improvement brief.

**Assessment:** Rentra has a substantial technical foundation, but its customer interface needs a dedicated design pass. The main problems are too many decisions before seeing places, inconsistent presentation between screens, technical wording, and prominent actions that cannot yet complete a booking. Changing colors or adding animations alone will not address these problems.

This is a review of the implementation documents and current component source. It is not a new live-browser visual audit or customer research study. Observed interface behavior is identified below; statements about confusion or abandonment are design judgments to validate with users. Earlier automated checks establish specific functional behavior, not customer satisfaction.

## 1. What Parts 01–08 actually delivered

| Part | Delivered foundation | Customer benefit | Experience still needing attention |
| --- | --- | --- | --- |
| 01 — Dates, pricing and privacy | Shared date, interval and money rules; safer public listing data. | More trustworthy dates/prices and protected arrival details. | These improvements are mostly invisible. Customers still need understandable date labels and price explanations. |
| 02 — Reservations | Reservation structure, legacy audit and inventory constraints. | A foundation for preventing booking conflicts. | This part does not provide a completed booking journey or customer confirmation screen. |
| 03 — Payment records | Payment/refund structures and safeguards against treating simulated money as actual revenue. | A foundation for accurate financial records. | Tables and accounting checks do not create a usable payment experience. Historical dummy-mode notes are superseded by the later Razorpay Test direction. |
| 04 — Quotes and availability | Server quotes, owner schedules, guest charges, date overrides and shared inventory rules. | Prices and availability can agree across screens. | The summary mixes customer pricing with test/payment implementation details; the final booking action remains unavailable. |
| 05 — Login | Phone OTP, session protection and recovery of the selected listing/dates. | Customers can sign in without losing their selection. | Login needs a clearer immediate purpose while checkout is unavailable. Development code `123456` is a testing facility, not production SMS. |
| 06 — Account | Navigation, onboarding, profile, phone changes, preferences and privacy requests. | Customers can manage their identity and request support for privacy matters. | Several profile questions arrive early, while Bookings and Payment methods lead to availability notices. |
| 07 — Saved places | Guest/account saves, merge, removal, Undo and retained selection context. | A shortlist survives reloads and can follow the customer across devices. | Saved entries are text cards, unlike the photo-led discovery cards. Comparing and recognizing places takes extra effort. |
| 08 — Search | URL filters, city/area/intent routes, all-date matching, sorting and pagination. | Customers can find matching places and retain their search state. | The interface exposes a large filter form, technical labels and typed multi-date input. It works functionally but needs stronger hierarchy. |

**Keep these foundations.** Improve the screens using the existing pricing, identity, inventory and saved-place contracts. Completion of these eight engineering parts should remain recorded; customer experience readiness needs its own acceptance checks.

## 2. Highest-priority problems

Priority **P0** means resolve before presenting the experience as ready for customer booking. **P1** means address in the next UI improvement pass. **P2** means refine after the main journey is clear.

| Priority | Observed issue and source | Likely customer impact | Recommended change |
| --- | --- | --- | --- |
| P0 | The estimate ends with “Online booking is not available yet,” while login and Bookings remain prominent. [Estimate](../components/rentra/listing/BookingPriceBox.jsx), [Bookings](../app/(customer)/bookings/page.js). | Customers may invest effort and expect a booking outcome that the app cannot deliver. | Until checkout exists, position the experience clearly as browsing and saving. Make Save or Check dates the useful action; explain booking availability before login. Do not activate an unimplemented Reserve button. |
| P0 | The floating WhatsApp button links to the hardcoded number `919000000000`. [Marketing layout](../app/(marketing)/layout.js). | A visible support promise may lead to an unverified destination. | Confirm a real monitored support destination before showing the button, or remove it until support is configured. This review did not contact that number. |
| P1 | Search renders location text, city, area, category, date mode, dates, slot, guests, budgets, cancellation, sort and amenity controls before results. [Search screen](../components/rentra/DiscoveryResults.jsx). | The customer faces a form-filling task before seeing places worth choosing. | Keep location, dates, visit type and guests prominent. Move budget, amenities and cancellation into a Filters panel. Put sort beside the result count. |
| P1 | Separate dates must be typed as comma-separated `YYYY-MM-DD` values. [Date controls](../components/rentra/SearchDates.jsx). | Customers must understand a format and manually prevent mistakes. | Use a calendar that allows tapping separate dates, with removable readable date chips. Reuse it in search and listing selection. |
| P1 | Area options require selecting a city and submitting first. [Search screen](../components/rentra/DiscoveryResults.jsx). | A basic location choice needs an unexpected intermediate submission. | Use one city/area chooser with city-qualified suggestions; update area choices immediately when city changes. Keep server validation. |
| P1 | Chips expose keys and values such as `q`, `min`, `amenities` and `full_day`. [Search screen](../components/rentra/DiscoveryResults.jsx). | Internal filter names make the product feel like a developer tool. | Display “Surat,” “Under ₹8,000,” “Swimming pool,” and “Full day.” Keep machine values only in URLs and data. |
| P1 | Saved entries show titles, locality and text, without photographs. [Saved screen](../components/customer/SavedPlaces.jsx). | Customers lose the visual cues that made them save a place. | Reuse a photo-led saved-card variant with location, retained dates and Remove/Undo. Add current prices only through a fresh trusted read, never a stored price promise. |
| P1 | The header includes Explore, Saved, Bookings, Account, List your farm and Customer login. Login is rendered regardless of customer state; Explore is active only on `/`. [Navigation](../components/customer/CustomerNavigation.jsx), [layout](../app/(marketing)/layout.js). | Role choices compete with discovery, and customers can lose their navigation context on search/location pages. | Use customer-aware login/account controls, treat discovery routes as Explore, and move owner entry to secondary navigation. Test the resulting header on mobile. |
| P1 | The estimate lists “Planned test payment” and “Actual money collected”; the mobile bar repeats “No real money collected.” [Estimate](../components/rentra/listing/BookingPriceBox.jsx), [mobile bar](../components/rentra/listing/MobileBookingBar.jsx). | Operational language competes with the price the customer wants to understand. | Use one clear test-environment notice where necessary. Give the price breakdown a consistent order: rent, extra guests where applicable, fee, total and separate deposit terms. Preserve truthful test disclosure. |
| P2 | First-login/profile forms include optional email, contact language and marketing preference, with explanations of unavailable delivery/localization. [Account forms](../components/customer/AccountForms.jsx). | Setup feels longer than the immediate task requires. | Keep the required name step short. Move optional preferences into account settings or an optional collapsed section; retain separate, unchecked marketing consent. |

The Part 8 implementation I delivered particularly needs this follow-up: the large form and typed date list satisfied functional scope, but they do not yet provide the simplest customer interaction.

## 3. Recommended customer journey

### Home → results

Lead with a useful place photograph, a short statement of what can be explored, and one search control. Allow browsing without entering dates or logging in.

The initial search asks for a location, optional dates, visit type and guests. Location suggestions distinguish areas with the same name. Advanced preferences remain available through Filters.

On the results screen, show the selected search summary, result count and places before requiring further decisions. On mobile, open advanced filters in an accessible sheet with a visible Apply action and Clear option. Preserve filters on Back and reload.

### Results → listing

Keep card anatomy consistent: photo, recognizable name/locality, guest capacity, a few useful amenities, price basis and Save. Make whole-visit totals visibly different from undated “from” rates.

The listing should answer these questions in order:

1. What does the place look like?
2. Where is it approximately, and who is it suitable for?
3. What is included, and what restrictions apply?
4. Which dates and hours can I choose?
5. What is the total, including fees, and what deposit is separate?
6. What action can I actually complete now?

The content/gallery work belongs in Part 09. The shared calendar and quote interaction belong in Part 10. Neither should reimplement the server pricing rules.

### Save → return → sign in

Saving should remain available to guests. Show a short confirmation with Undo after removal. Offer login as a benefit: “Keep your saved places across devices.”

After login/onboarding, return customers to their original context when supported. Retain dates and guest count, and visibly explain any changed availability or price. Never imply that signing in reserved a place.

## 4. Visual and writing direction

Use the existing green brand and design tokens, with clearer hierarchy:

- Let property photographs carry the discovery screens; use restrained borders and backgrounds around controls.
- Give each section one obvious primary action. Keep support, owner entry and secondary settings visually quieter.
- Use the same card structure, button sizes, spacing and status treatments across Home, Search and Saved.
- Explain details beside the relevant decision. Replace long instructional paragraphs with short labels and optional explanations.
- Use readable dates such as “28 Sep · Day visit” in summaries. Show exact owner-defined hours before accepting a selection.
- Review text wrapping, focus visibility and sticky controls at narrow widths. An overflow test alone does not establish comfortable reading or touch interaction.

Suggested copy, with numbers below used only as examples:

| Current presentation | Preferred presentation |
| --- | --- |
| `slot: full_day` | Full day |
| `min: 5000` / `max: 8000` | ₹5,000–₹8,000 |
| Separate dates: `2026-09-28,2026-09-30` | Tap dates; show “28 Sep” and “30 Sep” chips |
| Generic price explanation repeated on every dated card | “₹12,960 total · 2 visits · includes platform fee,” with separate deposit information |
| Login as the main progress action while booking is unavailable | “Save this place,” plus an honest booking-availability notice |

Do not publish example amounts as actual prices. Derive all displayed totals, availability, rules and verification claims from their existing trusted sources.

## 5. Suggested implementation sequence

These are proposed follow-up sessions, not newly completed roadmap parts or authorization to change the application in this review.

| Session | Bounded work | Acceptance outcome |
| --- | --- | --- |
| UX A — Discovery and navigation | Simplify header, primary search, location chooser, advanced filters and readable chips. Resolve the support destination. | A guest can find matching places without understanding internal filter terminology or making an extra city-only submission. |
| UX B — Listing presentation | Incorporate this review into Part 09: gallery, fast facts, amenity states, restrictions, approximate location and clear action hierarchy. | A guest can explain what is offered and what they can do next. |
| UX C — Dates and price | Incorporate into Part 10: shared visual date selection, summaries and fee/deposit hierarchy. | A guest selects two separate dates without typing a date format and understands the resulting total. |
| UX D — Saved and account polish | Photo-led saved cards, concise onboarding, customer-aware account entry and purposeful unavailable states. | A guest recognizes a saved place, signs in and resumes their task without losing context. |

Keep checkout/payment work in Parts 11–12 and booking history in Part 13. When completing any numbered implementation part, continue updating the HTML detailed card, all status summaries, the session tracker and its runbook together.

## 6. How to judge whether the improved UI is ready

Run moderated tasks with a small initial group of representative customers; five participants is a practical starting point, not statistical proof. Observe them without explaining the interface first.

Ask them to find a place for a group, choose two separate dates, explain the total and deposit, save two places, return to a shortlist, and recover from an unavailable date. Record task success, wrong turns, unclear labels and whether they can explain the next action. Measure time to the first useful result before and after changes rather than claiming a conversion improvement without evidence.

The design acceptance checklist should include:

- [ ] Basic discovery works without login or advanced filter setup.
- [ ] Separate dates can be selected without typing a machine-readable format.
- [ ] Filter labels are understandable and remain correct after Back/reload.
- [ ] Search, Saved and listing screens preserve the same selection context.
- [ ] Customers can distinguish base rent, selected-date total and refundable deposit.
- [ ] The main action works, or its current limitation is explained before the customer invests effort.
- [ ] No placeholder support destination or unsupported trust claim is presented.
- [ ] Keyboard focus, screen-reader labels, contrast and mobile sticky-control interactions are checked directly.
- [ ] Existing identity, privacy, inventory, quote and saved-place regression checks still pass.

These checks are proposals and remain unchecked. This document does not change Parts 01–08 completion status or claim that their UI has passed customer usability research.

## Implementation update — 15 September 2026

The application changes requested by this review are now implemented across its scoped follow-ups. UX A and UX D simplified discovery/navigation, made saved cards photo-led and reduced onboarding pressure. Part 09 completed UX B with factual listing content, explicit amenity states, exact visit hours, an accessible gallery, evidence-backed trust and canonical sharing. Part 10 still owns UX C: the unified multi-date picker and accepted quote summary. The moderated design acceptance checklist above remains intentionally unchecked until customer observation is performed.

## Sources reviewed

Part 01 is documented in the [session roadmap](rentra-customer-sessions.md#part-01--booking-and-public-data-foundations); there is no separate Part 01 runbook in the current docs directory. Additional sources: [Part 02](rentra-customer-part02.md), [Part 03](rentra-customer-part03.md), [Part 04](rentra-customer-part04.md), [Part 05](rentra-customer-part05.md), [Part 06](rentra-customer-part06.md), [Part 07](rentra-customer-part07.md), [Part 08](rentra-customer-part08.md), and the current customer-facing components linked in the findings table. Historical rollout notes should be interpreted alongside the current session handoff.
