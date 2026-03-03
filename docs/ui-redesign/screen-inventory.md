# Route and Locale Coverage Matrix

## Public/Core Routes in Scope
- `/`
- `/houseboats`
- `/houseboats/[slug]`
- `/restaurant`
- `/river-cruise`
- `/offers`
- `/offers/[id]`
- `/gallery`
- `/contact`
- `/checkout`
- `/checkout/success`
- `/payment/[token]`
- `/payment-instructions`
- `/login`
- `/register`
- `/confirm-email`
- `/my-bookings`
- `/privacy`
- `/terms`

## Shared Shell Contract
- Header visible on all public routes except homepage custom behavior and checkout/payment contexts that explicitly override.
- Footer visible on all public routes except checkout/payment contexts.

## Locales
- `en`
- `pt`
- `de`
- `es`
- `fr`
- `it`
- `nl`

## Breakpoints for Acceptance
- Mobile: 375px
- Tablet: 768px
- Desktop: 1280px
- Wide: 1440px
