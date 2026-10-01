# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Guests discover places, compare facilities and date-dependent prices, save places, and manage bookings and account tasks. Owners use the partner workspace to onboard, maintain listings and availability, handle bookings, and review financial records. Administrators manage the marketplace through capability-gated operational screens. Caretakers use a separate, phone-first workspace for assigned visits.

These roles and workflows are evidenced by the existing route groups, session guards, forms, and API adapters. Actual access and available actions depend on the authenticated role, account status, and capabilities returned by the API.

## Product Purpose

RENTRA is a rental marketplace starting with farm villas, farmhouses, vacation stays, and property/event rentals. The current public experience supports discovering places for day visits and overnight stays, selecting booking dates and visit slots, and proceeding through existing booking and checkout flows.

The user's longer-term vision includes vehicles and other rentable assets. That vision is not evidence that those categories are currently bookable. Extend the existing product incrementally rather than rebuilding working functionality.

## Operating Context

Discovery starts at the home page, taxonomy pages, or search. Guests review listing imagery and facilities, choose dates, a visit slot, and guests, then inspect an API-backed quote before booking. Saved places, bookings, support, disputes, reviews, and account/privacy tasks have dedicated surfaces.

Owner workflows include onboarding, listing setup, calendar management, booking operations, reviews, team access, support, updates, and financial records. Administrator workflows include catalogue/content management, applications, properties, bookings and booking cases, customer/client records, finance, support, disputes, privacy, security, audit, and operations. Route existence alone does not establish that every workflow is available to every account.

## Capabilities and Constraints

- Preserve the existing routes, query parameters, authentication/session behavior, permissions, API contracts, booking rules, money formatting, form validation, and mutation semantics during UI work.
- The current redesign is frontend-only. No new API or backend changes are required or implied by this design record.
- Listing photos, prices, ratings, review counts, badges, facilities, availability, published support contacts, and policy content must reflect real data. Missing data needs an honest empty, unavailable, or pending state.
- Display estimated/from prices separately from authoritative date-and-guest quotes. Keep platform fees and other existing financial details visible in their appropriate context.
- RENTRA is an intermediary facilitating bookings between owners and guests; the existing public footer states that it is not the owner, lessor, or operator of properties.
- Optional partner caching and role-specific capabilities remain implementation-controlled. UI availability must not substitute for backend authorization.

## Brand Commitments

Preserve the RENTRA name and delivered brand artwork. The user's requested character is premium, trustworthy, relaxing, nature-oriented, discovery-led, comfortable, modern, and simple. Create an identifiable RENTRA experience using existing assets rather than copying another marketplace or a generic SaaS template.

Copy should make the next action and the current state clear. Do not fabricate verification, guarantees, testimonials, booking counts, trust claims, or functionality to make a screen appear more complete.

## Evidence on Hand

- `public/brand/rentra-mark.svg`, `rentra-lockup.svg`, and `rentra-lockup-inverse.svg`: delivered identity assets.
- `public/images/guest-login.jpg` and `partner-login.jpg`: existing authentication imagery.
- `assets/fonts/PlusJakartaSans-latin-variable.woff2`: the checked-in Latin variable face used by the public and portal layouts.
- `lib/api/endpoints.js`, `lib/services/`, and `lib/actions/`: existing reads, browser queries, and server mutations.
- `lib/domain/` and `lib/validation/zod/`: domain presentation and validation behavior to preserve.
- `docs/rentra-ui-route-inventory.md`: complete page-route inventory and architecture summary.
- Listing photography and listing-specific claims are supplied by discovery/listing data, not by the identity files.

This document records product constraints and repository evidence. It does not assert production deployment, availability, performance scores, accessibility certification, or successful QA.

## Product Principles

1. Make discovery, selection, price review, and booking understandable in sequence.
2. Preserve truthful data and financial distinctions through every state.
3. Reuse the working component, route, and permission system before adding new abstractions.
4. Keep guest discovery expressive and operational workspaces efficient.
5. Give each pending, empty, error, unavailable, and permission-limited state a clear explanation and a supported next action.

## Accessibility & Inclusion

The existing UI includes semantic controls, keyboard focus treatments, skip links, reduced-motion support, tabular figures, and language-specific line-height rules. Preserve these affordances and usable touch controls. The public root currently declares English. Gujarati and Devanagari fallback family names in CSS do not imply that their font files or localized product flows are shipped.

## Open Decisions

Additional rental categories, new backend capabilities, and additional language delivery remain outside this frontend redesign. Record any missing capability separately before proposing an API change.

An **Entertainment** vertical (sports courts, turfs, bowling, gaming and play zones, booked by the hour per court) was approved on 1 Oct 2026 and is planned, with backend changes, in `docs/ENTERTAINMENT-PLAN.md`. It is not bookable until that plan's launch switch makes it public. Until then, the guest-facing product remains farmhouses only.
