# Multiple clones of cloudflare-tanstack-saas

This document tracks keeping sibling repositories next to the primary `cloudflare-tanstack-saas` checkout. It’s meant to stay lightweight so you can scan and act quickly.

## Goals

- Primary repo remains at `/Users/mw/Documents/src/cloudflare-tanstack-saas`.
- Additional clones live as independent siblings under `/Users/mw/Documents/src/`.
- Git objects are shared via `--reference` to save disk while keeping clones isolated.

## Naming

- `cloudflare-tanstack-saas` (primary)
- `cloudflare-tanstack-saas-clone`
- `cloudflare-tanstack-saas-clone1`
- `cloudflare-tanstack-saas-clone2`

### Why this works

Keeps siblings grouped, easy to enumerate more clones by incrementing the suffix, and avoids overloading names with feature/environment hints.

## Clone commands

Run these from `/Users/mw/Documents/src` (copy/paste):

```bash
git clone --reference cloudflare-tanstack-saas https://github.com/mw10013/cloudflare-tanstack-saas.git cloudflare-tanstack-saas-clone
git clone --reference cloudflare-tanstack-saas https://github.com/mw10013/cloudflare-tanstack-saas.git cloudflare-tanstack-saas-clone1
git clone --reference cloudflare-tanstack-saas https://github.com/mw10013/cloudflare-tanstack-saas.git cloudflare-tanstack-saas-clone2
```

Each clone keeps its own `.git` refs/index and working tree, so you can run different branches or experiments without affecting the others.

## Handling parallel dev ports

- Copy the primary `.env` to each clone and edit the `PORT=<unique>` entry (primary stays on `3000`, clones can increment from `3001`).
- Keep other settings the same; accept manual sync of shared values until automation is necessary.
- `pnpm dev` now reads `PORT`, so servers default to the clone-specific port. Capture the assignments so Playwright, Stripe CLI, Wrangler, etc., point where expected.
- Record `PLAYWRIGHT_BASE_URL` in `.env` if you prefer overriding the base URL directly instead of deriving it from `PORT`.

## Port numbering guidance

- Primary repo stays on `3000` for compatibility with existing scripts.
- Clones should increment from `3001` (or another contiguous block) rather than jumping to `4000`; smaller steps keep the list short and predictable and makes it easier to remember which clone is which. Reserve a block per clone so they never collide even when all run simultaneously.
- If the primary port ever shifts, update this doc and every `.env` copy in lockstep.

## Port flow map

| Concern           | File                            | How to make it port-aware                                                                                                                                                              |
| ----------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dev server        | `package.json` `dev` script     | Remove `--port 3000` so `pnpm dev` respects `PORT`, or wrap the script (`PORT=${PORT:-3000} pnpm dev`).                                                                                |
| Playwright        | `playwright.config.ts`          | Replace the hardcoded `http://localhost:3000` values with `http://localhost:${PORT:-3000}` or read `PLAYWRIGHT_BASE_URL` from `.env`.                                                  |
| Integration tests | `test/integration/auth.test.ts` | Replace the literal `http://localhost:3000` with an env-driven base URL (e.g., `process.env.PLAYWRIGHT_BASE_URL`).                                                                     |
| Stripe CLI        | `package.json` `stripe:listen*` | Build the forward URL from `PORT` (`http://localhost:${PORT:-3000}/…`).                                                                                                                |
| Wrangler config   | `wrangler.jsonc`                | Avoid hardcoding `http://localhost:3000`; inject the current port via `.env` or clone-specific config so `BETTER_AUTH_URL` stays accurate locally.                                     |
| Typegen           | `worker-configuration.d.ts`     | Run `wrangler types --strict-vars=false` so env vars like `BETTER_AUTH_URL` stay typed as `string` instead of `http://localhost:3000`, removing the literal port from generated types. |

## Playwright question

- Update `playwright.config.ts` to derive `url`/`baseURL` from `.env` (e.g., `PLAYWRIGHT_BASE_URL=http://localhost:${PORT}`) so each clone can point to its own server without touching the config directly.

## Wrangler / typegen question

- Use `wrangler types --strict-vars=false` (or configure `wrangler.jsonc`) so `BETTER_AUTH_URL` stays typed as `string` rather than a literal union. That keeps the generated types usable across clones and avoids embedding a clone-specific port in tooling. Ensure the `PORT` from `.env` still maps to whatever `wrangler` or your helper scripts load at runtime.

## Follow-up questions

- (Omitted as requested.)
