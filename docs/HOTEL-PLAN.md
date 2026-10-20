# Rentra Stays — Hotel Booking Vertical: Product, UX & Implementation Plan

**Version:** 1.1 · **Date:** 20 Oct 2026 · **Status:** Phases 1–3 complete (design; inventory engine; owner wizard — local); owner decisions (§13) and Phase 0 business validation still open
**Scope:** Add hotel search and booking for customers, hotel onboarding and an extranet for hotel owners and managers, and the matching admin tools, as a third vertical next to **Farmhouse** and **Entertainment**.

---

## Progress

Phases are delivered one at a time; the owner asks for the next one. Work happens on branch `feat/hotels` in both repos (`Rentra/`, `rentra-backend/`) and is not committed until the owner asks. This file lives at `Rentra/docs/HOTEL-PLAN.md`; the copy at the project root is kept identical.

| Phase | Status | Completed |
|---|---|---|
| 0 → Discovery & business validation | 🟡 Field kit ready (20 Oct 2026); interviews, LOIs, survey and CA sign-off open (owner/BD work) | |
| 1 → Product & UX design | ✅ Complete (owner approval and usability sessions open, see Phase 1 completion record) | 20 Oct 2026 |
| 2 → Data model & inventory engine | ✅ Complete (local; migration 0064 not applied to Neon) | 20 Oct 2026 |
| 3 → Owner onboarding & property management | ✅ Complete (local; moderated owner test open) | 20 Oct 2026 |
| 4 → Admin verification & settings | ⏳ Next | |
| 5 → Extranet operations | ⏳ | |
| 6 → Customer discovery | ⏳ | |
| 7 → Booking, payment & cancellation | ⏳ | |
| 8 → Post-stay: reviews, payouts, analytics | ⏳ | |
| 9 → Hardening, beta & launch | ⏳ | |
| 10 → Post-launch growth | ⏳ | |

---

## How to read this document

| Marker | Meaning |
| --- | --- |
| **[MVP]** | Must ship before public launch. |
| **[V1.1]** | First 1–3 months after launch, driven by real usage. |
| **[V2]** | Later. Build only when data shows the need. |
| ♻ | Reuses something Rentra already has. Do not rebuild it. |

| § | Section | Main reader |
| --- | --- | --- |
| 1 | Executive summary and key decisions | Everyone |
| 2 | Market research: what leading platforms do | Owner, design |
| 3 | Business development strategy | Owner, BD |
| 4 | Customer experience | Product, design, frontend |
| 5 | Hotel owner experience (extranet) | Product, design, frontend |
| 6 | Admin experience | Product, ops, frontend |
| 7 | UI/UX design system and wireframes | Design, frontend |
| 8 | Architecture: frontend, backend, data, APIs, payments, security | Engineering |
| 9 | Phase-wise development plan | Everyone |
| 10 | Implementation roadmap: milestones, dependencies, timeline | Owner, engineering |
| 11 | Testing, deployment and launch | Engineering, QA |
| 12 | Post-launch improvements and KPIs | Owner, product |
| 13 | Risks and open decisions | Owner |

---

## 1. Executive summary

### 1.1 The idea in one paragraph

Rentra already lets guests book farmhouses (day visits and stays) and is adding entertainment venues (hourly courts). Hotels are the natural third vertical: the same guests travel, the same cities are covered, and the same owner/admin machinery (onboarding, verification, payouts, disputes, reviews) applies. The hotel vertical — branded **Rentra Stays** inside the app — lets guests find and book rooms in verified independent and mid-size hotels in Gujarat first, with honest prices (tax included), clear cancellation rules and instant confirmation. Hotels get a simple extranet that works on a phone at the front desk, lower commission than the large OTAs during launch, and weekly payouts.

### 1.2 Why it can win (positioning)

The large OTAs (Booking.com, MakeMyTrip/Goibibo, Agoda) own national search. Rentra should not fight them head-on. It wins locally with:

1. **Local depth.** Every hotel is visited or video-verified by the Rentra team (♻ `verification_visit`). Photos are real; "Verified" is shown only when a verification is on record.
2. **Total-price honesty.** The price on the search card is the price for the chosen dates and guests, taxes included. No surprise at checkout.
3. **Better owner terms.** Launch commission of 10% (vs commonly reported 15–25% on large OTAs; verify for your market), weekly payouts, no listing fee, a free extranet that is easier than a full PMS.
4. **One account for every trip type.** Farmhouse for the weekend party, hotel for the business trip, turf for the evening game — one login, one wallet of saved places, one support desk.
5. **Gujarat-first trust signals.** Couple-friendly, local-ID-accepted, veg-only kitchen, Jain food, family-only, near-temple, near GIDC / diamond market — filters that national OTAs bury.

### 1.3 Key decisions this plan takes (owner can overturn any in §13)

| # | Decision | Why |
| --- | --- | --- |
| D1 | Hotels are a new **vertical** (`hotel`) in the existing `vertical` registry, not a separate app. | ♻ Same accounts, header tabs, admin, payments, payouts. Launch is a status switch (`hidden → partners → public`). |
| D2 | A hotel is a `rentable` (the property) plus new **room type** and **rate plan** tables. | Hotels sell *N identical rooms per type per night*. Farmhouse/venue models sell one unit or one court. |
| D3 | Inventory is counted per **room type per night** (allotment model) with a database `CHECK (sold + held <= allotment)`. | Industry standard; the database itself prevents overbooking under concurrency. |
| D4 | **Instant booking only** in MVP. No request-to-book. | Guests expect instant confirmation for hotels; it also removes an owner SLA problem. |
| D5 | **Prepaid online** (full amount) in MVP via ♻ Razorpay. Pay-at-hotel is V1.1 with card guarantee or small deposit. | Pay-at-hotel causes no-shows and commission collection problems for a new marketplace. |
| D6 | **Commission model**: hotel pays 10% launch commission (12-month lock), rising to 12–15% standard. Guests pay no booking fee in MVP. | Removes guest-price friction; low commission is the BD hook. |
| D7 | Rates are owner-set: weekday/weekend default + date overrides + derived plans (breakfast, non-refundable). No dynamic pricing engine in MVP. | Simple to explain to small hotels; dynamic pricing suggestions are V2. |
| D8 | No channel manager integration in MVP; hotels update Rentra inventory manually or by "close out" button. Channel manager (STAAH, eZee, AxisRooms etc.) is V1.1–V2. | Integrations are slow to certify; the first 50 hotels are small and can manage manually. |
| D9 | Launch city: **Surat**, then Ahmedabad, Vadodara, Rajkot, then tourist circuits (Saputara, Dwarka, Somnath, Statue of Unity, Gir, Diu). | Matches the existing farmhouse supply and team presence. |
| D10 | Display **total price including taxes** on cards (with "incl. taxes" label) and a full breakdown at checkout. | Trust; Indian consumer-protection guidance discourages drip pricing. |

### 1.4 What ships in MVP vs later

| Area | MVP | V1.1 | V2 |
| --- | --- | --- | --- |
| Discovery | City/area/landmark search, date + rooms/guests picker, list + map, filters, sort | Recently viewed, price alerts, "deals" rail | Personalised ranking, flexible-date calendar, AI trip assistant |
| Hotel page | Gallery, facts, amenities, rooms + rate plans, policies, map, reviews | Room-level 360°/video, Q&A | Virtual tour |
| Booking | Multi-room, prepaid, instant confirm, tax invoice, guest details, GST invoice for business | Pay-at-hotel, part-pay, coupons, corporate GST profile | Loyalty, wallet, group bookings (10+ rooms) |
| Cancellations | Policy per rate plan, self-serve cancel, auto-refund | Modify dates, partial cancel (one room) | Travel insurance add-on |
| Owner | Onboarding wizard, verification, room types, rate plans, rate & inventory grid, reservations, arrivals/departures, payouts, reviews reply, staff roles | Channel manager, promotions, iCal, bulk photo AI tagging | Revenue-management suggestions, PMS-lite (housekeeping, folio) |
| Admin | Approval queue, hotel/room moderation, bookings, refunds, commissions, disputes, settings, analytics | Fraud rules, featured placements | Self-serve ads marketplace |

---

## 2. Market research: what leading platforms do

Patterns studied: Booking.com, MakeMyTrip/Goibibo, Agoda, Airbnb (for the hotel-like listing pages), OYO, Expedia/Hotels.com, Google Hotels. Rentra takes the pattern, not the look.

| Pattern | Who does it best | Take for Rentra | Avoid |
| --- | --- | --- | --- |
| Search bar with destination, dates, rooms & guests as one pill | Booking.com, Airbnb | ♻ Existing Rentra search pill, gains "Rooms" stepper | Separate pages per field on mobile |
| Autocomplete groups: cities, areas, landmarks, hotels | Booking.com, MMT | Group results with icons; landmarks (e.g. "Surat Railway Station") search by radius | Showing hotels before places |
| Total price on cards for chosen dates | Airbnb (2025 total-price default), Google Hotels | Card shows "₹6,840 for 2 nights · incl. taxes" when dates set; "from ₹3,200/night" when not | Showing base fare then adding taxes at checkout |
| Room table: room type × rate plans with "Select rooms" counts | Booking.com | Keep the idea, make it a stack of room cards with plan rows (works on phones) | Wide tables that scroll sideways on mobile |
| Scarcity / urgency messages | Booking.com | Only true facts: "2 rooms left at this price" from real inventory | Fake urgency, fake "x people viewing" |
| Free cancellation badge | Everyone | Green "Free cancellation until 18 Nov, 12:00" with exact date, not just "free cancellation" | Vague policy text |
| Filters with counts | Booking.com, Agoda | Counts per filter value from the API facet query | Filters that lead to zero results without warning |
| Map view with price pins | Airbnb, Google Hotels | Split view on desktop, full-screen toggle on mobile; pins show total/night price | Map that hides the list on desktop |
| Review sub-scores | Booking.com (cleanliness, staff, location…) | 6 sub-scores, verified-stay only, owner reply | Unverified reviews |
| Couple-friendly / local ID filters | MMT, OYO (India) | First-class filters; shown as chips on cards | Hiding this in policy text |
| Extranet "rates & availability" grid | Booking.com extranet, eZee | Room type rows × dates columns; bulk edit drawer; works on phone with a day-list | Full PMS complexity |
| Instant payout visibility | Airbnb host | Payout timeline per booking (paid → in transit → settled) | Monthly statements only |

---

## 3. Business development strategy

### 3.1 Target audience

**Guests (demand side)**

| Segment | Need | What Rentra offers | Priority |
| --- | --- | --- | --- |
| Business travellers to Surat/Ahmedabad (diamond, textile, GIDC, IT) | Clean room near work, GST invoice, early check-in | Landmark search ("near Diamond Bourse"), GST invoice at checkout, early check-in info | **High** |
| Families on weekend / festival trips | Family rooms, veg food, safety | Family-friendly, veg/Jain food filters, extra-bed pricing | **High** |
| Couples | Couple-friendly hotels with local ID acceptance | Clear couple-friendly and local-ID badges | **High** |
| Pilgrims (Dwarka, Somnath, Ambaji, Palitana) | Budget rooms near temple, Dharamshala-like | Distance to temple, budget filter | Medium (V1.1 cities) |
| Leisure / tourist circuits (Statue of Unity, Saputara, Gir, Diu) | Resorts with packages | Resort type, meal plans (MAP/AP) | Medium |
| Existing Rentra farmhouse customers | One account for every trip | Cross-sell on booking confirmations | **High** (lowest CAC) |
| Wedding / event guests (blocks of rooms) | 5–20 rooms on same dates | Group request form | V2 |

**Supply side (hotels)**

| Segment | Typical size | Pain | Pitch |
| --- | --- | --- | --- |
| Independent budget & mid-scale hotels | 10–60 rooms | High OTA commissions, slow payouts, poor visibility | 10% commission, weekly payout, local marketing, free extranet |
| Boutique hotels & homestays | 4–20 rooms | No tech, no PMS | Phone-first extranet, photo shoot help |
| Resorts on tourist circuits | 20–100 rooms | Seasonal demand, weekday gaps | Weekday deals rail, packages (V1.1) |
| Small chains (2–10 properties) | 50–500 rooms | Multi-property management | Multi-property switcher (♻ owner portfolio), one payout account |

### 3.2 Revenue model

| Stream | MVP? | Details |
| --- | --- | --- |
| **Commission on room revenue** | **MVP** | % of room tariff (excluding GST). Launch 10% for first 12 months for founding partners; standard 12–15% afterwards; set per property in admin. |
| Guest convenience fee | Off at launch | Admin switch exists (♻ fee logic); turn on later only if margins require. Show it before payment if enabled. |
| Featured placement / "Sponsored" | V2 | Clearly labelled sponsored slot in results; flat fee or CPC. |
| Promotions co-funding | V1.1 | Hotel funds a deal (e.g. 10% off weekdays); Rentra boosts it in the deals rail. |
| Add-ons | V2 | Airport/station pickup, early check-in, decorations — Rentra takes a small margin. |
| SaaS (paid extranet / PMS-lite) | V2 | Optional monthly fee for housekeeping, POS, folio features. |

**Commission tiers (proposal)**

| Tier | Commission | Condition |
| --- | --- | --- |
| Founding partner | 10% | First 50 hotels per city, locked 12 months |
| Standard | 13% | Default |
| Preferred | 15% | Higher ranking boost + featured in deals; opt-in |
| Chain / volume | Negotiated (min 10%) | 5+ properties or 1,000+ room nights/year |

### 3.3 Unit economics (illustrative, to be validated in Phase 0)

| Item | Value | Note |
| --- | --- | --- |
| Average room rate (ADR), Surat mid-scale | ₹2,800/night | Assumption — validate with 20 hotel interviews |
| Average length of stay | 1.6 nights | Assumption |
| Average rooms per booking | 1.2 | Assumption |
| Booking value (room revenue) | ≈ ₹5,376 | 2,800 × 1.6 × 1.2 |
| Commission @ 10% | ≈ ₹538 | Rentra gross revenue per booking |
| Payment gateway cost (~2% of total incl. GST) | ≈ −₹113 | Check your Razorpay plan |
| Cancellation/refund leakage | ≈ −₹25 | Gateway fees not refunded on cancellations |
| **Contribution per booking** | **≈ ₹400** | Before marketing |
| Target blended CAC | ≤ ₹250 | Payback on first booking; repeat bookings are profit |

### 3.4 Tax and compliance notes (India) — confirm with a CA before launch

- **GST on hotel rooms**: since the September 2025 GST rate rationalisation, rooms with a tariff up to ₹7,500 per unit per night attract 5% (without input tax credit) and above ₹7,500 attract 18%. The rate is decided **per room per night on the actual tariff charged**. The tax engine must use the per-night price, not the average.
- **E-commerce operator (ECO) rules**: when a hotel is GST-registered, it charges GST and Rentra collects **TCS under section 52 (currently 0.5%)** on net taxable supplies. When the hotel is **not GST-registered**, section 9(5) can make Rentra liable to pay the GST on that accommodation. The onboarding wizard must capture GSTIN (or an explicit "not registered" declaration) because it changes who pays tax.
- **Income tax TDS under section 194-O** (currently 0.1%) on the gross amount paid to the hotel. ♻ The existing `payout` table already has `tds_194o` and `gst_tcs` columns.
- **Commission invoice**: Rentra invoices the hotel for commission + 18% GST every payout cycle.
- **Guest invoice**: the booking confirmation must contain the hotel's legal name, GSTIN, room tariff, tax rate and amount. Business guests can enter their GSTIN at checkout so the hotel invoice carries it.
- **Guest ID / Form C**: hotels are legally responsible for guest ID checks and Form C for foreign nationals. Rentra collects names and phone only; ID upload is not stored by Rentra in MVP (privacy and liability).
- **Consumer protection / DPDP Act 2023**: total price shown up-front, no dark patterns, consent for marketing messages, data-deletion requests (♻ `customer_privacy_request`).

### 3.5 Hotel onboarding (supply acquisition) strategy

**Goal for launch:** 40 live, verified hotels in Surat with at least 600 rooms, across budget (≤₹2,000), mid (₹2,000–5,000) and upper-mid (₹5,000+), before public launch.

| Step | Activity | Owner | Tooling |
| --- | --- | --- | --- |
| 1 | Build a lead list: Google Maps scrape (manual), existing OTA listings in Surat, hotel associations (e.g., Surat hotel & restaurant association), Rentra farmhouse owners who also own hotels | BD | Google Sheet → admin CRM later |
| 2 | Segment: A (30–80 rooms, 3.8+ Google rating), B (10–30 rooms), C (homestays) | BD | — |
| 3 | Field visit with a 1-page pitch and a 2-minute demo of the owner app on a phone | BD | Demo account on partner portal |
| 4 | "Founding partner" offer: 10% for 12 months, free professional photo shoot for the first 20 hotels, top placement during launch month | BD + owner | — |
| 5 | Assisted onboarding: BD fills the wizard with the owner (target 25 minutes) | BD | Owner wizard "assisted" mode |
| 6 | Verification visit + photo shoot, test booking with ₹1 refund | Ops | ♻ `verification_visit` |
| 7 | Go live in `partners` status (hotel can see their listing; public cannot) | Admin | ♻ vertical status |
| 8 | Weekly check-in for first 4 weeks: inventory updated? bookings honoured? | Account manager | Admin hotel health score |

**Objection handling**

| Objection | Answer |
| --- | --- |
| "We already are on MMT/Booking." | Rentra is an additional channel at lower commission; you control how many rooms you give us (allotment). |
| "Overbooking risk." | You set rooms per night. One tap "Close today" on phone. Channel manager link in V1.1. |
| "Payment delays." | Weekly payouts after guest check-in, with a statement per booking. |
| "Who handles complaints?" | Rentra support first line; disputes have a defined process (§6). |

### 3.6 Marketing and customer acquisition

| Channel | Phase | Tactics | KPI |
| --- | --- | --- | --- |
| Existing Rentra users | Launch | Hotels tab in header, cross-sell card on farmhouse confirmation ("Need a hotel in the city?"), push/WhatsApp to opted-in users | Hotel bookings from existing users |
| SEO | From MVP | Server-rendered pages: `/hotels/surat`, `/hotels/surat/adajan`, `/hotels/near/surat-railway-station`, `/hotels/surat/couple-friendly`; JSON-LD `Hotel` + `AggregateRating` (real reviews only) | Organic sessions, ranking |
| Google Hotel Ads / Free booking links | V1.1 | Requires a price feed (ARI). Free booking links give free clicks | CPA, ROAS |
| Google Ads (search) | Launch | Long-tail local intent: "couple friendly hotel in surat", "hotel near diamond bourse" | CPA ≤ ₹250 |
| Instagram / Reels | Launch | Hotel room tours, "₹1,999 stays in Surat" series, influencer stays | Followers, link clicks |
| WhatsApp | Launch | Booking confirmations, pre-arrival directions, review request (♻ WhatsApp float, notification outbox) | Review rate |
| B2B / corporate | V1.1 | Surat diamond & textile firms, GIDC companies: corporate account with GST profile and monthly statement | Corporate accounts |
| Referral | V1.1 | ₹200 credit for both after first stay | Referral share |
| Partnerships | V2 | Event organisers (weddings, expos at SIECC), colleges (parents' visits) | Group bookings |

**Launch campaign:** "Stay local, pay less" — 2 weeks before launch, 40 founding hotels, launch offer funded 50/50 (Rentra pays its half from commission).

### 3.7 Success metrics (first 6 months)

| Metric | Month 1 | Month 3 | Month 6 |
| --- | --- | --- | --- |
| Live verified hotels | 40 | 120 | 300 (4 cities) |
| Room nights booked / month | 300 | 1,500 | 6,000 |
| Search → booking conversion | 1.0% | 1.8% | 2.5% |
| Hotel-caused cancellations (overbooking) | < 1% | < 0.5% | < 0.5% |
| Guest rating of Rentra support | ≥ 4.3 | ≥ 4.5 | ≥ 4.5 |
| Repeat booking rate (90 days) | — | 15% | 25% |

---

## 4. Customer experience

### 4.1 Information architecture

```
Rentra (public)
├── /                         Farmhouse home (existing)
├── /entertainment            Entertainment home (existing)
├── /hotels                   Hotels home  [MVP]
│   ├── /hotels/{city}                      City landing (SEO) + results
│   ├── /hotels/{city}/{area}               Area landing (SEO)
│   ├── /hotels/near/{landmark}             Landmark landing (SEO)
│   └── /hotels/{city}/{collection}         couple-friendly, budget, resorts… (SEO)
├── /search?vertical=hotel&…  Results: list + map  [MVP]
├── /stay/{hotel-slug}        Hotel detail + room selection  [MVP]
├── /checkout/{order}         Guest details → review → pay  [MVP] (♻ checkout shell)
├── /bookings                 My trips (all verticals) (♻)
│   └── /bookings/{ref}       Booking detail, invoice, cancel, directions, review
├── /saved                    Saved places (♻, now includes hotels)
└── /account                  Profile, GST profiles [V1.1], privacy (♻)
```

Header: vertical tabs **Farmhouse · Entertainment · Hotels** (♻ vertical tabs component — renders one tab per public vertical; no new nav component needed).

### 4.2 Core customer journey

```
 Discover           Compare              Decide                 Pay              Stay             After
┌────────┐   ┌──────────────────┐   ┌──────────────────┐   ┌───────────┐   ┌────────────┐   ┌──────────┐
│Hotels  │──▶│Results list/map  │──▶│Hotel page        │──▶│Checkout   │──▶│Confirmation│──▶│Review    │
│home or │   │filters, sort,    │   │rooms × plans,    │   │guest info,│   │WhatsApp +  │   │Rebook    │
│SEO page│   │total price cards │   │policies, reviews │   │GST, pay   │   │email, PDF  │   │Support   │
└────────┘   └──────────────────┘   └──────────────────┘   └───────────┘   └────────────┘   └──────────┘
                     ▲  saved / shared link                     │ quote expired → "Prices changed" banner
                     └──────────────────────────────────────────┘
```

### 4.3 Hotel discovery — Hotels home [MVP]

Mirrors the approved home skeleton so all three verticals feel like one product.

1. **Hero** with real hotel photography (licensed fallback until 3 hotels have photos).
2. **Search pill:** *Where* (city / area / landmark / hotel name) · *Check-in – Check-out* (one range calendar, nights count shown) · *Rooms & guests* (stepper per room: adults, children + child ages).
3. **Quick chips:** Tonight · This weekend · Couple-friendly · Under ₹2,000 · With breakfast · Pool.
4. **Trust strip (true statements only):** Verified properties · Price incl. taxes · Free cancellation on most rooms · 24×7 WhatsApp support (only if staffed).
5. **Rails:** "Stays in {City}" · "Weekday deals" [V1.1] · "Near {landmark}" · "Recently viewed" [V1.1].
6. **Browse by type tiles:** Hotels · Resorts · Boutique · Homestays · Business hotels.
7. **City chips** → `/hotels/{city}`.
8. **Owner CTA:** "Own a hotel? List with 10% commission" → partner signup with `vertical=hotel`.

### 4.4 Search and filters [MVP]

**Search input rules**

| Field | Behaviour |
| --- | --- |
| Where | Autocomplete with groups: Cities, Areas, Landmarks, Hotels. Debounce 200 ms. Recent searches on focus. Landmark → radius search (default 5 km). |
| Dates | Range picker, min 1 night, max 30 nights (MVP). Past dates disabled. Shows "2 nights". On mobile: full-screen sheet with a sticky "Apply" button. |
| Rooms & guests | Default 1 room, 2 adults. Max 8 rooms, 6 guests per room in UI (hotel rules apply). Child age is required (0–17) because hotel child policies depend on it. |
| No dates entered | Results still show with "from ₹X / night" and a nudge "Add dates for exact prices". |

**Filters** (counts shown next to each value; values with 0 results are disabled, not hidden)

| Group | Values | MVP |
| --- | --- | --- |
| Price per night | Slider with histogram + quick buckets (< ₹2k, 2–4k, 4–7.5k, 7.5k+) | ✔ |
| Guest rating | 4.5+, 4+, 3.5+ | ✔ |
| Property type | Hotel, Resort, Boutique, Homestay, Hostel [V2] | ✔ |
| Star category | 1–5 (only if declared and verified) | ✔ |
| Free cancellation | Toggle | ✔ |
| Meal plan | Breakfast included, All meals | ✔ |
| Policies (India-specific) | Couple-friendly, Local ID accepted, Pets allowed, Unmarried couples allowed (explicit wording owner-approved) | ✔ |
| Amenities | Wi-Fi, AC, Parking, Pool, Restaurant, Gym, Spa, Lift, Power backup, 24h front desk, Room service, EV charging | ✔ |
| Food | Pure veg kitchen, Jain food on request | ✔ |
| Distance | From landmark / city centre: 1, 3, 5, 10 km | ✔ |
| Accessibility | Step-free entrance, Accessible bathroom | V1.1 |
| Pay at hotel | Toggle | V1.1 |

**Sort:** Recommended (default) · Price low→high · Price high→low · Guest rating · Distance (when a landmark/area is searched).

**Recommended ranking (MVP, explainable formula)** — score =
`0.35 × conversion score + 0.25 × review score (Bayesian) + 0.15 × listing quality (photos, completeness) + 0.15 × price competitiveness in area + 0.10 × reliability (no hotel cancellations)`.
Sponsored placements (V2) are separate, labelled slots and never change this score.

**Results list card (desktop + mobile)**

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ┌────────────────┐  The Riverside Residency                    ♡  Save   │
│ │                │  ★ 4.4 Very good · 212 reviews · Hotel ★★★            │
│ │   photo        │  📍 Adajan, Surat · 1.2 km from Riverfront             │
│ │   carousel ●○○ │  🛏 Deluxe Double · 1 king bed                         │
│ │                │  ✅ Free cancellation until 18 Nov   ☕ Breakfast incl. │
│ └────────────────┘  💑 Couple-friendly   🪪 Local ID OK                   │
│                                              2 nights, 2 adults           │
│  Only 2 rooms left at this price               ₹6,840                     │
│                                              incl. taxes   [ See rooms › ]│
└───────────────────────────────────────────────────────────────────────────┘
```

Rules: price = cheapest available plan for the searched dates/guests, total incl. taxes; "rooms left" only when real allotment remaining ≤ 3; badges max 3, the rest in the hotel page.

**Results page layout**

```
Desktop ≥1024px                                         Mobile <768px
┌──────────────────────────────────────────────────┐   ┌──────────────────────┐
│ Logo  Farmhouse  Entertainment  [Hotels]   👤    │   │ ‹ Surat · 18–20 Nov  │
├──────────────────────────────────────────────────┤   │   1 room · 2 guests ✎│
│ [Surat ▾][18 Nov – 20 Nov][1 room, 2 guests][🔍] │   ├──────────────────────┤
├────────────┬───────────────────────┬─────────────┤   │[⚙ Filters 3][↕ Sort] │
│ FILTERS    │ 86 stays in Surat     │             │   │[Couple✓][Breakfast]→ │
│ Price ▂▃▅▇ │ Sort: Recommended ▾   │   MAP       │   ├──────────────────────┤
│ Rating     │ ┌──card──────────────┐│  ₹3,420●    │   │ ┌──────────────────┐ │
│ Type       │ └────────────────────┘│     ●₹2,100 │   │ │ photo            │ │
│ Free canc. │ ┌──card──────────────┐│ ●₹6,840     │   │ ├──────────────────┤ │
│ Meals      │ └────────────────────┘│             │   │ │ Name ★4.4        │ │
│ Policies   │ ┌──card──────────────┐│ [Search as  │   │ │ ₹6,840 incl. tax │ │
│ Amenities  │ └────────────────────┘│  I move ☐]  │   │ └──────────────────┘ │
│ …          │ [ Load more ]         │             │   │      [ 🗺 Map ]      │
└────────────┴───────────────────────┴─────────────┘   └──────────────────────┘
```

Behaviour: filters update the URL (shareable, back button works); list updates without full reload; map pins highlight when hovering a card and vice versa; on mobile the floating "Map" button toggles a full-screen map with a bottom card carousel.

### 4.5 Hotel details page `/stay/{slug}` [MVP]

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ‹ Back to results                                     ⤴ Share   ♡ Save   │
│ ┌───────────────────────────┬─────────────┬─────────────┐                 │
│ │                           │   photo 2   │   photo 3   │                 │
│ │        hero photo         ├─────────────┼─────────────┤                 │
│ │                           │   photo 4   │ +24 photos  │                 │
│ └───────────────────────────┴─────────────┴─────────────┘                 │
│ The Riverside Residency   ★★★ Hotel   ✔ Verified by Rentra (Oct 2026)     │
│ ★ 4.4 Very good · 212 reviews · 📍 Adajan, Surat · Show on map            │
├──────────────────────────────────────────────┬────────────────────────────┤
│ [Overview] [Rooms] [Amenities] [Policies]    │  STICKY BOOKING RAIL       │
│ [Reviews] [Location]   ← sticky section nav  │  18 Nov → 20 Nov · 2 nights│
│                                              │  1 room · 2 adults    ✎    │
│ Highlights: 🅿 Free parking ☕ Breakfast      │  ───────────────────────── │
│ 🏊 Pool  🛎 24h desk  ⚡ Power backup          │  Selected: 1 × Deluxe     │
│                                              │  Breakfast · Free canc.    │
│ ROOMS (see 4.6)                              │  ₹6,840 incl. taxes        │
│                                              │  [   Reserve   ]           │
│ About · Amenities (grouped, icon grid)        │  You won't be charged yet  │
│ Policies: Check-in 12:00 · Check-out 11:00   │  until you confirm & pay   │
│ Children, extra beds, ID, couples, pets      │                            │
│ Reviews: score bars ×6, filters, list        │                            │
│ Location: map, nearby landmarks with km      │                            │
│ Host/Hotel info: response, languages, GSTIN  │                            │
└──────────────────────────────────────────────┴────────────────────────────┘
Mobile: gallery swipe → facts → sticky bottom bar "₹6,840 for 2 nights · Select rooms"
```

**Content blocks and data rules**

| Block | Content | Rule |
| --- | --- | --- |
| Gallery | Min 8 photos at publish; categories (Exterior, Lobby, Rooms, Bathroom, Dining, Amenities) | Lightbox with category tabs; images via Cloudinary (♻) with responsive `srcset` |
| Facts row | Property type, stars, check-in/out times, total rooms, year renovated | Only declared fields |
| Verified badge | "Verified by Rentra" + month | Only when `verified_at` is set (♻) |
| Amenities | Grouped icon grid, top 8 + "Show all 32" | From ♻ `amenity` + `amenity_vertical` |
| Policies | Check-in/out, early/late, children & extra beds, ID, couples, pets, smoking, payment, cancellation per plan | Plain sentences; the cancellation text is generated from the structured rules so it is always correct |
| Reviews | Overall + 6 sub-scores, traveller type filter, sort, owner replies | Verified stays only |
| Location | Map, address after booking (exact) / area before booking (♻ `exact_address` hiding pattern) — for hotels the full address may be public; owner chooses | Nearby landmarks with distances |

### 4.6 Room selection and availability [MVP]

Each room type is a card; each rate plan is a row inside the card. Works the same on desktop and phone (no side-scrolling table).

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ┌──────────┐ Deluxe Double Room                         Only 3 left       │
│ │  photo   │ 🛏 1 King bed · 📐 24 m² · 👥 Max 3 · 🏙 City view · ❄ AC   │
│ │  ●○○○    │ Wi-Fi · TV · Kettle · Rain shower           Room details ›   │
│ └──────────┘                                                              │
│ ┌───────────────────────────────────────────────────────────────────────┐ │
│ │ Room only                       ₹2,600/night   ₹5,460 total  [ − 0 + ]│ │
│ │ ✅ Free cancellation until 16 Nov, 12:00         incl. ₹260 tax        │ │
│ ├───────────────────────────────────────────────────────────────────────┤ │
│ │ ★ Breakfast included   Popular  ₹3,100/night   ₹6,510 total  [ − 1 + ]│ │
│ │ ✅ Free cancellation until 16 Nov, 12:00                               │ │
│ ├───────────────────────────────────────────────────────────────────────┤ │
│ │ Non-refundable · Save 10%       ₹2,340/night   ₹4,914 total  [ − 0 + ]│ │
│ │ ⚠ No refund after booking                                             │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
```

**Rules**

- Prices come from the server **quote** (♻ `booking_quote` pattern: versioned, hashed, expires in 15 minutes). The UI never computes the final price.
- Room count stepper max = min(available rooms for *every* night, 8). Unavailable plans show "Sold out for your dates" with the next available date as a link.
- Occupancy: if selected rooms × max occupancy < guests, show inline message "Add 1 more room for 5 guests" and disable Reserve.
- Min-stay / closed-to-arrival restrictions show the reason: "Minimum 2 nights on Saturdays".
- Changing dates or guests keeps the scroll position and re-fetches availability (skeleton on price cells only).
- Multi-room selection across room types is allowed (e.g., 1 Deluxe + 1 Family room); the rail lists each line.

### 4.7 Booking and checkout [MVP] (♻ checkout shell, order, hold, payment)

```
Step 1  Guest details          Step 2  Review & pay                       Done
┌──────────────────────────┐  ┌─────────────────────────────────────┐  ┌──────────────┐
│ Primary guest name *     │  │ The Riverside Residency             │  │ ✔ Booked!    │
│ Mobile * (+91, OTP'd ✓)  │  │ 18 Nov (Wed) → 20 Nov (Fri) 2 nights│  │ Ref RS-8K2QX │
│ Email (for invoice)      │  │ 1 × Deluxe · Breakfast · 2 adults   │  │ Check-in     │
│ Guest name per room      │  │ ─────────────────────────────────── │  │ 18 Nov 12:00 │
│ Arrival time ▾ (approx)  │  │ Room 2 nights        ₹6,200         │  │ [Directions] │
│ Special requests (text)  │  │ GST 5%                 ₹310         │  │ [Invoice PDF]│
│ ☐ Business trip:         │  │ Total               ₹6,510          │  │ [Add to cal] │
│   GSTIN + company name   │  │ ─────────────────────────────────── │  │ WhatsApp ✓   │
│                          │  │ ✅ Free cancellation until 16 Nov   │  └──────────────┘
│ [ Continue ]             │  │ Pay now ₹6,510                      │
└──────────────────────────┘  │ ☐ I agree to hotel & Rentra policies│
                              │ [ Pay ₹6,510 securely ]  Razorpay   │
                              │ ⏱ Rooms held for 14:32              │
                              └─────────────────────────────────────┘
```

**Flow and states**

1. **Reserve** → `POST /hotel/orders` creates a `booking_order` in `held` state and holds inventory for every night (15-minute hold). Login (♻ OTP) is required before this step; the selection survives login.
2. **Guest details** autofill from profile. Child ages carried from search.
3. **Review & pay** shows the quote breakdown (room per night list expandable, tax per night slab, discounts). Hold countdown visible; at 2 minutes left a banner offers "Keep holding" (extends once).
4. **Payment** via Razorpay Checkout (UPI, cards, netbanking, wallets). Webhook confirms (♻ `payment_event` + jobs). Order → `confirmed`, inventory `held → sold`.
5. **Confirmation** page + WhatsApp + email with PDF voucher (hotel GST invoice details) and `.ics`.

**Edge cases**

| Case | Handling |
| --- | --- |
| Price or availability changed between search and Reserve | Quote mismatch → banner "Prices changed for your dates" with old vs new, user re-confirms |
| Hold expired before payment | Banner "Your hold expired" → "Check availability again" (re-quote, keep details) |
| Payment captured after hold expired, room now sold out | Auto-refund in full + apology + alternative hotels list; alert admin (should be rare because webhook + hold extension) |
| Payment pending (UPI) | "Waiting for your bank" state, poll + webhook; hold extended to 30 min while pending |
| Double tap on Pay | Idempotency key on order (♻ `idempotency_key`) |
| Hotel closes inventory during checkout | Held rooms are protected; close-out applies to remaining rooms only |

### 4.8 Payments [MVP]

- **Methods:** UPI (intent on mobile, QR on desktop), cards, netbanking, wallets via Razorpay. Saved cards via Razorpay tokenisation only (♻ `customer_payment_method`). Rentra never stores card data.
- **Prepaid full amount** in MVP. Display "Pay now ₹X". V1.1 adds **Pay at hotel** (hotel-level setting, card/UPI-autopay mandate or ₹500 deposit) and **Part pay** (e.g. 25% now).
- **Invoices:** booking voucher (all bookings) + tax invoice issued in the hotel's name (Rentra generates the PDF on the hotel's behalf when the hotel opts in) + Rentra invoice for any convenience fee.

### 4.9 Cancellations, modifications and refunds [MVP]

**Policy model** — each rate plan has structured rules; text is generated from rules:

| Template | Rule | Guest text |
| --- | --- | --- |
| Flexible | Free until 24 h before check-in time; then first night charged | "Free cancellation until 17 Nov, 12:00" |
| Moderate | Free until 72 h before; then first night charged | — |
| Strict | Free until 7 days before; then the full stay is charged | — |
| Non-refundable | Never free; full stay charged (cheaper rate) | "Non-refundable" |
| No-show | First night (or full stay for non-refundable) | Shown under policy |

**Self-serve cancel** (`/bookings/{ref}` → Cancel): show refund amount *before* confirming ("You'll get ₹6,510 back to your UPI in 5–7 working days"), reason picker, confirm. Refund goes through ♻ `refund` / `refund_execution`. Inventory released instantly.

**Hotel-initiated cancellation** (overbooking): guest gets full refund + Rentra offers relocation to a similar or better hotel; the hotel is charged the price difference (contract term) and its reliability score drops.

**Modifications:** MVP = cancel and rebook (if free cancellation). V1.1 = change dates/room with re-quote and difference payment or refund.

### 4.10 Booking management — My trips [MVP] (♻ `/bookings`)

```
┌────────────────────────────────────────────────────────────┐
│ My trips     [Upcoming 2] [Past 9] [Cancelled 1]           │
├────────────────────────────────────────────────────────────┤
│ 🏨 The Riverside Residency          Confirmed ●            │
│    18–20 Nov · 1 room · 2 adults    RS-8K2QX               │
│    [Directions] [Call hotel] [Invoice] [Manage ›]          │
├────────────────────────────────────────────────────────────┤
│ 🌳 Green Acres Farmhouse            Completed              │
│    02 Nov · Day visit               FH-2M9PL  [Review ★]   │
└────────────────────────────────────────────────────────────┘
```

Booking detail: status timeline (Booked → Paid → Check-in day → Stayed → Reviewed), rooms and guests, price breakdown, policy with live "free until" countdown, cancel/modify, support & dispute (♻), invoice download, hotel contact (revealed after confirmation), add to calendar, rebook.

### 4.11 Reviews [MVP] (♻ `review`, `review_report`)

- Only guests with a `completed` stay can review, from check-out until 30 days after.
- Request sent 2 hours after check-out time by WhatsApp/email; reminder at day 5.
- Form: overall (1–5 stars mapped to a 10-point display: 1★=2 … 5★=10), six sub-scores (Cleanliness, Staff, Location, Comfort, Value, Facilities), traveller type (Business, Couple, Family, Friends, Solo), text (optional, 20–2,000 chars), photos (V1.1).
- Hotel can reply once publicly (editable 48 h). Guest can report; admin moderates.
- Display: score bars, "Couples rated it 4.6", search within reviews (V1.1). Review scores use a Bayesian average for ranking so 1 review ≠ 5.0 best hotel.

### 4.12 Notifications to guests [MVP] (♻ `notification_outbox`)

| Trigger | Channel | Content |
| --- | --- | --- |
| Booking confirmed | WhatsApp, email, in-app | Voucher, invoice, map link |
| Payment failed / pending | In-app, SMS | Retry link before hold expires |
| 24 h before check-in | WhatsApp | Directions, check-in time, hotel phone, ID reminder |
| Free-cancellation deadline in 24 h | Email (opt-in) | "Your free cancellation ends tomorrow" |
| Cancelled / refunded | WhatsApp, email | Amount, method, timeline |
| Review request | WhatsApp | Link to review |

---

## 5. Hotel owner experience (extranet)

The extranet lives in the existing partner portal (♻ `/partner`), with hotel-specific screens when the property's vertical is `hotel`. Roles (♻ `client_staff`, `staff_property`): **Owner** (everything), **Manager** (all but payouts/bank), **Front desk** (reservations, arrivals, close-outs), **Accounts** (payouts, invoices, read-only bookings).

### 5.1 Owner navigation

```
Desktop sidebar                 Mobile bottom bar (front-desk first)
┌────────────────────────┐      ┌──────┬──────┬──────┬──────┬──────┐
│ 🏨 Riverside Residency▾│      │ ☀    │ 📅   │ 🧾   │ 🏨   │ ☰    │
│ ☀ Today                │      │Today │Rates │Bookng│Proprt│More  │
│ 📅 Rates & rooms       │      └──────┴──────┴──────┴──────┴──────┘
│ 🧾 Bookings            │
│ 🏨 Property            │   (rooms, plans, content, policies)
│ ⭐ Reviews             │
│ 💰 Earnings            │   (payouts, invoices, analytics)
│ 👥 Team                │
│ 🆘 Help                │
│ ⚙ Settings             │
└────────────────────────┘
Labels follow DESIGN.md owner vocabulary (Phase 1 decision P1-3).
```

### 5.2 Onboarding wizard [MVP] (♻ owner onboarding + property drafts, migrations 0057–0058)

Target: a 30-room hotel completes it in **≤ 30 minutes**; progress autosaves; BD can fill it in "assisted" mode.

| Step | Fields | Validation |
| --- | --- | --- |
| 1. Account | Name, mobile (OTP), email, role (owner/manager), business type (proprietor, partnership, company) | Phone unique |
| 2. Property basics | Property name, type (hotel/resort/boutique/homestay), star category (optional), year built/renovated, total rooms, languages, description (AI-assisted draft V1.1) | Name 3–80 chars |
| 3. Location | Address, city/area (♻ `city`, `area`), map pin drag, landmark distances (auto-calculated), "Show exact address publicly?" | Pin inside the selected city boundary |
| 4. Photos | Min 8, max 80, drag-to-order, category tags, cover photo | Min resolution 1200×800, no watermarks/collages (manual check) |
| 5. Amenities | Property amenities (grouped checkboxes), food (veg/Jain), parking, accessibility | — |
| 6. Room types | For each: name (template list: Standard, Deluxe, Super Deluxe, Suite, Family…), bed configuration, size, view, max adults/children/total, base occupancy, number of rooms, room amenities, photos (min 2), smoking | Sum of room counts ≤ total rooms |
| 7. Rates & plans | Base plan per room: weekday & weekend rate (for base occupancy), extra adult/child charge, extra bed; add-ons: "+ Breakfast plan (+₹X per person/night)", "+ Non-refundable (−Y%)"; cancellation template | Rate ₹300–₹2,00,000; live tax preview: "Guest pays ₹2,730 (incl. 5% GST)" |
| 8. Policies | Check-in/out times, early/late check-in, child policy (free under age X), ID types accepted, couples, local ID, pets, smoking, house rules | — |
| 9. Legal, tax & payouts | Legal entity name, PAN, GSTIN or "not registered" declaration, bank account (penny-drop verified), cancelled cheque / bank proof; trade licence / Gumasta / hotel registration, ownership or lease proof; police/NOC docs optional | PAN/GSTIN format + GSTIN online check (V1.1); IFSC lookup |
| 10. Contract & submit | Commission tier shown, partner agreement e-sign (checkbox + OTP), preview listing | All required steps complete |

Completion meter (♻ `listing-strength`): "Your listing is 80% complete — add 4 more photos to rank higher".

### 5.3 Property verification [MVP] (♻ `listing_submission`, `listing_review`, `verification_visit`, `document`)

```
Draft ──submit──▶ Pending review ──docs OK──▶ Pending verification ──visit/video OK──▶ Approved (partners) ──launch──▶ Live
   ▲                    │ changes requested                 │ failed                                          │
   └────────────────────┴───────────────────────────────────┘◀──────────────────────── paused / suspended ◀──┘
```

Checks: documents match legal name; GSTIN matches PAN; photos match reality (video call walkthrough or field visit with geo-tag); a test booking call to the front desk; bank penny-drop. SLA: review within 2 working days. Owner sees each check's status and the exact reason for "changes requested".

### 5.4 Today (front-desk dashboard) [MVP]

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Good morning, Riverside Residency                   Wed 18 Nov  [Close ▾] │
├────────────┬────────────┬────────────┬────────────┬──────────────────────┤
│ Arrivals 6 │ Departures4│ In-house 14│ Occupancy  │ Rentra revenue (MTD) │
│            │            │            │ 72% tonight│ ₹1,42,300            │
├────────────┴────────────┴────────────┴────────────┴──────────────────────┤
│ ⚠ Action needed                                                          │
│  • 2 reviews waiting for a reply                                          │
│  • Deluxe has 0 rooms open on 21–22 Nov (weekend) — open more?  [Open]   │
├───────────────────────────────────────────────────────────────────────────┤
│ Arrivals today                                                            │
│  RS-8K2QX  Priya Shah    1× Deluxe+BF  2A   ETA 14:00  Paid  [Check in ✓]│
│  RS-4HT7Z  Amit Patel    2× Standard   4A   ETA —      Paid  [No-show ✕] │
│ Departures today / In-house  (tabs)                                       │
└───────────────────────────────────────────────────────────────────────────┘
```

Actions: **Check in** (marks stay started; unlocks payout eligibility), **No-show** (available from check-in time + 6 h; applies no-show policy, guest notified with 12-hour dispute window), **Call guest** (masked number V1.1), **Quick close** (stop-sell a room type for tonight).

### 5.5 Rooms and rate plans management [MVP]

- Room type list with photos, room count, occupancy, status (active/hidden), drag to reorder.
- Rate plan editor: base plan (own prices) or **derived plan** (± % or ± ₹ from base, e.g. "Breakfast +₹350/person", "Non-refundable −10%"); meal plan (EP/CP/MAP/AP); cancellation template; min/max stay; booking window (e.g., only bookable 1–90 days ahead).
- Child and extra-bed pricing per room type.
- Changes are versioned; existing bookings keep their policy snapshot (♻ `policy_snapshot`).

### 5.6 Rates & availability calendar [MVP]

The most-used owner screen. Desktop: grid. Phone: list per day.

```
Desktop grid                                                    [◀ Nov 2026 ▶] [Bulk edit]
┌────────────────────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│                    │Wed 18│Thu 19│Fri 20│Sat 21│Sun 22│Mon 23│Tue 24│
├────────────────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ DELUXE (12 rooms)  │      │      │      │      │      │      │      │
│  Rooms to sell     │  5   │  6   │  4   │  0 🔒│  2   │  8   │  8   │
│  Booked            │  7   │  6   │  8   │ 12   │ 10   │  4   │  4   │
│  Room only  ₹      │2,600 │2,600 │2,900 │3,400 │3,400 │2,600 │2,600 │
│  Breakfast  ₹      │ auto │ auto │ auto │ auto │ auto │ auto │ auto │
│  Min stay          │  1   │  1   │  1   │  2   │  1   │  1   │  1   │
│  Status            │ Open │ Open │ Open │Closed│ Open │ Open │ Open │
├────────────────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ STANDARD (16)      │ …    │      │      │      │      │      │      │
└────────────────────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘
Cell edit: click → inline input → Enter saves (optimistic, rolls back on error with toast).
Drag across cells → bulk edit drawer.

Bulk edit drawer
┌──────────────────────────────────────────┐
│ Dates: 1 Dec → 31 Dec  Days: ☑M ☑T … ☑S │
│ Room types: ☑ Deluxe ☐ Standard          │
│ ○ Set rate ₹ [ 3,200 ]  ○ Change by % [ ]│
│ ○ Rooms to sell [  ]   ○ Close  ○ Open   │
│ ○ Min stay [ ]   ☐ Closed to arrival     │
│ Preview: 62 cells change     [ Apply ]   │
└──────────────────────────────────────────┘
```

Rules: "Rooms to sell" cannot go below rooms already booked for that night (validation message shows the booked count). Weekend = Fri–Sat nights by default (owner-configurable). Holiday presets for Diwali, Navratri, Uttarayan, Christmas/New Year (one-tap "+20%").

### 5.7 Bookings (reservations) [MVP]

- List with filters: status (upcoming, in-house, completed, cancelled, no-show), date type (booked on / check-in / check-out), room type, search by ref/name/phone.
- Reservation detail: guest, rooms, nights, price breakdown, commission, net payout, policy snapshot, timeline, notes (internal), actions (check-in, no-show, cancel with reason → relocation flow, message guest).
- Export CSV (♻ exports) and printable arrivals sheet.
- Real-time: new booking → push/WhatsApp to owner + sound on open Today screen (SSE or polling every 30 s in MVP).

### 5.8 Payments and payouts [MVP] (♻ `payout`, `payout_destination`, `payment_allocation`)

- **Payout rule:** booking becomes payable after check-in is marked (or automatically 24 h after check-in time if not marked as no-show). Weekly payout run every Tuesday for all payable bookings; statements per payout.
- **Statement line:** booking ref, stay dates, room revenue, GST collected, commission (+18% GST on commission), TCS 0.5%, TDS 194-O 0.1%, net.
- **Payout timeline per booking:** Paid by guest → Stay started → Payable → In payout #P-0045 → Settled (UTR shown).
- **Invoices:** monthly commission invoice download; GST reports (GSTR-8 support data for Rentra; hotel's own sales register export).
- V1.1: Razorpay Route linked accounts for automatic split; early payout option.

### 5.9 Analytics and dashboards [MVP basic → V1.1 full]

| Metric | MVP | V1.1 |
| --- | --- | --- |
| Bookings, room nights, revenue (gross, net) by period | ✔ | — |
| Occupancy on Rentra (sold / offered), ADR, RevPAR on Rentra inventory | ✔ | — |
| Listing views → hotel page → checkout → booked funnel | — | ✔ |
| Cancellations and no-shows by reason | ✔ | — |
| Review score trend, sub-scores | ✔ | — |
| Pace report (bookings on the books for next 30/60/90 days) | — | ✔ |
| Competitor price index (area average) | — | V2 |

Charts: one KPI row + one line chart + one table per tab. Avoid dashboard clutter.

### 5.10 Other owner features

- **Reviews:** list, filter by score, reply, report a review (♻).
- **Inbox:** booking messages with guests (MVP: templated messages + free text, masked contact; ♻ support threads). 
- **Team:** invite staff by phone with a role (♻ staff invitations).
- **Multi-property switcher** for chains (♻ owner portfolio).
- **Promotions** [V1.1]: early-bird, last-minute, long-stay (3+ nights −10%), mobile-only.
- **Channel manager connection** [V1.1–V2]: settings page to connect STAAH / eZee / AxisRooms etc.; when connected, rates & inventory become read-only in Rentra.

---

## 6. Admin experience

Built inside the existing capability-gated admin workspace (♻ admin people, booking, finance, operations, search workspaces). New items are marked.

| Area | Capabilities | MVP |
| --- | --- | --- |
| **Dashboard** | Today: new hotel applications, verification visits due, bookings, GMV, cancellations, open disputes, payouts due, overbooking alerts | ✔ (add hotel KPIs to ♻ admin dashboard) |
| **User management** | Customers, owners, staff; status (active, suspended), KYC state, sessions, privacy requests, audit log | ♻ |
| **Property approvals** (new hotel queue) | Queue sorted by SLA; side-by-side: submitted content, documents, GSTIN/PAN checks, photos with flags; actions: approve, request changes (per field), reject, schedule visit; checklist must be complete to approve | ✔ |
| **Hotel & room moderation** | Edit/hide content, take down photos, force-close inventory, pause property, set "Verified" | ✔ |
| **Booking management** | Search by ref/phone/email/hotel; full timeline; actions: resend voucher, cancel on behalf, override refund amount (with reason, ♻ `booking_price_override`), relocate guest, mark no-show dispute | ✔ (♻ booking workspace) |
| **Payments & refunds** | Payment attempts, webhook events, refund queue, failed refunds retry, reconciliation (♻ payment investigation) | ✔ |
| **Commissions** (new) | Default by vertical, overrides by city or property, tier, validity period; history; preview impact | ✔ |
| **Payouts** | Weekly run preview → approve → execute; holds (dispute, KYC); statements | ✔ ♻ |
| **Disputes** | Guest ↔ hotel cases: no room on arrival, room not as described, wrongful no-show, refund disagreement; evidence (♻ `dispute_attachment`), SLA timers, decision with refund/charge-back to payout | ✔ ♻ |
| **Reviews moderation** | Reported reviews, takedown rules, owner reply moderation | ✔ ♻ |
| **Platform settings** | Vertical status (hidden/partners/public), hold duration, max rooms/nights, cancellation templates, tax slabs table (effective dates), convenience fee switch, amenity catalogue for hotels, cities/areas/landmarks | ✔ |
| **Content & SEO** | City/area/landmark landing copy, collections ("Couple-friendly hotels in Surat"), banners (♻ content drafts/publications) | ✔ |
| **Analytics** | GMV, net revenue (take rate), bookings, room nights, conversion funnel, cancellation rate, overbooking rate, top hotels/cities, supply growth, cohort repeat rate | ✔ basic |
| **Hotel health score** (new) | Per hotel: inventory freshness, response, cancellations by hotel, review score, complaint rate → drives account-manager follow-up and ranking | V1.1 |
| **Fraud & risk** | Velocity rules (many bookings same card), suspicious no-show patterns, fake review detection | V1.1 |

**Admin approval screen (wireframe)**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Hotel applications  [Pending review 7] [Visit due 3] [Changes requested 4]   │
├───────────────────────────┬──────────────────────────────────────────────────┤
│ ● Riverside Residency 2d  │ Riverside Residency · Adajan, Surat · 32 rooms   │
│   Surat · 32 rooms · SLA ⚠│ [Content] [Rooms & rates] [Documents] [Checks]   │
│ ○ Hotel Sai Palace    1d  │ ┌─ Checks ─────────────────────────────────────┐ │
│ ○ Green Leaf Resort   4h  │ │ ✔ PAN matches legal name                     │ │
│                           │ │ ✔ GSTIN active, matches PAN                  │ │
│                           │ │ ✔ Bank penny-drop: name match 92%            │ │
│                           │ │ ○ Video walkthrough   [Schedule]             │ │
│                           │ │ ⚠ 3 photos look like stock images  [Review]  │ │
│                           │ └──────────────────────────────────────────────┘ │
│                           │ [Request changes] [Reject]        [Approve ▸]    │
└───────────────────────────┴──────────────────────────────────────────────────┘
```

---

## 7. UI/UX design system

### 7.1 Principles

1. **One Rentra, three verticals.** Hotels use the same Emerald & Champagne system (`Rentra/DESIGN.md`), header, cards, checkout and account. Only vocabulary, icons and a few hotel-specific components change.
2. **Price truth first.** Every price says what it covers: "₹6,840 · 2 nights · incl. taxes".
3. **Icons + short labels** over paragraphs; compact layouts that fit one laptop screen for owner/admin.
4. **Phone-first for guests and front desk**, desktop-dense for rate grids and admin.
5. **Every state designed:** loading, empty, error, sold-out, expired, permission-limited.

### 7.2 Color system (♻ existing tokens — no new brand colors)

| Role | Token | Hex | Use in hotels |
| --- | --- | --- | --- |
| Primary action | `brand-600` Emerald Ink | `#064E3B` | Reserve, Pay, Apply, primary buttons |
| Primary hover / deep | `brand-700` / `brand-900` | `#043D2E` / `#032D23` | Hover, owner sidebar, footer |
| Brand tint | `brand-50` / `brand-100` | `#ECF4EF` / `#DDECE3` | Selected filter chips, selected room plan row |
| Premium accent | `champagne` | `#F8E7C9` | "Popular", "Verified by Rentra", founding-partner badge |
| Page | `ink-25` | `#FAF9F6` | Page background |
| Surface | `ink-0` | `#FFFFFF` | Cards, forms, booking rail |
| Text | `ink-900` / `ink-500` | `#1F2924` / `#59655D` | Primary / secondary text |
| Dividers | `ink-200` | `#E1E5DE` | Card borders, table lines |
| Rating | `amber-500` | `#D98A1F` | Stars and score chips |
| Success | `success` on `success-bg` | `#14532D` / `#ECF5EE` | Free cancellation, Confirmed, Paid |
| Warning | `warning` on `warning-bg` | `#9A4D0A` / `#FFF4E5` | Only N left, Non-refundable, hold timer < 2 min |
| Danger | `danger` on `danger-bg` | `#B42318` / `#FEF3F2` | Sold out, Payment failed, Cancelled |
| Info | `info` on `info-bg` | `#1D4ED8` / `#EFF6FF` | Price changed, tips |
| Rate grid: closed cell | `ink-100` hatched | `#ECEEE8` | Stop-sell cells |
| Rate grid: overridden price | `event-adjustment` on `-bg` | `#6B3FA0` / `#F5F0FA` | Date overrides (♻ calendar convention) |

Dark mode: not in MVP for customer pages (matches current product); owner portal follows existing portal tokens.
Contrast: all text pairs ≥ 4.5:1 (body) and ≥ 3:1 (large text, icons). Never encode status with color alone — always icon + word.

**Hotels vertical icon:** duotone building with a champagne roof and emerald windows, in the existing vertical-tab style (32 px, inline SVG, brand tokens).

### 7.3 Typography (♻ Plus Jakarta Sans, local variable font)

| Style | Size / line-height | Weight | Use |
| --- | --- | --- | --- |
| Display | 44 / 52 | 800 | Hotels home hero |
| H1 | 34 / 42 | 700 | Hotel name (desktop), page titles |
| H2 | 26 / 34 | 700 | Section titles (Rooms, Reviews) |
| H3 | 20 / 28 | 600 | Room type name, card titles |
| Body L | 17 / 26 | 400–600 | Hotel description, checkout |
| Body | 16 / 24 | 400 | Default |
| Small | 14 / 20 | 400–500 | Meta lines, policies |
| Tiny | 12 / 16 | 500 | Badges, captions, refs (`font-mono` for refs) |
| Price | 30 / 36 | 700, tabular figures | Totals in booking rail |

Prices and dates use `font-variant-numeric: tabular-nums` so columns align in the rate grid.

### 7.4 Layout, spacing, breakpoints

- 4 px base grid; spacing scale 4, 8, 12, 16, 24, 32, 48, 64.
- Container 1280 px; gutters 16 px (mobile) / 24 px (≥640 px).
- Breakpoints: `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280.
- Results: `lg+` filters 260 px | list | map 40%; `md` list + map toggle; `<md` single column + filter sheet.
- Hotel page: `lg+` content 8 cols + sticky rail 4 cols; `<lg` sticky bottom bar opening a bottom sheet.
- Touch targets ≥ 44×44 px; inputs 16 px font on mobile (prevents iOS zoom).
- Radii (♻): cards `rounded-lg`, chips full-pill, sheets 24 px top corners.

### 7.5 Reusable components

♻ = exists (extend); **New** = build for hotels (and reuse later for other verticals).

| Component | Status | Notes |
| --- | --- | --- |
| `SearchPill` (where/when/who) | ♻ extend | Add `RoomsGuestsPicker` slot for hotels |
| `DestinationAutocomplete` | ♻ extend | Add Landmarks and Hotels groups |
| `DateRangePicker` | ♻ extend | Night count, min-stay hints, 2-month view desktop / scroll months mobile |
| `RoomsGuestsPicker` | **New** | Per-room adults/children steppers + child age selects |
| `ListingCard` | ♻ extend | Hotel facts (`listingFacts` per vertical), total price, badges |
| `FilterPanel` / `FilterSheet` | ♻ extend | Facet counts, price histogram |
| `MapView` (Leaflet ♻) | ♻ extend | Price pins, cluster, hover sync |
| `Gallery` + `Lightbox` | ♻ | Add photo category tabs |
| `RoomTypeCard` | **New** | Room facts + `RatePlanRow` list |
| `RatePlanRow` | **New** | Plan name, policy line, price/night, total, `QuantityStepper` |
| `QuantityStepper` | ♻ / New | −/+ with min/max, ARIA spinbutton |
| `PolicyLine` | **New** | Generated from rules: "Free cancellation until {date}" |
| `BookingRail` / `MobileBookingBar` / `BookingSheet` | ♻ extend | Multi-line selection summary |
| `PriceBreakdown` | ♻ extend | Per-night expandable list, tax slabs |
| `HoldTimer` | **New** | Countdown, warning at 2 min, `aria-live="polite"` every minute |
| `ReviewSummary` + `ScoreBars` | ♻ extend | Six sub-scores |
| `StatusBadge` / `StateBadge` | ♻ | Confirmed, In-house, Checked-out, No-show, Cancelled |
| `EmptyState`, `StatusBanner`, `Skeleton` | ♻ | See 7.6 |
| `RateGrid` | **New** (owner) | Virtualised grid; keyboard navigation; bulk drawer |
| `BulkEditDrawer` | **New** (owner) | Dates × days × room types × action, preview count |
| `KpiTile`, `TrendChart` | ♻ (owner/admin) | |
| `ApprovalChecklist` | **New** (admin) | Check rows with state, evidence link |

### 7.6 Loading, empty and error states

**Loading**

| Screen | Pattern |
| --- | --- |
| Results | 6 card skeletons matching final layout; map shows tiles first, pins fade in |
| Hotel page | Server-rendered content; room prices area shows skeleton cells only while the quote loads |
| Date/guest change | Keep old prices dimmed (opacity 0.5) + inline spinner; never blank the page |
| Checkout pay | Button shows spinner "Opening payment…"; disable double submit |
| Owner grid | Row skeletons; cells save optimistically with a small check ✓ |

**Empty states** (♻ `EmptyState`: icon, one-line title, one-line reason, one action)

| Context | Title | Action |
| --- | --- | --- |
| No results | "No stays match all your filters" | "Clear 3 filters" (+ show nearest matches below) |
| No availability on dates | "Surat is busy on 21 Nov" | "Try 22–23 Nov" (computed suggestion) |
| No trips | "No upcoming trips" | "Find a stay" |
| No reviews yet | "No reviews yet — new on Rentra" | — |
| Owner: no bookings | "No bookings yet" | "Check your rates and rooms to sell" |
| Admin queue empty | "All caught up" | — |

**Errors**

| Error | Message (what failed + what to do) |
| --- | --- |
| Network | "You're offline. We'll retry when you're back." + Retry |
| Quote expired | `StatusBanner`: "This price expired" → "Check prices again" |
| Sold out during checkout | "The last Deluxe room was just booked." → "See other rooms" |
| Payment failed | "Payment didn't go through. You weren't charged." → "Try again" / "Use another method" (hold still running) |
| Server 500 | "Something went wrong on our side. Your booking was not made." + support link + error ID |
| Validation | Inline under the field, red text + icon; focus first invalid field on submit |
| Permission (owner staff) | "Only the owner can change bank details." |

### 7.7 Motion and micro-interactions

- Durations: 150 ms (hover, chips), 200–250 ms (sheets, drawers), 300 ms (page section transitions). Ease-out for entering, ease-in for exiting.
- Animate only `transform` and `opacity`. Respect `prefers-reduced-motion` (♻ existing support): replace slides with fades.
- Save heart: scale 1 → 1.2 → 1 (200 ms) + fill.
- Room stepper: count tick slides vertically; booking rail total cross-fades on change.
- Map ↔ card hover: pin scales to 1.15 and gets the emerald fill.
- Bottom sheets: drag-to-dismiss with velocity threshold; backdrop fade.
- Confirmation: single check-mark draw (400 ms). No confetti.
- Skeleton shimmer stops after two cycles (♻ rule).

### 7.8 Accessibility

- WCAG 2.2 AA target. Keyboard path through search → filters → results → room steppers → checkout.
- Date picker supports typed dates and arrow keys; announces "18 November, check-in".
- Steppers are `role="spinbutton"` with `aria-valuenow`, labelled "Deluxe, Breakfast included, rooms".
- Map is supplementary; every pin's data is in the list.
- Images have alt text from photo category + room name; owner can edit.
- `axe-core` (♻ dev dependency) runs in CI on key pages.

### 7.9 Vocabulary (hotel vertical)

Use: *stay, nights, rooms, guests, adults, children, check-in, check-out, room type, rate, plan, breakfast included, free cancellation, non-refundable, property*.
Do not use on hotel pages: *visit, slot, day visit, players, court, BR*. One helper (♻ `describeVisit`) gets a hotel branch: "18–20 Nov · 2 nights · 1 room".

---

## 8. Architecture

### 8.1 Recommended stack (♻ keep the current stack)

| Layer | Technology | Why |
| --- | --- | --- |
| Web frontend | **Next.js 16 (App Router)** + React, Tailwind CSS v4, Radix UI/shadcn, lucide icons, Leaflet maps, zod | ♻ Already in `Rentra/`; SSR for SEO pages; server actions for mutations |
| API | **Node 22 + Express** (`rentra-backend/`) | ♻ Existing services for auth, booking, payments, payouts, disputes |
| ORM / DB | **Drizzle + PostgreSQL (Neon)** with PostGIS | ♻ Exclusion constraints, `CHECK`s, geo search, JSONB |
| Media | **Cloudinary** | ♻ Transformations, responsive images |
| Payments | **Razorpay** (Checkout, webhooks, refunds; Route in V1.1) | ♻ `payment_*` tables and gateway registry |
| Messaging | WhatsApp Business API provider, SMS (DLT-registered templates), email (SES/Resend) | ♻ `notification_outbox` |
| Jobs | Existing cron worker (`npm run worker`) | ♻ Hold expiry, payout runs, review requests, inventory row rollover |
| Hosting | Vercel (web) + Render (API + worker) + Neon | ♻ Current deployment |
| Monitoring | Sentry (errors, performance), uptime checks, structured logs | Sentry already connected to the workspace |
| Search (MVP) | Postgres: PostGIS radius + `pg_trgm` for names + facet SQL | No new service until > ~5,000 hotels |
| Search (V2) | Typesense or Meilisearch | When facet queries exceed 150 ms p95 |
| Cache | Next.js fetch cache + HTTP `Cache-Control` for public pages; ♻ partner query cache | Availability is never cached longer than 60 s |

No mobile app in MVP; the web app is a PWA-ready responsive site. Native apps (React Native / Expo) are V2 once repeat usage proves the need.

### 8.2 System context

```
                ┌──────────────────────┐        ┌─────────────────────────┐
 Guests ───────▶│  Next.js (Vercel)    │───────▶│  Express API (Render)   │
 Owners ───────▶│  public, account,    │  REST  │  auth · discovery ·     │
 Admins ───────▶│  partner, admin      │◀───────│  hotel · booking ·      │
                └──────────────────────┘        │  payments · payouts ·   │
                                                │  reviews · admin        │
                                                └───┬───────┬───────┬─────┘
                                                    │       │       │
                                     ┌──────────────▼┐ ┌────▼────┐ ┌▼──────────────┐
                                     │ Postgres/Neon │ │Cloudinary│ │ Razorpay      │
                                     │ + PostGIS     │ └──────────┘ │ (pay/refund/  │
                                     └──────▲────────┘              │  webhooks)    │
                                            │                       └───────────────┘
                                     ┌──────┴────────┐  ┌──────────────────────────┐
                                     │ Cron worker   │─▶│ WhatsApp / SMS / Email   │
                                     │ holds, payouts│  └──────────────────────────┘
                                     └───────────────┘  V1.1: Channel manager ↔ ARI API
```

### 8.3 Database design

**Mapping onto existing tables (♻)**

| Concept | Table | Change |
| --- | --- | --- |
| Vertical | `vertical` | Insert `hotel` row (`status='hidden'`) |
| Hotel property | `rentable` | `rental_unit='night'`, `category` = Hotel/Resort/…, amenities, photos, location, `cancellation_tier` unused for hotels (plan-level) |
| Hotel extra facts | **`hotel_profile`** (new) | 1:1 with `rentable` |
| Room types | **`room_type`** (new) | N per hotel |
| Rate plans | **`rate_plan`** (new) | N per room type |
| Nightly rates | **`rate_override`** (new) | Only dates that differ from defaults |
| Nightly inventory | **`room_night`** (new) | One row per room type per night when touched |
| Order / quote / payment | `booking_order`, `booking_quote`, `payment_*` | Reuse; quote gains room lines |
| Booking | `booking` | One booking per order (the stay); `slot` gains value `'stay'`; `starts_at`/`ends_at` = check-in/out instants |
| Booking lines | **`booking_room`** (new) | One row per room booked |
| Cancellation / refunds | `booking_cancellation`, `refund*` | Reuse; amounts computed from plan rules snapshot |
| Reviews | `review` | Add `sub_scores jsonb`, `traveller_type` |
| Commission | **`commission_rule`** (new) | Payout calculation reads it |
| Tax slabs | **`tax_slab`** (new) | Effective-dated, admin-editable |
| Landmarks | **`landmark`** (new) | For "near X" search and SEO |
| Verification, documents, payouts, disputes, staff, audit | existing | Reuse |

**New tables (PostgreSQL DDL sketch — final migration follows repo conventions: minor units `bigint`, `timestamptz`, `INR`, `Asia/Kolkata`)**

```sql
-- 1. Hotel-specific facts (1:1 with rentable)
CREATE TABLE hotel_profile (
  rentable_id      uuid PRIMARY KEY REFERENCES rentable(id) ON DELETE CASCADE,
  property_type    varchar(16) NOT NULL CHECK (property_type IN ('hotel','resort','boutique','homestay','business')),
  star_rating      smallint CHECK (star_rating BETWEEN 1 AND 5),
  check_in_minute  smallint NOT NULL DEFAULT 720 CHECK (check_in_minute BETWEEN 0 AND 1439),   -- 12:00
  check_out_minute smallint NOT NULL DEFAULT 660 CHECK (check_out_minute BETWEEN 0 AND 1439),  -- 11:00
  total_rooms      smallint NOT NULL CHECK (total_rooms BETWEEN 1 AND 2000),
  child_free_age   smallint NOT NULL DEFAULT 5,
  policies         jsonb NOT NULL DEFAULT '{}'::jsonb,  -- couples, local_id, pets, smoking, id_types, early/late rules
  gstin            varchar(15),
  gst_registered   boolean NOT NULL,
  show_exact_address boolean NOT NULL DEFAULT true,
  weekend_nights   smallint[] NOT NULL DEFAULT '{5,6}', -- ISO dow of nights priced as weekend (Fri, Sat)
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (gst_registered = (gstin IS NOT NULL))
);

-- 2. Room types
CREATE TABLE room_type (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rentable_id    uuid NOT NULL REFERENCES rentable(id) ON DELETE RESTRICT,
  name           varchar(60) NOT NULL,
  beds           jsonb NOT NULL,                 -- [{"type":"king","count":1}]
  size_sqm       smallint,
  view           varchar(24),
  max_adults     smallint NOT NULL CHECK (max_adults BETWEEN 1 AND 12),
  max_children   smallint NOT NULL DEFAULT 0,
  max_occupancy  smallint NOT NULL,
  base_occupancy smallint NOT NULL DEFAULT 2,
  room_count     smallint NOT NULL CHECK (room_count BETWEEN 1 AND 500),
  extra_adult_minor bigint NOT NULL DEFAULT 0,
  extra_child_minor bigint NOT NULL DEFAULT 0,
  amenities      jsonb NOT NULL DEFAULT '[]'::jsonb,
  photos         jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order     integer NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (base_occupancy <= max_occupancy AND max_adults <= max_occupancy),
  UNIQUE (id, rentable_id)
);

-- 3. Rate plans: base (own prices) or derived (from a base plan of the same room)
CREATE TABLE rate_plan (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id     uuid NOT NULL REFERENCES room_type(id) ON DELETE CASCADE,
  name             varchar(60) NOT NULL,
  meal_plan        varchar(2) NOT NULL DEFAULT 'EP' CHECK (meal_plan IN ('EP','CP','MP','AP')),
  weekday_minor    bigint,                        -- base plans only
  weekend_minor    bigint,
  derived_from     uuid REFERENCES rate_plan(id),
  derived_pct_bps  integer,                       -- e.g. -1000 = -10%
  derived_per_guest_minor bigint,                 -- e.g. breakfast +35000 per guest/night
  cancellation     jsonb NOT NULL,                -- [{"hours_before":72,"refund_bps":10000},{"hours_before":0,"refund_bps":0}]
  no_show          varchar(12) NOT NULL DEFAULT 'first_night' CHECK (no_show IN ('first_night','full_stay')),
  min_nights       smallint NOT NULL DEFAULT 1,
  max_nights       smallint NOT NULL DEFAULT 30,
  is_active        boolean NOT NULL DEFAULT true,
  CHECK ((derived_from IS NULL) = (weekday_minor IS NOT NULL AND weekend_minor IS NOT NULL))
);

-- 4. Date-specific price overrides (only for base plans)
CREATE TABLE rate_override (
  rate_plan_id uuid NOT NULL REFERENCES rate_plan(id) ON DELETE CASCADE,
  night        date NOT NULL,
  rate_minor   bigint NOT NULL CHECK (rate_minor BETWEEN 30000 AND 20000000),
  PRIMARY KEY (rate_plan_id, night)
);

-- 5. Inventory per room type per night: the DB forbids overbooking
CREATE TABLE room_night (
  room_type_id uuid NOT NULL REFERENCES room_type(id) ON DELETE CASCADE,
  night        date NOT NULL,
  allotment    smallint NOT NULL CHECK (allotment >= 0),
  allotment_overridden boolean NOT NULL DEFAULT false,
  sold         smallint NOT NULL DEFAULT 0 CHECK (sold >= 0),
  held         smallint NOT NULL DEFAULT 0 CHECK (held >= 0),
  stop_sell    boolean NOT NULL DEFAULT false,
  closed_to_arrival boolean NOT NULL DEFAULT false,
  min_nights   smallint,
  PRIMARY KEY (room_type_id, night),
  CHECK (sold + held <= allotment)
);

-- 6. Booking lines (one per room)
CREATE TABLE booking_room (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    uuid NOT NULL REFERENCES booking(id) ON DELETE RESTRICT,
  room_type_id  uuid NOT NULL REFERENCES room_type(id),
  rate_plan_id  uuid NOT NULL REFERENCES rate_plan(id),
  check_in      date NOT NULL,
  check_out     date NOT NULL CHECK (check_out > check_in),
  adults        smallint NOT NULL CHECK (adults >= 1),
  child_ages    smallint[] NOT NULL DEFAULT '{}',
  guest_name    varchar(80),
  nights        jsonb NOT NULL,      -- [{"night":"2026-11-18","rate_minor":310000,"tax_bps":500,"tax_minor":15500}]
  amount_room_minor bigint NOT NULL,
  amount_tax_minor  bigint NOT NULL,
  plan_snapshot jsonb NOT NULL,      -- name, meal plan, cancellation rules at booking time
  state         varchar(12) NOT NULL DEFAULT 'booked' CHECK (state IN ('booked','cancelled','no_show','stayed'))
);

-- 7. Commission rules (most specific active rule wins: rentable > city > vertical)
CREATE TABLE commission_rule (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical    varchar(24) NOT NULL REFERENCES vertical(code),
  city_id     uuid REFERENCES city(id),
  rentable_id uuid REFERENCES rentable(id),
  rate_bps    integer NOT NULL CHECK (rate_bps BETWEEN 0 AND 3000),
  tier        varchar(16) NOT NULL DEFAULT 'standard',
  valid_from  date NOT NULL,
  valid_to    date,
  created_by  uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 8. Tax slabs (effective-dated; GST changes without code deploys)
CREATE TABLE tax_slab (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical        varchar(24) NOT NULL REFERENCES vertical(code),
  min_rate_minor  bigint NOT NULL,      -- inclusive, per room per night
  max_rate_minor  bigint,               -- inclusive; NULL = no upper bound
  tax_bps         integer NOT NULL,     -- 500 = 5%
  effective_from  date NOT NULL,
  effective_to    date
);

-- 9. Landmarks for "near X" search
CREATE TABLE landmark (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id  uuid NOT NULL REFERENCES city(id),
  slug     varchar(80) NOT NULL UNIQUE,
  name     varchar(120) NOT NULL,
  kind     varchar(16) NOT NULL,   -- station, airport, temple, business, hospital, attraction
  location geometry(point) NOT NULL
);
```

Indexes: `room_type (rentable_id) WHERE is_active`, `room_night (night, room_type_id)`, `booking_room (booking_id)`, `booking_room (room_type_id, check_in)`, GiST on `rentable.location` (♻), GiST on `landmark.location`, trigram on `rentable.title`.

**Inventory rows:** `room_night` rows are created lazily (`INSERT … ON CONFLICT DO NOTHING` with `allotment = room_type.room_count`) by the hold transaction, the owner grid, and a nightly job that keeps the next 365 nights materialised. When `room_count` changes, rows with `allotment_overridden = false` are updated in the same transaction; the update fails (by the `CHECK`) if it would drop below booked rooms, and the UI explains which nights.

### 8.4 Availability, holds and overbooking protection

```sql
-- Hold k rooms of one room type for nights [check_in, check_out) — one statement, all-or-nothing.
-- Runs after INSERT … ON CONFLICT DO NOTHING has created any missing room_night rows for these nights.
WITH nights AS (
  SELECT d::date AS night FROM generate_series($check_in::date, $check_out::date - 1, '1 day') d
), upd AS (
  UPDATE room_night rn SET held = rn.held + $k
  FROM nights n
  WHERE rn.room_type_id = $room_type AND rn.night = n.night
    AND NOT rn.stop_sell
  RETURNING rn.night
)
SELECT count(*) FROM upd;   -- must equal number of nights, else ROLLBACK (sold out / closed)
```

- The `CHECK (sold + held <= allotment)` raises an error when the last room is taken concurrently → API maps it to `409 SOLD_OUT`.
- Multi-room-type orders lock room types in a fixed order (by `room_type_id`) to avoid deadlocks.
- Hold record: ♻ `booking_order.hold_expires_at` (15 min). On payment success: `held -= k, sold += k` in the confirmation transaction. On expiry (cron every minute) or failure: `held -= k`.
- Cancellation: `sold -= k` for future nights only.
- Search availability: one aggregate query over `room_night` for the date range (missing row = full `room_count` available), joined to rates.

### 8.5 Pricing and quote calculation

For each room line and each night:

1. Base rate = `rate_override.rate_minor` if present, else `weekend_minor` if the night's weekday is in `weekend_nights`, else `weekday_minor`.
2. Derived plan = base × (1 + `derived_pct_bps`/10000) + `derived_per_guest_minor` × guests.
3. Add extra adults/children above `base_occupancy` (children under `child_free_age` free).
4. Promotions (V1.1) applied here.
5. Tax = slab from `tax_slab` for that night's *final room rate* (per room per night) → `tax_bps`.
6. Round each night to whole rupees (♻ `booking-money` helpers); sum.

The quote (♻ `booking_quote`) stores lines, version, `pricing_version`, a hash and `expires_at`. Checkout submits the hash; mismatch → `409 QUOTE_CHANGED` with the new quote. **The frontend never computes money.**

### 8.6 API design (REST, JSON, versioned under `/api/v1`)

**Public / customer**

| Method & path | Purpose | Auth |
| --- | --- | --- |
| `GET /discovery/suggest?q=&vertical=hotel` | Autocomplete: cities, areas, landmarks, hotels | Public, rate-limited |
| `GET /hotels/search?city=&area=&landmark=&lat=&lng=&radius=&check_in=&check_out=&rooms=2-0,2-1:7&filters…&sort=&page=` | Results with total price and facets | Public |
| `GET /hotels/{slug}` | Hotel content (cacheable 5 min) | Public |
| `GET /hotels/{slug}/availability?check_in=&check_out=&rooms=` | Room types × plans with availability and prices | Public, no cache |
| `POST /hotels/{slug}/quotes` | Create quote for selected lines | Public |
| `POST /hotel-orders` | Create order + hold (body: quote id/hash, lines, idempotency key) | Customer |
| `PATCH /hotel-orders/{id}` | Guest details, GSTIN, arrival time | Customer (owner of order) |
| `POST /hotel-orders/{id}/payment` | Create Razorpay order (♻ checkout service) | Customer |
| `POST /webhooks/razorpay` | Payment/refund events (♻) | Signature-verified |
| `GET /customer/bookings?vertical=` | My trips (♻) | Customer |
| `GET /customer/bookings/{ref}/cancellation-preview` | Refund amount now | Customer |
| `POST /customer/bookings/{ref}/cancel` | Cancel (idempotent) | Customer |
| `POST /customer/bookings/{ref}/review` | Review with sub-scores | Customer, stay completed |

**Partner (owner/staff)**

| Method & path | Purpose | Role |
| --- | --- | --- |
| `POST /partner/hotels` / `PATCH /partner/hotels/{id}` | Wizard draft save (♻ property drafts) | Owner, Manager |
| `POST /partner/hotels/{id}/submit` | Submit for review | Owner |
| `CRUD /partner/hotels/{id}/room-types` | Room types | Owner, Manager |
| `CRUD /partner/room-types/{id}/rate-plans` | Rate plans | Owner, Manager |
| `GET /partner/hotels/{id}/ari?from=&to=` | Rates & inventory grid data | Owner, Manager, Front desk (read) |
| `PATCH /partner/hotels/{id}/ari` | Bulk update (body: date range, days, room types, ops) — returns changed cell count | Owner, Manager; Front desk: stop-sell only |
| `GET /partner/hotels/{id}/today` | Arrivals, departures, in-house, KPIs | All roles |
| `GET /partner/reservations?…` / `GET /partner/reservations/{ref}` | Reservations | All roles |
| `POST /partner/reservations/{ref}/check-in` · `/no-show` · `/cancel` | Front-desk actions (audited) | Front desk+ |
| `GET /partner/payouts`, `/partner/payouts/{id}/statement` | Payouts (♻) | Owner, Accounts |
| `GET /partner/analytics?from=&to=` | KPIs | Owner, Manager |
| `POST /partner/reviews/{id}/reply` | Reply | Owner, Manager |

**Admin** (♻ capability-gated): `/admin/hotel-applications`, `/admin/hotels/{id}/(approve|request-changes|reject|pause)`, `/admin/commission-rules`, `/admin/tax-slabs`, `/admin/landmarks`, `/admin/bookings/{ref}/(relocate|refund-override)`, `/admin/payout-runs`, `/admin/analytics/hotels`.

**Conventions:** cursor pagination; ISO dates (`YYYY-MM-DD` for nights, ISO instants for times); money as integer minor units + currency; error body `{ code, message, details }` with codes `SOLD_OUT`, `QUOTE_CHANGED`, `HOLD_EXPIRED`, `MIN_STAY`, `OCCUPANCY`, `FORBIDDEN`, `VALIDATION`; `Idempotency-Key` header on all POSTs that create money or bookings; validation with zod/joi (♻).

### 8.7 Authentication and authorization (♻)

- **Customers:** phone OTP (♻ `customer_otp_challenge`, rate limits), session cookie `rentra_session` (httpOnly, Secure, SameSite=Lax), profile completion gate.
- **Partners:** ♻ portal session with roles; new hotel roles map to existing staff permissions: `hotel.ari.write`, `hotel.ari.stop_sell`, `hotel.reservations.act`, `hotel.payouts.read`, `hotel.content.write`.
- **Admins:** ♻ admin auth with capabilities; add `hotel.approve`, `hotel.moderate`, `commission.write`, `tax.write`, `booking.relocate`.
- **Row-level scoping:** every partner query filters by `client_id` and `staff_property` assignment in the service layer (♻ `record-scope`); never trust IDs from the URL alone.
- UI hides actions a role cannot take, but **the API always re-checks**.

### 8.8 Payment integration (♻ Razorpay)

```
Guest            Web                 API                         Razorpay             DB
  │ Pay ₹6,510    │                   │                              │                  │
  │──────────────▶│ POST /payment     │                              │                  │
  │               │──────────────────▶│ create RZP order (amount,    │                  │
  │               │                   │ receipt=order ref, notes)    │                  │
  │               │                   │─────────────────────────────▶│                  │
  │               │◀──── rzp order id ─│                              │                  │
  │ Razorpay Checkout (UPI/card)       │                              │                  │
  │───────────────────────────────────────────────────────────────────▶ captured         │
  │               │ handler: verify signature (fast path)             │                  │
  │               │                   │◀──── webhook payment.captured (source of truth)  │
  │               │                   │ verify HMAC, dedupe event id, │                  │
  │               │                   │ confirm order: held→sold,     │─────────────────▶│
  │               │                   │ booking confirmed, outbox msg │                  │
  │◀── confirmation page (polls order state) ─────────────────────────│                  │
```

- Webhook is the source of truth; the client callback only speeds up the UI.
- Amount verified server-side against the order; currency INR only.
- Refunds via API (♻ `refund_execution`), status tracked through `refund.processed` webhooks.
- V1.1: **Razorpay Route** to transfer the hotel's share to a linked account on payout date (keeps funds flow clean for ECO compliance); until then, weekly bank payouts (♻).
- Reconciliation job daily: Razorpay settlements vs `payment_transaction` (♻ settlement).

### 8.9 Security checklist

| Area | Control |
| --- | --- |
| Transport | HTTPS only, HSTS, secure cookies |
| Headers | ♻ `helmet`: CSP (allow Razorpay, Cloudinary, map tiles), frame-ancestors none, referrer policy |
| Input | Schema validation on every endpoint; parameterised SQL (Drizzle/postgres.js); output encoding in React |
| AuthN | OTP rate limits per phone/IP (♻), session rotation on login, short-lived admin sessions + MFA for admins (V1.1) |
| AuthZ | Service-layer ownership checks; tests for cross-tenant access on every partner/admin endpoint |
| Money | Server-computed quotes, idempotency keys, DB constraints, signed webhooks, audit log of every override (♻ `audit_log`) |
| Uploads | Signed Cloudinary uploads; documents in a private bucket with signed short-lived URLs; MIME + size checks; virus scan for documents (V1.1) |
| Secrets | Env vars on Render/Vercel only; rotate any secret ever committed (note: the Neon password rotation is still pending from an earlier audit) |
| Privacy (DPDP) | Minimal guest data; hotel sees guest name + phone only after confirmation; data export/deletion (♻ privacy jobs); retention policy for documents |
| Abuse | Rate limiting (♻ `express-rate-limit`) on search, quotes, holds (max 3 active holds per customer) |
| Monitoring | Sentry errors + alerts on payment webhook failures, hold expiry backlog, 409 SOLD_OUT spikes |
| Backups | Neon point-in-time restore; monthly restore drill |

### 8.10 Performance budgets

| Page | Target |
| --- | --- |
| Hotels home, city landing (SSR) | LCP < 2.5 s on 4G mid-range Android, CLS < 0.1 |
| Search API p95 | < 300 ms (≤ 2,000 hotels in Postgres) |
| Availability API p95 | < 200 ms |
| Hold + order create p95 | < 400 ms |
| JS on hotel page | < 200 KB gzip initial |

---

## 9. Phase-wise development plan

Each phase lists objective, deliverables, and acceptance criteria. Phases follow the same working style as the Entertainment plan: one phase at a time, a completion record at the end of each, owner sign-off before the next.

### Phase 0 — Discovery & business validation (Weeks 1–2)

- **Objective:** prove hotels want this and guests will book before writing production code.
- **Deliverables:** 20 hotel interviews in Surat (rates, room counts, OTAs used, commission paid, payout pain); 15 signed letters of intent (founding partner terms); guest survey (300 existing Rentra users) on hotel needs; final commission/fee decision; CA opinion on GST/TCS/9(5) flow; partner agreement draft; success metrics agreed (§3.7).
- **Acceptance:** ≥ 15 LOIs; CA sign-off on money flow; owner decisions in §13 answered.

#### Phase 0 preparation record (20 Oct 2026)

**Status:** 🟡 Preparation complete; the phase itself is open. Interviews, signatures, the survey and the CA opinion need real people, so Claude prepared the material and the owner/BD team runs the field work.

**Prepared** (in `Rentra/docs/`, branch `feat/hotels`, uncommitted):

| Item | Where |
| --- | --- |
| 10-day schedule, lead sources and A/B/C segments | `HOTEL-PHASE0-KIT.md` §1–2 |
| Lead and interview tracker (import into Google Sheets) | `hotel-leads-template.csv` |
| 17-question hotel interview script with scoring | kit §3 |
| Founding-partner pitch (one page) | kit §4 |
| Non-binding letter-of-intent template | kit §5 |
| 10-question guest survey (also recruits Phase 1 usability testers) | kit §6 |
| 10 questions for the CA (GST slabs, 9(5), TCS, TDS 194-O, invoicing, funds flow) | kit §7 |
| Partner agreement heads of terms for the lawyer | kit §8 |
| Results sheet and day-10 decision log | kit §9–10 |

**Plan change:** §13.1 no longer proposes a rate-parity clause. The Competition Commission of India acted against parity obligations in online hotel booking in 2022; the heads of terms ask the lawyer instead.

**To complete Phase 0 (owner/BD):** fill the tracker from 20 visits; get ≥ 15 LOIs signed (after a lawyer reviews the template); run the survey to ≥ 300 opted-in customers; get the CA's written answers; fill the decision log (kit §10); then mark Phase 0 complete here and update §3.3–3.5 with real numbers.

### Phase 1 — Product & UX design (Weeks 2–4)

- **Objective:** approved designs for every MVP screen, built on the existing design system.
- **Deliverables:** user flows (guest, owner, admin); high-fidelity mockups for Hotels home, results (desktop/mobile), hotel page, room selection, checkout, confirmation, My trips detail, owner wizard, Today, rate grid, reservations, payouts, admin approval queue; component specs for new components (§7.5); copy deck (vocabulary §7.9, error/empty states §7.6); clickable prototype; usability test with 5 guests + 3 hotel staff.
- **Acceptance:** owner approves mockups; usability test: 5/5 guests complete a booking without help; 3/3 front-desk staff can close a room for tonight in < 30 s.

#### Phase 1 completion record (20 Oct 2026)

**Status:** ✅ Complete for the design deliverables. Two acceptance gates are owner actions and remain open: (1) approve the mockups using the checklist in `docs/design/hotels/README.md` §8; (2) run the usability sessions in §7 of that file.

**Delivered** (all in `Rentra/docs/design/hotels/`, branch `feat/hotels`, uncommitted):

| Deliverable | Where |
| --- | --- |
| Clickable prototype (hub + 14 screens, 45 screen states, state bar on every screen) | `index.html` |
| Guest: Hotels home, results (list + map + filters), hotel page with room cards × plan rows, checkout (7 states), confirmation, My trips + cancel | `home.html`, `results.html`, `hotel.html`, `checkout.html`, `confirmation.html`, `trip.html` |
| Owner: onboarding wizard (steps 6, 7, 10), Today, Rates & rooms grid + inline edit + refused edit + bulk drawer + phone day list, Bookings + drawer, Earnings & payouts | `owner-*.html` |
| Admin: hotel applications with checks and request-changes; commission rules with impact preview | `admin-approvals.html`, `admin-commission.html` |
| Loading, empty, error and toast patterns | `states.html` |
| User flows, screen/state inventory, component specs, copy deck, Phase 1 decisions P1-1…P1-7, usability script, approval checklist | `README.md` |
| New vertical icon `tab-hotel` and 50 hotel line icons | `icons.js` |
| Screenshots (first state of each screen, 1280 px and 390 px, full page) | `shots/` |

**Verification run** (Playwright + system Chrome, script kept in the session scratchpad):
- Every screen in every state rendered at 1280 × 800 and 390 × 844 (45 states × 2 = 90 renders): no console errors, no failed requests, no missing icons, no horizontal page overflow on phones.
- The impeccable design hook ran on each file. Fixed: low-contrast placeholder labels, sold-out price, and the "Full" map pin (`ink-400` → `ink-500`); gray text on the dark green Today tile and sidebar (→ `brand-200` / `brand-100` tints); a font outside DESIGN.md (`SFMono-Regular` → generic `ui-monospace`). Suppressed one finding: `clipped-overflow-container` for `results.html` only, because the map placeholder clips its pins on purpose (recorded in `.impeccable/config.json`, which is gitignored, so local only).
- Money in the mockups was checked by hand: GST 5% per night under ₹7,500; owner breakdown room + GST − 10% commission − 18% GST on commission − TCS 0.5% − TDS 0.1%; payout rows add up.

**Not done / not verified:** no production code, API or database change; no usability sessions; no owner approval yet; Phase 0 (interviews, LOIs, CA sign-off) not started. Mockups use placeholder photos and sample data.

**Changes to this plan from Phase 1:** owner navigation labels now follow DESIGN.md (§5.1: Bookings, Earnings, Rates & rooms, Team), recorded as decision P1-3; §5.7 renamed "Bookings (reservations)".

**Owner actions before Phase 2:** approve or mark up the mockups (README §8); answer §13.2 Q1–Q10 and decisions P1-1…P1-7; run the usability sessions when convenient (findings feed Phase 3/5/6 UI work); start Phase 0 in parallel (CA sign-off is on Phase 2's critical path for `tax_slab` and payout fields).

### Phase 2 — Data model & inventory engine (Weeks 3–6)

- **Objective:** database and core services that make overbooking impossible.
- **Deliverables:** migration with `hotel` vertical row, `hotel_profile`, `room_type`, `rate_plan`, `rate_override`, `room_night`, `booking_room`, `commission_rule`, `tax_slab`, `landmark`; `booking_slot` value `'stay'`; services: availability, quote (pricing + tax), hold/confirm/release, cancellation calculator; nightly `room_night` materialisation job; seed script with 10 demo hotels.
- **Acceptance:** property tests: random concurrent holds never exceed allotment; quote totals equal sum of nights; tax slab boundary tests (₹7,500 vs ₹7,501, derived plan crossing the slab); farmhouse and entertainment test suites unchanged and green; migration validated on a disposable local Postgres before Neon.

#### Phase 2 completion record (20 Oct 2026)

**Status:** ✅ Complete locally. Branch `feat/hotels` in `rentra-backend/`, uncommitted. Migration 0064 has **not** been applied to Neon.

**Delivered**

| Item | Where |
| --- | --- |
| Migration: `hotel` vertical (hidden), `booking_slot` value `stay`, `hotel_profile`, `room_type`, `rate_plan`, `rate_override`, `room_night`, `booking_room`, `commission_rule`, `tax_slab` (GST 5% / 18% seeded from 22 Sep 2025), guard and counter triggers | `drizzle/0064_hotel_inventory.sql`, journal entry 64 |
| Pure rules: stay nights and booking window, occupancy and free child age, weekday/weekend/override and derived plan rates, per-night tax slab, cancellation and no-show charges, availability per room type | `src/services/domain/hotel.js` |
| Engine: availability, quote (hashed), hold under the hotel's lock (re-quotes; `QUOTE_CHANGED`, `SOLD_OUT`, `CLOSED`), confirm, release, stayed/no-show, cancellation preview, commission resolver | `src/services/booking/hotel-stays.js` |
| Hold expiry also releases hotel rooms (existing payments-job sweep) | `src/services/booking/inventory.js` (`expireInventoryHolds`, 3 lines) |
| Launch guard: admins cannot switch Hotels out of `hidden` yet (`NOT_READY`); lift in Phase 4 (partners) and Phase 9 (public) | `src/services/catalogues/verticals.js` (2 lines) |
| Seed: 4 hotel categories, 9 hotel amenities + 8 shared mappings; `--demo` adds 10 live Surat demo hotels (19 room types, 48 plans, no photos) | `src/scripts/seed-hotels.js`, `npm run seed:hotels` |
| Tests | `test/services/hotel-domain.test.js` (8), `test/integration/hotel-inventory.integration.test.js` (10 subtests), fixture `test/helpers/hotel-fixture.js` |

**How overbooking is prevented:** each `booking_room` row is one room. Triggers add or remove it from `room_night.held` / `sold` for every night it covers, and `CHECK (sold + held <= allotment)` rejects the write that would oversell, whoever makes it. Holds also run under the existing per-hotel lock (`withListingInventory`) and re-check availability first. Stop-sell nights refuse new holds in the trigger. Reducing a room type's count below what is sold fails.

**Verification (local Postgres 14 on 127.0.0.1:55432, never Neon)**
- 0064 applied by the real drizzle migrator in one transaction on top of 0063 (the 55P04 enum check); `npm run db:check` passes (65 migrations).
- Unit tests 8/8: slab boundary ₹7,500 → 5% and ₹7,500.01 → 18%; a derived plan or extra adult moving a night across the slab; one stay mixing slabs; 500 random stays where totals equal the sum of nights; cancellation deadline to the millisecond.
- Integration 10/10: guards; prices per plan; hold/confirm/release counters; stayed/no-show; stop-sell, stale quote, room-count change; expired holds read as free and are released by the sweep; **12 concurrent checkouts for 3 rooms → exactly 3 succeed, 9 `SOLD_OUT`**; **20 writers bypassing the lock with random overlapping stays → never above allotment, counters equal the rows**; commission precedence and overlap refusal; launch guard.
- Full backend suite with the local database: 258 tests, 255 pass, 0 fail, 3 skipped (the same 3 that need other environment settings). The launch guard and its subtest were added after that run; the hotel and venue API test files were re-run afterwards (12 pass, 0 fail). One existing assertion was scoped: the Entertainment migration test listed every vertical and now checks only Farmhouse and Entertainment.
- Seed run twice on a fresh database: 10 hotels, then 0 (idempotent). A demo resort priced correctly (Pool Villa ₹9,800 → 18% GST).
- ESLint and Prettier clean on all changed files.

**Changes from the plan**
- `landmark` moved to Phase 6. Nothing reads it before search, and its PostGIS column belongs with the search index.
- No nightly materialisation job. Night rows are created when first booked or edited; a missing row means "all rooms open". Nothing has to keep a calendar filled.
- Property type is the category (Hotel, Resort, Boutique hotel, Business hotel), not a `property_type` column. `total_rooms` is the sum of room types, not stored.
- Cancellation is `free_cancel_hours` + `late_charge` (first night or full stay) + `no_show`, not percentage bands. The 50% band in "Moderate" could refund more after the deadline than before it on long stays; §4.9 is updated.
- Minimum stay and closed-to-arrival apply to the arrival night (industry standard).
- Holds last 15 minutes (`HOTEL_POLICY`); farmhouse holds keep their 10 minutes.

**Not done (later phases):** checkout creating the order + `stay` booking and storing the quote (Phase 7); owner rate and room editing APIs (Phase 5); search and landmarks (Phase 6); payouts using `resolveCommission` (Phase 8).

**Owner actions:** none needed to continue. Before anything hotel-related reaches Neon: rotate the Neon password, apply the pending migrations in order, then 0064 with the rest of the release. Do not run `seed:hotels --demo` on production. Tax slabs await the CA's confirmation (Phase 0).

### Phase 3 — Owner onboarding & property management (Weeks 5–9)

- **Objective:** a hotel can sign up, build its listing, and submit for review.
- **Deliverables:** wizard steps 1–10 (§5.2) with autosave and assisted mode; room types and rate plans editors; photo upload with categories; documents upload; completion meter; owner listing preview.
- **Acceptance:** a 30-room hotel completes onboarding in ≤ 30 minutes in a moderated test; all validation messages in place; drafts survive refresh/device change.

#### Phase 3 completion record (20 Oct 2026)

**Status:** ✅ Complete locally, on branch `feat/hotels` in both repos, uncommitted. Nothing reached Neon. One acceptance item is the owner's: the moderated test with a real hotel owner (≤ 30 minutes).

**How it fits:** hotels use the existing owner wizard (same 11 steps, autosave, chapters, completion meter, preview and submit) as a third booking model, `night`, the same way venues were added. Farmhouse and venue wizards are unchanged.

| Step (id) | Hotel version |
| --- | --- |
| Type | "Hotel or resort" on the start screen, then Hotel / Resort / Boutique hotel / Business hotel |
| Location | Unchanged |
| Rooms (`space`) | New room-type editor: name (with suggestions), rooms of this type, beds, max adults / children / guests, guests included in the price, extra adult / child ₹, size, view; move, duplicate, remove and restore; live "N room types · M rooms" |
| Amenities | Hotel amenities from `seed:hotels` |
| Photos | 8–40 photos (farmhouses and venues keep 6–15); photo prompts include Exterior, Lobby, every room type by name, Bathroom, Dining, Pool |
| Title and description | Unchanged |
| Rates (`pricing`) | Per room type: a base rate (weekday / weekend ₹ per night) plus one-tap "+ Breakfast plan" and "+ Non-refundable" rates that follow it (± %, + ₹ per guest); meals; cancellation template (Flexible / Moderate / Strict / Non-refundable); live "Guests pay ₹X incl. GST (5% or 18%)" |
| Check-in and check-out (`availability`) | Times, free child age, nights priced as weekend (Fri + Sat default), optional star category |
| House rules (`rules`) | Couples, local ID, accepted IDs, pets, smoking, parties, notes |
| Proof and GST (`ownership`) | Hotel document list (lease, property tax, Gumasta, GST certificate, electricity bill, sale deed, NOC, authorisation letter) plus a GST question (registered → GSTIN, validated) |

**Backend:** `booking/hotel-setup.js` (rooms, rates, stay/rules/GST saves and the editor read), routes `POST /partner/listings/:id/rooms|rates|stay|gst` (rules reuse `/rules`), hotel validation in `schemas/zod/listing.js`, hotel chapters in `domain/listing-steps.js`, hotel completion in `domain/listing-completion.js` (10 sections; submit needs all), hotel data in the owner edit payload and in the submission snapshot that admins review. Rules carried over from venues: saves check the content version; saved rows are deactivated, never deleted. Hotel rules:
- A room type with rooms booked ahead cannot be removed (`ROOM_HAS_BOOKINGS`), and its count cannot go below what is booked (`ROOMS_BELOW_BOOKINGS`).
- On a live hotel, changing what a room is (name, beds, size, view, occupancy) sends the hotel back to review; changing how many rooms are sold, prices or order does not.
- A rate cannot switch between "own prices" and "follows another rate" (add a new one instead).

**Frontend:** `components/partner/listing/HotelSections.jsx` (rooms, rates, check-in, house rules, GST), the step map in `app/(wizard)/partner/listings/[id]/setup/[step]/page.js`, the manage page `app/(partner)/partner/listings/[id]/page.js` (hotel sections; no farmhouse deposit/cancellation), `NewListingStart.jsx`, `TypeSection.jsx`, `PhotosSection.jsx`, `lib/actions/partner.js`, and the shared `lib/domain/listing-steps.js` / `listing-completion.js` copies.

**Verification (local only)**
- Backend: new `test/integration/hotel-owner-flow.integration.test.js` (validation, version guard, rooms, rates with keys, kind-switch refusal, stay / rules / GST, completion = only proof missing, `VERTICAL_CLOSED`, submit with hotel data in the snapshot, booked-room protections, review on fact change but not on count change). Full suite: 265 tests, 262 pass, 0 fail, 3 skipped (the same environment-dependent three).
- Frontend: `npm test` 104/104 (new hotel chapter/label/limit test); ESLint clean on changed files; `next build` passes.
- Browser gate `scripts/portal-gate/hotel_wizard_gate.mjs` (with `hotel-mint.mjs`), on a disposable stack (DB `rentra_cp02`, API :4106, web :3106): **42/42 checks pass**. An owner creates a 30-room hotel (Deluxe 12, Standard 14, Family 4) and 4 rates through the real wizard, the saved rooms reappear on a second device, rules and GST save, the preview says "Ready to send" and the hotel is submitted (`pending_review`). axe (WCAG 2.1 AA) 0 violations at 1440 on all 10 screens; no horizontal overflow at 390; no console errors. The gate writes photos, the ownership file and the map pin directly (no Cloudinary or PostGIS on the fixture), as the venue gate does. Earlier runs also hit two dev-server artefacts: once, a page had no title yet because it was still compiling; and the fixture server's missing `/favicon.ico` (404) appeared in 3 runs. The gate now ignores that URL.
- Farmhouse wizard before/after: 26 screens × 2 widths captured with and without this phase's frontend changes: page text identical on all 26; screenshots byte-identical on 24 of 26 pairs; the other 2 (photo step and manage page, both showing photos) are visually identical (photo decoding).
- Fixed during the gate: the house-rules Yes/No toggles did not highlight the chosen answer (uncontrolled radios); they now highlight through CSS `:checked`.

**Not done / deviations**
- **Assisted mode** (BD filling the wizard for an owner) is not built. Today BD can sit with the owner on the owner's phone. A proper version needs admin "act as owner" with an audit trail. Proposed for Phase 4.
- PAN and bank details stay at the account level (existing owner onboarding and payout settings), not in the hotel wizard. GST is per hotel.
- Room photos are tagged by room type ("Room: Deluxe Double") on the property's photos rather than uploaded per room type.
- Hotel amenity and room labels have no Gujarati or Hindi translations yet.
- Admin review panes for rooms and rates are Phase 4. Until then admins can see hotel data only in the raw submission.

**Owner actions:** run the moderated onboarding test with one real hotel (target ≤ 30 minutes) when convenient; the launch guard still keeps Hotels hidden from real owners until Phase 4.

### Phase 4 — Admin verification & settings (Weeks 7–9)

- **Objective:** Rentra can review, verify, and approve hotels and control the vertical.
- **Deliverables:** hotel application queue with checklist (§6); request-changes per field; verification visit scheduling (♻); commission rules UI; tax slabs UI; landmarks UI; hotel amenity catalogue; vertical status switch to `partners`.
- **Acceptance:** an application goes draft → approved with every check recorded in `audit_log`; commission preview is correct for rentable/city/vertical overrides.

### Phase 5 — Extranet operations (Weeks 8–11)

- **Objective:** hotels can run day-to-day on Rentra.
- **Deliverables:** Today dashboard; rates & availability grid (desktop) and day list (mobile); bulk edit drawer; holiday presets; reservations list/detail; check-in, no-show, cancel-with-relocation; team roles for hotels; new-booking alerts (WhatsApp + in-app).
- **Acceptance:** bulk edit of 90 days × 4 room types completes < 2 s; front desk cannot change rates (API returns 403); "rooms to sell" cannot drop below booked.

### Phase 6 — Customer discovery (Weeks 8–12)

- **Objective:** guests can find hotels and see exact prices.
- **Deliverables:** Hotels vertical tab; Hotels home; autocomplete with landmarks; results list + map + filters + sort; city/area/landmark SEO landing pages with JSON-LD; hotel page with gallery, facts, amenities, policies, reviews, location; room selection with live availability.
- **Acceptance:** search p95 < 300 ms on 500 seeded hotels; Lighthouse mobile performance ≥ 85 on hotel page; axe: zero serious violations; prices on card = prices on hotel page = quote total for the same inputs (automated check).

### Phase 7 — Booking, payment & cancellation (Weeks 11–14)

- **Objective:** end-to-end booking with money moving correctly.
- **Deliverables:** order + hold, guest details, GSTIN capture, review & pay, Razorpay integration, webhooks, confirmation page, voucher PDF + `.ics`, notifications; My trips hotel cards and detail; self-serve cancellation with preview; refunds; hotel-initiated cancellation + relocation in admin.
- **Acceptance:** fake-Razorpay gate (♻ `test/helpers/fake-razorpay.mjs`) covers: success, failure, pending UPI, late capture after hold expiry (auto-refund), duplicate webhook, refund success/failure; zero double bookings in 1,000-iteration concurrency test.

### Phase 8 — Post-stay: reviews, payouts, analytics (Weeks 13–15)

- **Objective:** close the loop for guests, hotels and Rentra finance.
- **Deliverables:** review request + form with sub-scores; owner replies; payout eligibility rules; weekly payout run with commission, TCS, TDS; statements and commission invoices; owner analytics (MVP metrics); admin hotel analytics.
- **Acceptance:** payout statement for a test week reconciles to the paisa with payments minus refunds minus commission minus TCS/TDS; reviews only possible for stayed bookings.

### Phase 9 — Hardening, beta & launch (Weeks 15–18)

- **Objective:** safe launch with real hotels and real guests.
- **Deliverables:** security review (§8.9), load test, monitoring and alerts, runbooks (payment incident, overbooking, refund failure), support playbooks, closed beta (vertical `partners` + invite-only guests: Rentra team, friends, 100 existing customers), bug bash, launch campaign assets, switch vertical to `public`.
- **Acceptance:** 2 weeks of beta with ≥ 50 real bookings, zero overbookings, zero payment mismatches; all P1/P2 bugs closed; launch checklist (§11.4) signed.

### Phase 10 — Post-launch growth (Month 5 onward)

See §12 for the V1.1 and V2 backlog. Run in 2-week sprints, prioritised by KPIs.

---

## 10. Implementation roadmap

### 10.1 Team assumption (lean MVP)

| Role | Allocation |
| --- | --- |
| Product owner / founder (Bhavin) | Decisions, BD, hotel relationships |
| Full-stack developer ×2 (or 1 + AI-assisted development) | Backend + frontend |
| UI/UX designer | Part-time, Weeks 2–6, then on call |
| BD / onboarding executive | From Week 3, full-time in Surat |
| Ops / support (can be BD at first) | From beta |
| CA (external) | Phase 0 and payout setup |

With one developer, multiply build phases by ~1.6 (≈ 26 weeks to public launch).

### 10.2 Timeline (two developers)

```
Week:            1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18
P0 Discovery/BD  ██ ██
P1 UX design        ██ ██ ██
P2 Data/engine         ██ ██ ██ ██
P3 Owner onboard             ██ ██ ██ ██ ██
P4 Admin verify                    ██ ██ ██
P5 Extranet ops                       ██ ██ ██ ██
P6 Discovery UI                       ██ ██ ██ ██ ██
P7 Book/pay/cancel                             ██ ██ ██ ██
P8 Post-stay                                         ██ ██ ██
P9 Beta & launch                                           ██ ██ ██ ██
BD: hotel signing   ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░
```

### 10.3 Milestones

| # | Milestone | Week | Exit criteria |
| --- | --- | --- | --- |
| M1 | Business go/no-go | 2 | ≥ 15 LOIs, CA sign-off |
| M2 | Design approved | 4 | All MVP screens approved |
| M3 | Inventory engine done | 6 | Concurrency + pricing tests green |
| M4 | Hotels can onboard | 9 | 10 real hotels submitted in `partners` mode |
| M5 | Guests can browse | 12 | Hotels home, search, hotel page live behind flag |
| M6 | End-to-end booking | 14 | Test-mode bookings, refunds, notifications |
| M7 | Money loop closed | 15 | First payout statement reconciled |
| M8 | Closed beta | 16 | 40 verified hotels, invite-only guests |
| M9 | Public launch | 18 | Vertical `public`, campaign live |

### 10.4 Dependencies and critical path

```
Phase 0 (CA money-flow sign-off) ──▶ Phase 2 (tax_slab, payout fields) ──▶ Phase 7 ──▶ Phase 8 ──▶ Launch
Phase 1 (designs) ──▶ Phases 3, 5, 6 UI
Phase 2 (engine) ──▶ Phases 3 (room types), 5 (grid), 6 (availability), 7 (holds)
Phase 3 + 4 (approved hotels) ──▶ real content for Phase 6 QA ──▶ Beta
External: WhatsApp template approval (≈1–2 weeks), Razorpay live KYC for any new flow (Route), SMS DLT templates
```

**Critical path:** CA sign-off → engine → booking/payment → payouts → beta. Start WhatsApp/SMS template approvals in Week 6.

### 10.5 Priorities (MoSCoW for MVP)

| Must | Should | Could | Won't (MVP) |
| --- | --- | --- | --- |
| Search, hotel page, room selection, prepaid booking, cancel/refund, owner wizard, rate grid, reservations, approvals, payouts, reviews | Map view, landmark search, holiday presets, GST invoice for business, analytics basics | Recently viewed, price histogram, owner inbox | Pay at hotel, channel manager, coupons, loyalty, native apps, dynamic pricing |

### 10.6 Pre-existing work to finish first

From the current project state (see project notes):

1. Rotate the Neon database password (leaked in old git history) — **security blocker**.
2. Apply pending migrations to Neon in order (R0/R1 runbooks) so hotel migrations start from a clean, known schema.
3. Commit or close outstanding uncommitted Entertainment and Admin work so the hotel branch (`feat/hotels`) starts from a clean `master`.

---

## 11. Testing, deployment and launch

### 11.1 Test strategy

| Level | Scope | Tooling |
| --- | --- | --- |
| Unit | Pricing, tax slabs, cancellation calculator, policy text generator, date/night helpers | Node test runner (♻ `npm test`) |
| Property / concurrency | Holds never exceed allotment; quote = sum of nights; refunds never exceed paid | Node tests against disposable Postgres (♻ `127.0.0.1:55432` setup) |
| Integration / API | Every endpoint: happy path, validation, auth/role, cross-tenant access denied | supertest-style tests (♻ existing pattern) |
| Payments | Fake Razorpay state machine: success, failure, pending, late capture, duplicate webhooks, refund failure | ♻ `fake-razorpay.mjs`, fault proxy |
| E2E | Guest: search → book → cancel; Owner: onboard → set rates → check-in; Admin: approve → payout | Playwright with system Chrome (♻ fixture approach) |
| Visual & a11y | Key pages at 375 / 768 / 1280 px; axe scan | Playwright screenshots + axe-core |
| Performance | Search/availability load (100 rps), Lighthouse on SSR pages | k6 or autocannon; Lighthouse CI |
| UAT | 5 founding hotels run real (test-mode) bookings for a week | Beta checklist |

**Regression rule:** farmhouse and entertainment surfaces must render and price exactly as before (snapshot + quote-hash comparison, as done in the Entertainment phases).

### 11.2 Environments and deployment

| Env | Web | API | DB | Payments |
| --- | --- | --- | --- | --- |
| Local | `next dev` | `npm run dev` | Local Postgres | Fake Razorpay |
| Preview | Vercel preview per PR | Render preview / staging service | Neon branch | Razorpay test |
| Production | Vercel | Render (API + worker) | Neon main | Razorpay live |

- **Migrations:** additive and backward compatible (expand → deploy → contract). Backend deploys before frontend; frontend tolerates missing new fields (♻ rule).
- **Feature flag:** the vertical status (`hidden` → `partners` → `public`) is the launch switch; no code deploy needed to launch or roll back visibility.
- **CI:** lint, format, `db:check`, tests, build, axe on PRs (♻ `npm run ci`).
- **Rollback:** Vercel instant rollback; Render previous deploy; migrations never drop columns in the same release.

### 11.3 Monitoring and operations

- Sentry alerts: webhook handler errors, `SOLD_OUT` after payment (should be ~0), refund failures, 5xx > 1%.
- Daily ops digest (admin): pending approvals past SLA, holds stuck, unreconciled payments, payouts on hold.
- Runbooks: overbooking (relocate within 30 min), payment captured but booking failed (auto-refund + call), hotel unreachable on arrival (support escalation).

### 11.4 Launch checklist

- [ ] 40+ verified hotels live in `partners` mode with complete content and ≥ 8 photos each
- [ ] Every hotel has rates and inventory for the next 90 days
- [ ] Razorpay live mode tested with real ₹ bookings and refunds (team cards)
- [ ] WhatsApp/SMS/email templates approved and tested
- [ ] Partner agreement signed by every live hotel; commission rules entered
- [ ] Tax slabs entered and verified by CA on 5 sample invoices
- [ ] Support rota + WhatsApp support number staffed during launch weeks
- [ ] Policies published: hotel booking terms, cancellation, privacy update
- [ ] SEO: sitemap includes hotel pages, `robots` allows, JSON-LD validated
- [ ] Analytics events: search, view_item, add_to_cart (reserve), begin_checkout, purchase, cancel
- [ ] Backups and restore drill done; on-call contacts listed
- [ ] Vertical switched to `public`

---

## 12. Post-launch improvements and KPIs

### 12.1 V1.1 (months 1–3 after launch)

| Feature | Trigger to build | Impact |
| --- | --- | --- |
| Pay at hotel / part-pay | Conversion data shows drop at payment, hotels agree | +conversion for budget segment |
| Modify booking (dates/room) | Support tickets > 10% about changes | Lower support load |
| Coupons & hotel promotions | Need demand for weekdays | Fill weekday gaps |
| Channel manager integration (one provider first) | Hotels with 30+ rooms ask for it; manual sync errors | Supply growth, fewer overbookings |
| Google Hotels free booking links + price feed | 100+ hotels live | Free high-intent traffic |
| Corporate accounts (GST profile, monthly statement) | Inbound from Surat businesses | B2B revenue |
| Review photos, review search | 500+ reviews | Trust |
| Razorpay Route automatic split | Payout volume > 200/week | Cleaner money flow |
| Hotel health score + account-manager tools | 100+ hotels | Supply quality |
| Admin MFA | Before 3+ admin users | Security |

### 12.2 V2 (month 4+)

- Personalised ranking and recommendations; flexible-date price calendar.
- Revenue-management suggestions for hotels (area demand, events, competitor index).
- Loyalty / Rentra credits across verticals; referral programme.
- Group bookings (weddings, events at convention centres).
- Packages (stay + farmhouse day visit, stay + entertainment session) — unique cross-vertical offer.
- Native apps (Expo) once 30-day repeat rate > 20%.
- Gujarati and Hindi UI.
- PMS-lite (housekeeping status, folio, POS) as a paid tier.
- Search service (Typesense/Meilisearch) when hotel count or latency requires it.

### 12.3 KPI dashboard (weekly review)

| Funnel | KPI |
| --- | --- |
| Acquisition | Sessions by channel, CAC, SEO landing traffic |
| Discovery | Search → hotel page CTR, zero-result rate (< 5%) |
| Conversion | Hotel page → reserve, reserve → paid, overall conversion |
| Booking quality | Cancellation rate, hotel-caused cancellations, no-show rate, disputes per 100 bookings |
| Supply | Live hotels, rooms, inventory freshness (updated in last 7 days), approval SLA |
| Money | GMV, net revenue, take rate, refunds %, payout on-time % |
| Satisfaction | Review score avg, NPS (guest + hotel), support first-response time |

---

## 13. Risks and open decisions

### 13.1 Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Overbooking because hotels forget to update Rentra | High | High | Allotment model, quick close-out on phone, daily "confirm inventory" nudge, channel manager V1.1, penalty + relocation policy |
| Low supply quality (fake photos, poor rooms) | Medium | High | Verification visit, photo shoot for founding partners, review-based ranking, takedown |
| Guests book on Rentra then contact hotel directly to bypass | Medium | Medium | Contact revealed only after booking, value-add (support, refunds). No wide price-parity clause without legal advice (CCI acted against parity obligations in online hotel booking in 2022) |
| Tax / ECO compliance error | Medium | High | CA sign-off, effective-dated tax table, monthly reconciliation |
| Payment edge cases (late capture, refund failures) | Medium | High | Webhook-first design, fake-gateway gates, daily reconciliation |
| National OTA price competition | High | Medium | Local niche filters, lower commission → hotels give Rentra better rates/allotment, cross-vertical loyalty |
| Small team stretched across three verticals | High | Medium | Reuse platform (♻ everywhere), strict MVP scope, phase gates |

### 13.2 Decisions needed from the owner

| # | Question | Default if no answer |
| --- | --- | --- |
| Q1 | Brand: "Rentra Stays" inside Rentra, or just "Hotels" tab? | "Hotels" tab, "Rentra Stays" in marketing only |
| Q2 | Launch commission 10% founding / 13% standard? | Yes |
| Q3 | Guest convenience fee at launch? | No fee |
| Q4 | Homestays included at launch or hotels/resorts only? | Hotels + resorts + boutique; homestays in V1.1 |
| Q5 | Pay at hotel in MVP? | No (V1.1) |
| Q6 | Launch city and date? | Surat, Week 18 after kickoff |
| Q7 | Show exact address before booking? | Yes for hotels (unlike farmhouses), owner can turn off |
| Q8 | Couple-friendly / local-ID filters wording | "Couple-friendly" and "Local ID accepted"; hotel must confirm in policies |
| Q9 | Who issues the guest tax invoice PDF — Rentra on behalf of hotel, or hotel? | Rentra generates on behalf, hotel opts in during onboarding |
| Q10 | First channel manager to integrate in V1.1? | Decide from what founding hotels use (collect in Phase 0) |

---

## Appendix A — Glossary

| Term | Meaning |
| --- | --- |
| ADR | Average daily rate = room revenue ÷ room nights sold |
| Allotment | Rooms of a type the hotel makes available on Rentra for a night |
| ARI | Availability, rates and inventory |
| CTA / CTD | Closed to arrival / departure on a date |
| EP / CP / MAP / AP | Room only / with breakfast / breakfast + one meal / all meals (stored as `EP`, `CP`, `MP`, `AP`) |
| ECO | E-commerce operator (GST law term for a marketplace like Rentra) |
| Hold | Temporary reservation of inventory during checkout (15 min) |
| Rate plan | A sellable price + conditions combination for a room type |
| RevPAR | Revenue per available room = ADR × occupancy |
| Room night | One room for one night |
| Stop-sell | Owner closes a room type for a date |
| TCS / TDS 194-O | Taxes Rentra collects/deducts on payouts to hotels |

## Appendix B — Existing Rentra pieces this plan reuses

`vertical` registry and vertical tabs · `rentable` and listing lifecycle (`draft → pending_review → pending_verification → live`) · owner onboarding and property drafts · `listing_submission` / `listing_review` / `verification_visit` / `document` · `amenity` + `amenity_vertical` · `booking_order` / `booking_quote` / holds and idempotency · `booking`, `booking_cancellation`, `booking_price_override`, `booking_case` · `payment_*`, `refund*`, settlement and investigation tools · `payout` (commission, TDS 194-O, GST TCS) and `payout_destination` · `review`, `review_report` · `dispute_*` · `notification_outbox`, `owner_notification` · `client_staff` / `staff_property` roles · `audit_log` · admin capability system and workspaces · Emerald & Champagne design system and shared components · fake-Razorpay and fault-proxy test gates · cron worker.
