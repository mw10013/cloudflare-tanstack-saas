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

The clones need different ports but run from the same codebase. Here are concrete approaches:

1. `.env.local` per clone (recommended)
   - Copy the primary `.env` into `.env.local` within each clone and override only the port variables (`VITE_APP_DEV_PORT`, `BASE_URL`, `PLAYWRIGHT_BASE_URL`, `STRIPE_LISTEN_PORT`, etc.).
   - Tools that load `.env.local` (Vite, Wrangler, Playwright) pick up the overrides automatically.
   - Keeps base settings shared via `.env` while letting each clone override just the values that need to change.

2. Explicit CLI/env overrides
   - Start the server with `PORT=3001 pnpm dev -- --port 3001` and set the same values in the shell for other tools before running them.
   - Works even if a tool ignores `.env.local`, but you must remember to set the env for every command and keep the values consistent.

3. Shared `.env` + clone-specific override files
   - Symlink each clone’s `.env` back to the primary (if your OS supports it) and keep clone-specific overrides in `.env.local` or another file that contains only the port.
   - Saves duplication but adds a dependency on the symlink; deleting the primary then affects clones.

4. Wrapper aliases/scripts (optional)
   - If you want a single command, create an alias like `ctss-clone1` that exports the port and runs `pnpm dev`.
   - Useful for automation but not strictly necessary—you already plan to copy `.env.local` values.

### Trade-offs

- `.env.local` per clone keeps tooling consistent and is easy to document; it is resilient to restarts and doesn’t rely on remembering to pass `PORT` each time.
- CLI overrides avoid touching files but impose a manual step every time you start the server or related tooling.
- Symlinks reduce duplication but create tight coupling; drop them only if you are prepared to manage the dependency on the primary repo.

## Environment/caching notes

- Copy the existing `.env` file into each clone so base settings are shared. Update only the specific overrides either via `.env.local` or CLI env vars.
- Ensure `.env.local` (or your override mechanism) is ignored by Git so each clone can use its own ports without polluting the upstream.

## Questions still open

- Do any tools in the stack bypass `.env.local` and need manual port injection?
- Do we want to record which ports each clone uses in this doc for quick reference?
- Should we document how to sync `.env` changes across clones when the base file is updated?
