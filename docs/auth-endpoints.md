# Better Auth endpoint exposure

## Clarifying server function behavior

TanStack Start server functions are invoked through the app's request handler and ultimately run inside the worker `fetch` entry point. They are not an out-of-band internal call path.

This matters because Better Auth endpoints are exposed via HTTP routes. If the worker forwards `/api/auth/*` to `authService.handler`, those endpoints can be called directly from the browser with valid session cookies. Server functions do not make those endpoints private.

## Better Auth endpoints that must remain public

These endpoints are external-facing by design and should remain exposed:

- Stripe webhook
  - `POST /api/auth/stripe/webhook`
  - Required for Stripe event delivery.

- Magic link verification
  - `GET /api/auth/magic-link/verify`
  - Needed for users clicking emailed magic links.

- Stripe subscription callbacks
  - `GET /api/auth/subscription/success`
  - `GET /api/auth/subscription/cancel/callback`
  - Required for Stripe checkout and billing portal redirects.

## Stripe subscription actions

These Stripe subscription endpoints are Better Auth HTTP routes, but we should not expose them directly. The intent is to call them only from server functions:

- `POST /api/auth/subscription/upgrade`
- `POST /api/auth/subscription/billing-portal`
- `POST /api/auth/subscription/cancel`
- `POST /api/auth/subscription/restore`
- `GET /api/auth/subscription/list`

Only the Stripe callbacks and webhook should be exposed publicly. The subscription actions should remain behind server functions by removing the blanket `/api/auth/*` passthrough and whitelisting just the required public endpoints.

## Recommendation

- Replace the wildcard `/api/auth/*` handler with explicit routes, similar to `refs/crrbuis/workers/app.ts`.
- Continue exposing `stripe/webhook`, `magic-link/verify`, and Stripe callback URLs.
- Consider proxying subscription actions through server functions and not exposing those routes directly.
