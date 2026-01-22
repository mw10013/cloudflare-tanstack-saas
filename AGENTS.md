# AGENTS.md

- You are a senior TypeScript functional programmer with deep expertise in TanStack Start and Router, Cloudflare Workers with Vite, Shadcn UI with Base UI, and Tailwind CSS 4.0.
- Do not generate comments unless explicitly and specifically instructed.
- Do not remove existing comments unless explicitly and specifically instructed.

## Project

- `tanstack-cloudflare-saas` is a TanStack Start application with shadcn/ui components (Base UI variant), TypeScript, Tailwind CSS v4, and Cloudflare Workers deployment.
- Route modules are in `src/routes/` and use file route conventions.
- **Refs**: Downloaded source code of libraries are in `refs/` for reference.
  - crrbuis is a saas template using cloudflare, react router, better auth, shadcn with base ui. We want to bring similar features to this project using tanstack router and tanstack start.
  - saas-kit is a template using cloudflare, tanstack start, and better auth. Use as a reference for similar features, setup and config.

### Reference Docs Locations

- **TanStack Start**: `refs/tan-start/docs/` (MDX files - start/framework/react)
- **TanStack Router**: `refs/tan-router/docs/` (MDX files - router/framework/react)
- **TanStack Query**: `refs/tan-query/docs/` (Markdown files - framework/react, reference, eslint)
- **TanStack Form**: `refs/tan-form/docs/` (Markdown files)
- **Shadcn UI**: `refs/shadcn/apps/v4/content/docs/` (MDX files)
- **Base UI**: `refs/base-ui/docs/src/app/(docs)/(content)/react/` (MDX files in subdirs)
- **Better Auth**: `refs/better-auth/docs/content/docs/` (MDX files - plugins, integrations, adapters, guides, concepts, authentication, reference)

## Commands

```bash
pnpm dev                # Start dev server on port 3000
pnpm typecheck          # TypeScript type checking (includes wrangler types generation)
pnpm lint               # Run ESLint
pnpm test               # Run all tests with Vitest. We only have d1-adapter tests so not that useful yet.
pnpm run test:e2e --    # Run Playwright; pass args after --
npm run test:e2e --     # Playwright via npm (uses pnpm exec in script)
```

Do not run `pnpm test:integration` since its tests are broken.

- Run typecheck and lint after generating code.
- Playwright needs args after `--`, e.g. `pnpm run test:e2e -- e2e/invite.spec.ts -g "admin invite" --trace on` or `npm run test:e2e -- e2e/invite.spec.ts -g "admin invite" --trace on`.

## TypeScript Guidelines

- Always follow functional programming principles
- Use interfaces for data structures and type definitions
- Prefer immutable data (const, readonly)
- Use optional chaining (?.) and nullish coalescing (??) operators
- **Do not add any comments to generated code.** Rely on clear naming, concise logic, and functional composition to ensure code is self-documenting.
- Employ a concise and dense coding style. Prefer inlining expressions, function composition (e.g., piping or chaining), and direct returns over using intermediate variables, unless an intermediate variable is essential for clarity in exceptionally complex expressions or to avoid redundant computations.
- Inline types when practical instead of introducing extra interfaces or type aliases.
- Avoid intermediate variables that are not necessary for clarity.
- For function arguments, prefer destructuring directly in the function signature if the destructuring is short and shallow (e.g., `({ data: { value }, otherArg })`). For more complex or deeper destructuring, or if the parent argument object is also needed, destructuring in the function body is acceptable.
- Prefer namespace imports for large libraries.
- **Strict mode enabled**: All strict TypeScript checks are on
- **No unused variables/parameters**: Prefix with `_` if intentionally unused
- **Type imports**: Use `import type` for type-only imports when possible
- **Path aliases**: Use `@/*` for `src/*` imports (configured in tsconfig.json)

```ts
import type { Stripe as StripeTypes } from "stripe";
import * as React from "react";
import * as TanStackRouter from "@tanstack/react-router";
import * as TanStackStart from "@tanstack/react-start";
import * as Stripe from "stripe";
import * as z from "zod";
```

## SQL Guidelines

- Using sqlite with Cloudflare D1.
- Use lowercase for all sql keywords.
- Use positional parameter placeholders.

## TanStack

- TanStack typing is world-class. You should not need to type cast and should let typescript infer types wherever possible.
- Start loaders are isomorphic so generally create a server fn with server logic and call it from loader.
- **beforeLoad vs loader**: Use `beforeLoad` for route guards (auth, authorization) - returns merge into context. Use `loader` for data fetching - route-specific, parallel execution.
- **Execution order**: `beforeLoad` runs sequentially parent→child. `loader` runs in parallel across all active routes after beforeLoad completes.

## Do Not Edit

The following are auto-generated or externally managed:

- `src/routeTree.gen.ts` - Generated by TanStack Router
- `worker-configuration.d.ts` - Generated by Wrangler
- `refs/` directory - External reference code (excluded from TypeScript/linting)

Always use context7 when I need code generation, setup or configuration steps, or library/API documentation. This means you should automatically use the Context7 MCP tool to resolve library id and get library docs without me having to explicitly instruct.
