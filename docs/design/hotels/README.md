# Hotels · Phase 1 design spec

Phase 1 ("Product & UX design") of [HOTEL-PLAN.md](../../HOTEL-PLAN.md). This folder holds the clickable prototype, the screen and state inventory, component specs, the copy deck and the usability-test script.

- **Open the prototype:** `docs/design/hotels/index.html` in a browser (works from disk, no server needed).
- **Switch states:** use the dark bar at the top of each screen, or add `?state=<name>`.
- **Not production code.** Values come from [DESIGN.md](../../../DESIGN.md) tokens. Photos are striped placeholders; names, prices and counts are sample data.

## 1. Files

| File | Purpose |
| --- | --- |
| `index.html` | Prototype hub: every screen grouped by guest, owner and admin, plus the guest flow as links |
| `mock.css` | Base mock styles, copied from the Entertainment Phase 2 mockups (header, hero, cards, footer) |
| `hotels.css` | Hotel components, portal shell, rate grid, states |
| `chrome.js` | Header with three vertical tabs, footer, owner/admin sidebar and phone bottom bar, prototype state bar |
| `icons.js` | Entertainment draft icons plus hotel icons; `tab-hotel` is the new 32 px duotone vertical icon |
| `*.html` | Hub + 14 screens (below) |

## 2. User flows

### Guest — find and book

```
Hotels home ─search─▶ Results ─card─▶ Hotel page ─select rooms─▶ Reserve
   │                   │  filters/sort/map    │ dates/guests change → prices refresh in place
   │                   └─ 0 results → "Clear N filters" / busy dates → "Try 19–21 Nov"
   ▼
 Login (OTP, existing) if needed ─▶ Guest details ─▶ Review & pay ─Razorpay─▶ Confirmed ─▶ My trips
                                         │ hold 15 min (timer; warning at 2 min; extend once)
                                         ├─ price changed → old vs new, pay new price
                                         ├─ payment failed → "You weren't charged", hold kept, Try again
                                         ├─ UPI pending → wait screen, hold extended to 30 min
                                         └─ hold expired → "Check availability again" (details kept)
```

### Guest — cancel

```
My trips ─▶ Booking detail (timeline, free-until countdown) ─▶ Cancel booking
   ─▶ dialog: refund amount first, optional reason ─▶ Cancelled + refund started (amount, method, days)
```

### Owner — onboard

```
List your hotel ─▶ Wizard 1–10 (autosave; assisted mode for BD)
   5 Amenities ─▶ 6 Room types (count check vs total rooms) ─▶ 7 Rates & plans (live tax + commission preview)
   ─▶ 8 Policies ─▶ 9 Tax & payouts ─▶ 10 Check & submit (agreement + OTP)
   ─▶ In review ─▶ Needs changes (per-field reasons) / video walkthrough ─▶ Approved (partners) ─▶ Live
```

### Owner — run the day

```
Today: arrivals ─▶ Check in   |  after check-in + 6 h ─▶ No-show (charge shown, reason required)
       Needs you ─▶ open rooms / reply to reviews / extend rates
Rates & rooms: click cell ─▶ type ─▶ Enter (optimistic, rollback toast on failure)
               drag cells or "Bulk edit" ─▶ drawer ─▶ preview "31 nights change" ─▶ Apply
New booking ─▶ WhatsApp + in-app banner ─▶ Bookings drawer (money breakdown) ─▶ Earnings / payouts
```

### Admin — approve and configure

```
Applications (Waiting / Overdue / Visit due / Sent back) ─▶ hotel ─▶ Checks
   all checks green ─▶ Approve  |  issues ─▶ Request changes (pick items + note)  |  Reject (reason)
Commission ─▶ Add rule (property / city / vertical, dates, reason) ─▶ impact preview ─▶ Save
```

## 3. Screen and state inventory

| Screen | States in the prototype | Phone treatment |
| --- | --- | --- |
| Hotels home (`home.html`) | Default · Dates open · Rooms & guests open | Three vertical pills in the hero; stacked search card; pickers become bottom sheets |
| Results (`results.html`) | Results · Loading · No results · Busy dates · Mobile filter sheet | Summary bar + edit; filter/sort chips; floating Map button; filters as a bottom sheet |
| Hotel page (`hotel.html`) | 1 room selected · Nothing selected · Too many guests · Prices loading | One-photo gallery; plan rows stack price above the stepper; sticky bottom bar with total and Reserve |
| Checkout (`checkout.html`) | Guest details · Review & pay · Hold < 2 min · Price changed · Payment failed · UPI pending · Hold expired | Summary moves above the form |
| Confirmation (`confirmation.html`) | Confirmed · Confirming payment | Same layout, single column |
| My trips (`trip.html`) | List · Booking detail · Cancel dialog · Cancelled | Photo column 112 px |
| Owner onboarding (`owner-onboarding.html`) | Step 6 Rooms · Step 7 Rates & plans · Step 10 Submit | Step list hidden; sticky footer with Back / Save and continue |
| Owner Today (`owner-today.html`) | Today · No-show confirm · New booking alert | Bottom bar: Today, Rates, Bookings, Property, More |
| Rates & rooms (`owner-rates.html`) | Grid · Bulk edit drawer · Inline edit · Edit refused | Grid replaced by a day list with steppers and "Close all for tonight"; drawer becomes a sheet |
| Owner bookings (`owner-bookings.html`) | List · Booking drawer · No bookings | Register rows stack; drawer becomes a sheet |
| Owner earnings (`owner-earnings.html`) | Default | 36 px headline; table rows stack |
| Admin applications (`admin-approvals.html`) | Checks · Request changes | Queue above detail |
| Admin commission (`admin-commission.html`) | Rules · Add rule | Rows stack |
| States gallery (`states.html`) | Loading, empty, error, toast patterns | — |

## 4. Component specs (new or extended)

Existing components are named as in DESIGN.md. "New" components are built in later phases (Phase 5–7); props listed are the minimum needed.

| Component | Status | Spec |
| --- | --- | --- |
| Vertical tabs | Extend | Third tab "Hotels" with `tab-hotel` icon (champagne facade, emerald frame, sage windows, one amber lit window). Rule unchanged: one tab per public vertical. Phones: three equal pills, label "Play" for Entertainment to fit 390 px — **owner to confirm** |
| `SearchBar` | Extend | Cells for hotels: Where · Check-in – Check-out · Rooms & guests. Each cell ≥ 44 px. Compact variant on results |
| `RoomsGuestsPicker` | New | Per room: adults (1–6), children (0–4) with a required age select each; "+ Add room" up to 8; "Remove" on rooms 2+. Steppers are `role="spinbutton"`; minus disabled at minimum |
| `DateRangePicker` | Extend | Two months desktop / one scrolling month phone; past dates struck through; range wash in `brand-50`; ends in `brand-600` circles; header shows "N nights"; min-stay hint text |
| `ListingCard` (hotel, horizontal) | Extend | 200 px photo; name; score chip (`brand-600`, 10-point) + label + count + type; area + distance; first room + meal; free-cancellation line with date; max 2 policy chips; price block right: "2 nights · 2 adults", total, "incl. ₹X taxes". "N rooms left" only when ≤ 3 and true |
| `FilterPanel` / `FilterSheet` | Extend | Groups with counts; zero-count options disabled, not hidden; price histogram (in-range bars `brand-200`); applied filters as removable chips above results |
| Map | Extend | Price pins (white; selected `brand-600`, scale 1.15); "Full" pins for sold out; landmark dot; "Search as I move the map" off by default |
| `RoomTypeCard` | New | Photo, name, "N left" (≤ 3), fact row (beds, m², max guests, view, AC), amenities line, "Room details" |
| `RatePlanRow` | New | Plan name + badge (Popular / Save 10%), policy line (green check or amber "No refund"), total for stay + "₹X / night + ₹Y tax", stepper. Selected row: `brand-50` + 3 px left bar. Sold out: "Sold out for your dates · Free from {date}" link |
| `PolicyLine` | New | Generated from the plan's rules, never free text: "Free cancellation until {Mon 16 Nov, 12:00}" / "No refund after booking" |
| Booking rail / mobile bar | Extend | Editable dates/guests box; lines per selection; GST line; total 30 px; free-cancellation line; Reserve; "You won't be charged yet" |
| `HoldTimer` | New | Neutral pill "Rooms held for mm:ss"; at < 2 min warning tone + "Keep holding" (once). Screen readers: polite update each minute, not each second |
| `PriceBreakdown` | Extend | Line per room plan × nights; native `<details>` "Per night"; GST line names the slab ("₹7,500 or less per night") |
| Status banners | Reuse | Price changed (info, shows old struck vs new), payment failed (danger, "You weren't charged"), pending (info, "Don't pay twice"), hold expired (warning + action) |
| Booking timeline | New | 5 steps; done = filled `brand-600`; next = outlined; cancelled path swaps steps to Cancelled → Refund sent → Refund received |
| Owner Today tile | Extend | Existing inverse Today tile; hotel counts: Arriving / In-house / Leaving / Rooms open tonight; tabs for the three lists; champagne "Check in" |
| `RateGrid` | New | Sticky header row (date + weekday; weekend nights tinted; today = filled circle) and sticky first column. Rows per room type: Rooms open to Rentra, Booked, base plan ₹, derived plans ("auto"), Min nights. Cell marks: custom price = purple tint (existing calendar convention), closed = hatched + "Closed", ≤ 2 open = amber, 0 = red. Inline edit: Enter saves, Esc cancels; refused edit shows a red tooltip with the reason |
| `BulkEditDrawer` | New | Dates, night-of-week toggles, room types, one action (set price · change % · rooms open · close · min nights), live preview "N nights change", primary "Apply to N nights" |
| Owner booking drawer | New | Guest, stay, request, GST invoice details, money: room, GST (hotel files), commission, GST on commission, TCS + TDS, "You receive"; payout date |
| Approval checklist | New | Rows: icon (done / warning / open), title + evidence line, action. Approve disabled until all done, with the reason |

## 5. Copy deck

### Vocabulary

| Use | Not |
| --- | --- |
| stay, nights, rooms, guests, adults, children | visit, slot, players |
| check-in, check-out | handover, return |
| room type, plan, rate | rentable, unit, SKU |
| "Price incl. taxes" / "incl. ₹X taxes" | "+ taxes & fees" |
| "Free cancellation until {day date}, {time}" | "Free cancellation" (no date) |
| "Non-refundable" / "No refund after booking" | "Strict" (to guests) |
| Owner screens: Bookings, Earnings, Payout, Owner | Reservations, Allocation, Partner |

### Key strings

| Context | String |
| --- | --- |
| Search cell placeholders | "City, area, landmark or hotel" · "Wed 18 Nov – Fri 20 Nov · 2 nights" · "1 room · 2 adults" |
| No dates on card | "from ₹2,600 / night" + "Add dates for exact prices" |
| Scarcity (true only) | "2 rooms left at this price" |
| Reserve helper | "You won't be charged yet. Rooms are held for 15 minutes at checkout." |
| Hold | "Rooms held for 14:32" → "Hold ends in 01:48 · Keep holding" |
| Price changed | "The price changed for your dates" / "The hotel updated its rate after you searched." |
| Payment failed | "Payment didn't go through. You weren't charged." |
| UPI pending | "Waiting for your bank to confirm" / "Don't pay twice." |
| Hold expired | "Your hold expired" → "Check availability again" |
| Sold out during checkout | "The last Deluxe room was just booked." → "See other rooms" |
| Confirmation | "You're booked!" / "Confirmation sent to WhatsApp {phone}" |
| Cancel dialog | "Cancel this booking?" / "You'll get ₹6,510 back" / buttons "Keep booking" · "Cancel and refund ₹6,510" |
| Cancelled | "Cancelled. ₹6,510 refund started." / "To your UPI account in 5–7 working days." |
| No results | "No stays match all your filters" → "Clear 4 filters" |
| Busy dates | "{Area} is busy on {dates}" → "Try {dates} · N stays" |
| Owner refused edit | "Max 4 on Fri 20: 8 of 12 Deluxe rooms are booked" |
| Owner no-show | "Mark {guest} as no-show?" / "The guest can dispute within 12 hours, so say what happened." |
| Owner empty | "No bookings yet" / "Guests can book once rooms are open and rates are set for upcoming dates." |
| Admin approve disabled | "Approve unlocks when every check is done." |

## 6. Decisions taken in Phase 1 (owner can overturn)

| # | Decision | Reason |
| --- | --- | --- |
| P1-1 | Guest review score shown on a 10-point chip ("8.8 Very good"); stars only for the declared hotel class | Hotel guests compare on 10-point scores (Booking.com, Agoda); avoids confusing ★ rating with hotel class |
| P1-2 | Room selection is room cards with plan rows, not a wide table | Works the same on 390 px phones; no sideways scrolling |
| P1-3 | Owner portal labels follow DESIGN.md: **Bookings**, **Earnings**; the hotel calendar is named **Rates & rooms** | DESIGN.md vocabulary; "Calendar" alone undersells price editing. Supersedes "Reservations" / "Payouts & invoices" in HOTEL-PLAN §5 |
| P1-4 | Hotel staff appear under **Team** (Manager, Front desk, Accounts), not "Caretakers" | Caretaker is farmhouse vocabulary |
| P1-5 | Front desk's main mobile action is "Close a room" in the top bar | Fastest path for overbooking prevention |
| P1-6 | Owner sees GST passed through to them and every deduction per booking | Trust in payouts; matches the plan's tax flow |
| P1-7 | Phone vertical pills read "Farmhouse · Play · Hotels" | Three labels must fit 390 px |

## 7. Usability test script (owner to run)

**Guests (5 people, mix of existing Rentra customers; 20 min each; phone)**

1. "You need a hotel in Adajan for 18–20 Nov for you and your partner. Find one with breakfast and free cancellation." — success: reaches the hotel page with the breakfast plan selected.
2. "How much will you pay in total, and until when can you cancel for free?" — success: states ₹6,510 and 16 Nov 12:00 without help.
3. "Add one more guest." — success: understands the "Add 1 more room" message.
4. "Pay." (state: Payment failed) "What happened to your money?" — success: says they were not charged.
5. "Cancel the booking. How much comes back?" — success: answers before confirming.

**Hotel staff (3 people: owner, manager, front desk; 15 min each)**

1. "Close Deluxe for tonight." — target < 30 s.
2. "Raise all December weekend prices to ₹3,200." — success: uses Bulk edit with Fri–Sat nights only.
3. "Guest RS-4HT7Z did not arrive. What do you do and what does the guest pay?"
4. "How much will you receive for Priya Shah's booking, and when?"

Record: task success (yes / with help / no), time, quotes, and where they hesitated. Fix anything that fails 2 or more people before Phase 3 UI work.

## 8. Approval checklist (owner)

- [ ] Header tab and `tab-hotel` icon
- [ ] Hotels home layout and search cells
- [ ] Results card content and filters list
- [ ] Hotel page: room cards with plan rows; 10-point score chip (P1-1)
- [ ] Checkout states and copy
- [ ] My trips and cancellation flow
- [ ] Owner wizard steps 6, 7, 10
- [ ] Owner Today, Rates & rooms grid and bulk edit, Bookings, Earnings
- [ ] Admin applications and commission rules
- [ ] Decisions P1-1 to P1-7
- [ ] Usability sessions run (§7) and findings recorded
