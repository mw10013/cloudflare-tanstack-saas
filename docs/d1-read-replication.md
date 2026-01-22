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

- **Request context**: Extend the existing request context in `src/worker.ts` to include a per-request D1 session instead of `env.D1`. The server already calls `serverEntry.fetch` with a typed context, so this is the natural insertion point.
- **Server functions for DB access**: Loaders are isomorphic, and this repo already uses `createServerFn` heavily; keep all D1 access in server functions and read the session from `context`.
- **Route guards**: Existing auth checks use `beforeLoad` server functions; keep primary-session constraints for auth routes and allow replica reads elsewhere.

TanStack patterns to follow:

- Use the existing `serverEntry.fetch` context injection in `src/worker.ts`.
- Keep D1 access in `createServerFn` handlers, not in loaders.
- Keep auth gating in `beforeLoad` server functions.

## Current Codebase Notes

- `src/worker.ts` wires request context and calls `serverEntry.fetch` with `repository` and `authService` created from `env.D1`.
- Most data access already flows through server functions and `context` (`authService`, `repository`, `session`).
- There is no centralized response wrapper today; if we need `Set-Cookie` for the D1 bookmark, it must be set in the worker fetch handler or by using server function response helpers.

## Trade-offs

### Cookie transport choice

- The client does not manually set headers for server functions or route loaders, so a cookie is the most reliable way to persist the D1 bookmark across requests.
- This matches the existing `crrbuis` pattern and aligns with how the worker can always append `Set-Cookie` on responses.

### Pros

- Lower read latency by using replicas when possible.
- Sequential consistency per session with bookmark propagation.
- Primary-only reads for auth avoid stale session or login state.

### Cons

- Cookie-based bookmarks can be lost (blocked cookies, cross-site requests), causing reads to fall back to unconstrained sessions.
- Forcing primary on auth routes adds latency on those paths.
- Read-your-writes is per session; other clients may still see stale data until replication catches up.

## Recommendation

Adopt the `crrbuis` bookmark session pattern, but implement it using the existing worker request context and server function boundaries:

1. **Worker entry point**: In `src/worker.ts`, build a D1 session from the bookmark cookie and pass the session-backed repository/auth service into `serverEntry.fetch`.
2. **Server functions**: Centralize D1 access in server functions that use the session from `context`.
3. **Route guards**: Use `"first-primary"` only for requests that must read immediately consistent auth/session state. In `crrbuis`, this is limited to `/api/auth/*` requests, while everything else uses the bookmark session.
4. **Response headers**: Persist the bookmark with `Set-Cookie` in the worker response so it applies to all route/server function responses.

This keeps the read-replica benefits while matching the current request context wiring and avoiding server-only logic in loaders.
