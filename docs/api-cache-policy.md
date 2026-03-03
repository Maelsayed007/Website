# API Cache Policy

## Classes

- `private-no-store`: authenticated/admin/session/payment endpoints. Must set `Cache-Control: private, no-store, max-age=0`.
- `public-swr`: public, non-sensitive, read-only GET endpoints only. Use `s-maxage` + `stale-while-revalidate`.

## Current classification

- `apps/customer-site/src/app/api/bookings/route.ts` GET: `private-no-store`
- `apps/customer-site/src/app/api/payments/route.ts` GET: `private-no-store`
- `apps/customer-site/src/app/api/admin/users/route.ts` GET: `private-no-store`

## Guardrails

- Do not cache endpoints that rely on `validateSession`, admin cookies, payment tokens, or PII.
- Any new public GET route must explicitly declare cache behavior in code review.
