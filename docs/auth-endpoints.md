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

## Allowlist approach (TanStack Start idioms)

The most idiomatic TanStack Start approach is to keep `/api/auth/$` and add server-route middleware that blocks requests whose path/method are not in an allowlist. Middleware runs for all handlers in the route, so you only need to define the allowlist once and let GET/POST share it.

Implementation sketch:

- Add `server.middleware` on `/api/auth/$`.
- In the middleware, read `request.method` and `new URL(request.url).pathname`.
- Allow only the small set of public endpoints.
- Return `new Response("Not Found", { status: 404 })` for any other path.

This avoids duplicating allowlists across GET/POST handlers and keeps the route file small. Handler-specific allowlists are possible, but they tend to drift because you would need to maintain separate lists in both `GET` and `POST` handlers.

## Recommendation

- Keep `/api/auth/$` but add a single middleware allowlist.
- Allow only `stripe/webhook`, `magic-link/verify`, and Stripe callback URLs.
- Keep subscription actions behind server functions, not the public allowlist.
