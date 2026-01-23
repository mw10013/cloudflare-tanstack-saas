# Cloudflare Web Analytics (Plan)

## Goal

Add Cloudflare Web Analytics to the app in a TanStack Start-friendly way. The beacon script should only render when the `ANALYTICS_TOKEN` env var is populated.

## Current State

- `ANALYTICS_TOKEN` exists in `worker-configuration.d.ts` and `wrangler.jsonc`.
- The root document lives in `src/routes/__root.tsx` via `shellComponent` and is the correct place to add global scripts.
- Route context already carries `env` into server functions (see `src/routes/login.tsx`).

## TanStack Start Integration Pattern

1. **Server access to env**
   - Create a `createServerFn` in `src/routes/__root.tsx`.
   - Read `context.env.ANALYTICS_TOKEN` and return a `string` (empty string when unset).

2. **Expose to root route**
   - Use `loader` on the root route to call the server function.
   - Read `Route.useLoaderData()` in the shell to access the token.

3. **Conditional script injection**
   - In `RootDocument`, only render the beacon script when the token is non-empty.
   - Use the token in `data-cf-beacon`.

## Return Shape Trade-offs

- **`string` only (recommended)**
  - Pros: simplest API, no extra fields, empty string is a clear “off” signal.
  - Cons: consumers must treat empty string as disabled and avoid accidental usage.

- **`boolean` + `string`**
  - Pros: explicit enable flag can be clearer when multiple analytics vendors exist.
  - Cons: redundant state and risk of mismatched values.

**Recommendation:** return only the token string and treat an empty string as “analytics disabled.”

## Cloudflare Web Analytics Script

Cloudflare’s standard beacon script:

```html
<!-- Cloudflare Web Analytics -->
<script
  defer
  src="https://static.cloudflareinsights.com/beacon.min.js"
  data-cf-beacon='{"token": "<ANALYTICS_TOKEN>"}'
></script>
<!-- End Cloudflare Web Analytics -->
```

## Proposed Implementation Outline

- `src/routes/__root.tsx`
  - Add a server function to read `ANALYTICS_TOKEN` from `context.env`.
  - Add a `beforeLoad` to pass analytics data to context.
  - Update `RootDocument` to render the script only when a token is present.

## Validation Checklist

- With `ANALYTICS_TOKEN` empty, no analytics script is injected.
- With `ANALYTICS_TOKEN` populated, the script is injected once in the root HTML.
- No hydration warnings or SSR mismatches.
