# D1 Read Replication in TanStack Start

## Purpose

This note summarizes Cloudflare D1 read replicas, how the `crrbuis` reference app uses them, and how to apply the same pattern in this TanStack Start codebase using TanStack idioms.

## D1 Read Replicas (Context7 Summary)

- D1 read replicas are updated asynchronously from the primary database, so replica lag is possible.
- `withSession()` enables sequential consistency for reads within the session, even when routed to different replicas.
- Passing a `bookmark` to `withSession(bookmark)` guarantees reads at least as new as that bookmark and is the recommended way to preserve consistency across requests.

## crrbuis Implementation

The `crrbuis` reference project uses a per-request D1 session with bookmarks stored in cookies.

- `createD1SessionService` reads a bookmark from the `X-D1-Bookmark` cookie and calls `d1.withSession(bookmark ?? constraint)` to create a session.
- After the request, it writes the updated bookmark into `Set-Cookie: X-D1-Bookmark=...` so subsequent requests can resume a consistent read view.
- For auth routes, it forces `sessionConstraint` to `"first-primary"` to avoid stale reads during login/session workflows.

Key files:

- `refs/crrbuis/lib/d1-session-service.ts:28`
- `refs/crrbuis/workers/app.ts:49`

## TanStack Start Idioms to Apply

TanStack Start centers server-only logic in server functions and uses request context for dependency injection.

- **Request context**: Add a per-request D1 session in the server entry point and pass it to `handler.fetch` as `context`. This aligns with TanStack Start’s request context pattern, which makes it available to server functions, server routes, and loaders via the router context.
- **Server functions for DB access**: Loaders are isomorphic, so any D1 access should be wrapped in `createServerFn()` and called from loaders or components. This keeps DB logic server-only while preserving type-safe call sites.
- **Route guards**: Use `beforeLoad` for auth and route guards; keep the primary-session constraint for auth routes and allow replica reads elsewhere.

TanStack patterns to follow:

- Use `createServerEntry` for custom server logic and request context.
- Use `createServerFn` for D1 access so loaders stay isomorphic.
- Use `beforeLoad` for auth gating and request context extension.

## Trade-offs

### Pros

- Lower read latency by using replicas when possible.
- Sequential consistency per session with bookmark propagation.
- Primary-only reads for auth avoid stale session or login state.

### Cons

- Cookie-based bookmarks can be lost (blocked cookies, cross-site requests), causing reads to fall back to unconstrained sessions.
- Forcing primary on auth routes adds latency on those paths.
- Read-your-writes is per session; other clients may still see stale data until replication catches up.

## Recommendation

Adopt the `crrbuis` bookmark session pattern, but implement it using TanStack Start request context and server function boundaries:

1. **Server entry point**: Create a request-scoped D1 session from the bookmark cookie and pass it through request context.
2. **Server functions**: Centralize D1 access in server functions that use the session from context.
3. **Route guards**: Use `beforeLoad` for auth routes and set session constraints to `"first-primary"` when needed.
4. **Response headers**: Persist the bookmark with `Set-Cookie` on every response that touched D1.

This keeps the read-replica benefits while matching TanStack Start’s execution model and avoiding server-only logic in loaders.
