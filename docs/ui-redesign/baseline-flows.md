# Baseline Flow Behaviors (Pre-Redesign)

This document captures the runtime contracts that must remain stable during the redesign and reorganization program.

## Global Invariants
- Route URLs remain unchanged.
- Existing Supabase and Stripe API contracts remain unchanged.
- Booking and payment calculations remain unchanged.
- Locale behavior remains unchanged (`NEXT_LOCALE` cookie based).

## Home and Entry
- `/` renders `LandingPageContent` with server-hydrated `gallery`, `offers`, `boats`, `models`, `prices`, `tariffs`, `extras`.
- Reservation form dispatches by active tab:
  - `houseboats` -> `/houseboats` with `from`, `to`, `guests`, `boats`, `type`
  - `river-cruise` -> `/river-cruise` with `from`, `to`, `guests`, `type`
  - `restaurant` -> `/restaurant` with `from`, `to`, `guests`, `type`

## Houseboat Search and Detail
- `houseboats` listing computes availability against booked units and model capacity.
- Listing supports:
  - `type=overnight` with weekday/weekend + prep fee
  - `type=day_charter` with day pricing path
- Detail page checkout handoff contract:
  - `/checkout?boatId=<id>&from=<iso>&to=<iso>&guests=<n>&type=<overnight|day_charter>`

## Checkout
- Checkout modes supported:
  - `houseboat`
  - `combo`
  - `river-cruise`
- Price computation contracts remain unchanged:
  - Houseboat: weekday/weekend + prep fee + extras
  - Combo: manual per-person pricing
  - River cruise: package pricing + optional menu costs + optional offer discount

## Payment Token Flow
- `/payment/[token]` state machine:
  - `loading`
  - `valid`
  - `invalid`
  - `verifying`
  - `success`
- APIs:
  - `GET /api/payments/link/validate?token=...`
  - `POST /api/payments/create-checkout-session`
  - `POST /api/payments/verify-session`
  - `POST /api/payments/request-new-link`

## Auth and Account
- Login/register create or use profile records with permission object.
- Redirect contract:
  - dashboard access -> `/dashboard/houseboat-reservations` (or dashboard)
  - non-dashboard users -> `/my-bookings`
- `/my-bookings` remains client self-service + optional staff dashboard shortcut when permissions allow.

## Shell and Locale
- Non-home, non-checkout routes render shared header.
- Non-checkout routes render footer.
- Locale is selected via cookie and dictionaries are loaded server-side.
