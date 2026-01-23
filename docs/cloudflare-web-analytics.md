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
   - Read `context.env.ANALYTICS_TOKEN` and return a boolean plus the token string (or `null`).

2. **Expose to root route context**
   - Use `beforeLoad` on the root route to call the server function.
   - Merge the returned analytics data into the root route context so it is available to the shell.

3. **Conditional script injection**
   - In `RootDocument`, only render the beacon script if the token is non-empty.
   - Use the token in `data-cf-beacon`.

## Cloudflare Web Analytics Script

Cloudflare’s standard beacon script:

```html
<script
  defer
  src="https://static.cloudflareinsights.com/beacon.min.js"
  data-cf-beacon='{"token": "<ANALYTICS_TOKEN>"}'
></script>
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
