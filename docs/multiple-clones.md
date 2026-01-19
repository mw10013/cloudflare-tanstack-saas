# Multiple clones of cloudflare-tanstack-saas

Tracks sibling repositories next to the primary `cloudflare-tanstack-saas` checkout for parallel development.

## Goals

- Primary repo at `/Users/mw/Documents/src/cloudflare-tanstack-saas`.
- Clones as independent siblings under `/Users/mw/Documents/src/`.
- Shared git objects via `--reference` for disk savings.

## Naming

- `cloudflare-tanstack-saas` (primary)
- `cloudflare-tanstack-saas-clone`
- `cloudflare-tanstack-saas-clone1`
- `cloudflare-tanstack-saas-clone2`

Increments suffix for easy enumeration.

## Clone commands

From `/Users/mw/Documents/src`:

```bash
git clone --reference cloudflare-tanstack-saas https://github.com/mw10013/cloudflare-tanstack-saas.git cloudflare-tanstack-saas-clone
git clone --reference cloudflare-tanstack-saas https://github.com/mw10013/cloudflare-tanstack-saas.git cloudflare-tanstack-saas-clone1
git clone --reference cloudflare-tanstack-saas https://github.com/mw10013/cloudflare-tanstack-saas.git cloudflare-tanstack-saas-clone2
```

Each clone has isolated `.git` refs and working tree.

## Setting up shared links

After cloning, run the setup script to create symlinks to shared files from the primary repository:

```bash
pnpm run clone:links
```

This creates symlinks for `refs/` and `todo.md` pointing to the primary repo's versions, avoiding duplication.

## Handling parallel dev ports

- Copy primary `.env` to each clone.
- Set unique `PORT` in each `.env` (incrementing numbers).
- No specific port values; clones use incrementing ports.
- `BETTER_AUTH_URL` must align with `PORT`.

## Port flow map

| Concern           | File/Setup                    | Port handling                                              |
| ----------------- | ----------------------------- | ---------------------------------------------------------- |
| Dev server        | `package.json` dev script     | Sources `.env`, uses `$PORT` for vite dev.                 |
| Playwright        | `playwright.config.ts`        | Loads `.env`, uses `process.env.PORT` for url/baseURL.     |
| Integration tests | `test/integration/`           | Use fixed `http://example.com`, no localhost ports.        |
| Stripe CLI        | `package.json` stripe scripts | Sources `.env`, uses `$PORT` in webhook URL.               |
| Wrangler config   | `wrangler.jsonc`              | BETTER_AUTH_URL hardcoded per env; types as string.        |
| Typegen           | `worker-configuration.d.ts`   | Generated with `wrangler types`; env vars typed as string. |
