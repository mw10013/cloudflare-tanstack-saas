# Integration tests with workerd (TanStack Start + Cloudflare bindings)

This project runs route-level integration tests inside the real Cloudflare Workers runtime (workerd) using `@cloudflare/vitest-pool-workers`.

The tests make real HTTP requests against the worker via `SELF.fetch()`, so they exercise:

- SSR routes (HTML rendering)
- API routes
- Cloudflare bindings at runtime (D1, KV, etc.)

## Why we build before testing

workerd executes JavaScript modules. It does not load/transform the app’s TypeScript/TSX source like Vite dev does.

TanStack Start SSR also expects build artifacts (router/start entries and a Start manifest) that are produced by the TanStack Start Vite plugin during `vite build`.

So integration tests run the **local build output**:

- Build: `pnpm build:test` (same pipeline as `pnpm build`, without setting production env)
- Test runtime: workerd via `@cloudflare/vitest-pool-workers`

This avoids any stubbing of TanStack Start internals and keeps SSR behaviour consistent with the real output we deploy.

## Build output used by tests

`pnpm build:test` produces:

- `dist/server/index.js`  the server/worker entry used for workerd tests
- `dist/server/assets/worker-entry-*.js`  the bundled worker code
- `dist/server/assets/_tanstack-start-manifest_v-*.js`  the Start manifest as a real module

Integration tests point workerd at `dist/server/index.js`.

## Wrangler bindings and environments

Integration tests use the top-level settings in `wrangler.jsonc` (the same behaviour as local dev).

We do **not** run with `--env production`, and we do **not** add a `wrangler env.test`.

That means tests run with:

- local `vars` in `wrangler.jsonc`
- local D1 database binding (e.g. `D1` -> `d1-local`)
- local KV namespace binding (e.g. `KV` -> `kv-local`)

## How to run

- Build + run integration tests:
  - `pnpm test:integration`

`test:integration` runs:

- `pnpm build:test`
- `pnpm vitest --config test/integration/vitest.config.ts run`

## Adding tests

Place integration tests in:

- `test/integration/*.test.ts`

Use:

- `SELF.fetch("http://example.com/<path>")` to hit routes
- `env.D1`, `env.KV` from `cloudflare:test` (if you need to validate DB/KV effects)

## Configuration

- Test runner config: `test/integration/vitest.config.ts`
  - Uses `defineWorkersProject` from `@cloudflare/vitest-pool-workers/config`
  - Points `poolOptions.workers.main` to `dist/server/index.js`
  - Loads D1 migrations via `test/apply-migrations.ts`

- Cloudflare test env typing: `test/cloudflare-test.d.ts`
  - Extends `ProvidedEnv` to include bindings used in tests.
