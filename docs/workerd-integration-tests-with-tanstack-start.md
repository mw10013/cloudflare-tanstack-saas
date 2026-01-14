# workerd integration tests vs TanStack Start: why this got hairy

This repo is a TanStack Start app deployed as a Cloudflare Worker (`src/worker.ts`). The goal was to run route-level integration tests using `@cloudflare/vitest-pool-workers` (workerd runtime) by making real HTTP requests via `SELF.fetch()`.

That sounds straightforward, but TanStack Start’s server runtime is not a single self-contained module you can point workerd at. It expects a Vite build pipeline to have already produced multiple build artifacts and “virtual modules” at runtime.

## Fundamental constraint (the root issue)

**workerd cannot directly execute or import TypeScript/TSX files from the filesystem.**

In a normal TanStack Start dev/prod workflow, Vite is responsible for:

- transpiling TS/TSX to JS
- bundling/resolving dependencies
- providing **virtual module IDs** at runtime (e.g. `tanstack-start-manifest:v`)
- generating the client/server “manifests” TanStack Start uses for SSR

When we run `src/worker.ts` inside workerd via `@cloudflare/vitest-pool-workers`, we’re effectively asking workerd to behave like “Node + Vite + TanStack Start dev server”. But there is **no Vite runtime** inside workerd.

So the worker code path that runs the Start server tries to import things like:

- `#tanstack-router-entry`
- `#tanstack-start-entry`
- `tanstack-start-manifest:v`
- `tanstack-start-injected-head-scripts:v` (dev-only)

Those are typically provided by the Start/Vite plugin pipeline, not by raw JS modules.

## The path we took (and why)

### 1) Make workerd able to import the “entries”

TanStack Start’s handler dynamically imports two entry modules:

- `#tanstack-router-entry`
- `#tanstack-start-entry`

In the app’s normal Vite environment those are provided by plugins/aliases and ultimately point at TS/TSX.

Because workerd cannot load TS/TSX directly, we tried to create a minimal SSR build step:

- build a small JS ESM bundle (`.mjs`) for `#tanstack-router-entry`
- provide a tiny `#tanstack-start-entry` shim

This removed the initial “can’t import TS” / missing-entry failures.

### 2) Unblock Start’s virtual modules

Next failure was Start Server Core importing a Vite virtual module:

- `tanstack-start-manifest:v`

We then added test-time aliases to stub these virtual modules.

This removed the missing-module failure, but the system still wasn’t stable.

### 3) SSR/react/runtime mismatches started appearing

After stubbing the manifest, SSR began failing with a React hooks error:

- `TypeError: Cannot read properties of null (reading 'useEffect')`

This class of error usually indicates **React runtime duplication/mismatch** introduced by bundling:

- bundling pulls in a second copy of `react`
- server uses a different entry/runtime than expected
- dev/prod builds get mixed

So the “fix” for workerd not being able to import TS (bundle it to JS) can create the next problem: **the bundler must perfectly preserve the expected SSR runtime graph**.

## Why this accumulates issues

What we’re attempting is effectively a custom, partial reimplementation of TanStack Start’s build/runtime contract:

- Start server wants specific build artifacts and manifests
- those artifacts are normally produced by Start’s Vite plugin
- in workerd tests we don’t naturally have those artifacts

So every time we patch one missing piece (router entry, start entry, manifest) we discover the next expectation.

This isn’t “just configuration”; it’s an architectural mismatch:

- TanStack Start SSR assumes a Vite-centric build system.
- workerd integration tests want to execute a worker as-is.
- the worker expects Start’s runtime contract.

## Honest assessment: should we keep pursuing this path?

**I don’t recommend continuing down this exact path** (ad-hoc stubs + a one-off bundling step).

You _can_ brute-force it, but it tends to turn into:

- fragile test infrastructure
- long feedback loops
- repeated breakage on dependency upgrades

The fundamental issue is that our test runtime (workerd) doesn’t provide the same module system/build artifacts that TanStack Start expects.

## Better paths forward (in increasing fidelity)

### Option A: Keep workerd, but test non-SSR routes only

If the main thing you want to verify is API/auth flows (magic link, cookies, KV writes), focus tests on endpoints that do not require SSR React rendering.

- Pros: keeps `SELF.fetch`, real worker runtime
- Cons: doesn’t prove SSR pages render

This often means adding explicit JSON endpoints for auth flows or feature flags for tests.

### Option B: Run integration tests against a real Start build output

Instead of stubbing Vite virtual modules, run the same build pipeline Start expects (Vite + Start plugin) and then point workerd at the _built server output_.

- Pros: matches Start’s contract
- Cons: heavier and slower; worker entry is no longer “raw `src/worker.ts`” in tests

This is the most correct way if SSR page rendering must be tested.

### Option C: Use a different test harness for SSR (Node), keep workerd tests for Worker bindings

Split responsibilities:

- workerd tests: Cloudflare bindings correctness (KV/D1, cookies, redirects)
- node-based tests (or Playwright): SSR behaviour and HTML rendering

- Pros: each environment tests what it’s good at
- Cons: two harnesses

## What I’d recommend next

If the core goal is the auth magic-link flow:

- keep workerd tests, but ensure the tested routes avoid SSR rendering (or accept that SSR is out of scope)

If you truly need “GET / renders HTML” in workerd tests:

- switch to Option B (run a real Start build step that generates the manifest + entries, then test those artifacts)

Either way, I’d stop investing in stubbing Start’s internals. The maintenance cost will keep growing.
