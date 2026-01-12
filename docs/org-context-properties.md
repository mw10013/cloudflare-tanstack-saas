# Analysis: Organization Context Properties in crrbuis and Implementation Plan for TanStack Start

This document analyzes how crrbuis implements organization context and provides a plan for bringing this pattern into tanstack-sandbox3 using TanStack Start idioms and patterns.

## Overview

The crrbuis application uses React Router with a custom `RequestContext` to provide `session`, `organization`, and `organizations` properties throughout the application. This pattern solves authentication and authorization challenges in a multi-tenant SaaS application.

## crrbuis Implementation Pattern

### RequestContext Interface

```typescript
export interface RequestContext {
  env: Env;
  authService: AuthService;
  repository: Repository;
  stripeService: StripeService;
  session?: AuthService["$Infer"]["Session"];
  organization?: AuthService["$Infer"]["Organization"];
  organizations?: AuthService["$Infer"]["Organization"][];
}
```

### How Properties Are Populated

**`session` property:**

- Populated in `workers/app.ts` at request entry point
- Fetched once using `authService.api.getSession({ headers })`
- Available to all routes via React Router context

**`organization` and `organizations` properties:**

- Populated in middleware for routes under `/app/:organizationId`
- Middleware calls `authService.api.listOrganizations({ headers })`
- Finds specific organization matching route parameter
- Updates RequestContext with both properties

### Usage Patterns

1. **Route Guards**: Middleware checks session presence and redirects if not authenticated
2. **Authorization**: Middleware validates organization membership before setting context
3. **Loaders**: Access context to get session/org data without re-fetching
4. **Components**: Use context for organization switchers and navigation

---

## TanStack Start Adaptation Strategy

### Key Differences

| Aspect            | crrbuis (React Router)          | TanStack Start                                 |
| ----------------- | ------------------------------- | ---------------------------------------------- |
| Context System    | `RouterContextProvider`         | Module augmentation of `@tanstack/react-start` |
| Entry Point       | `workers/app.ts`                | `src/worker.ts`                                |
| Route Definitions | React Router file-based routing | TanStack Router file-based routing (similar)   |
| Middleware        | `Route.MiddlewareFunction`      | `beforeLoad` hook                              |
| Context Access    | `context.get(RequestContext)`   | `Route.useRouteContext()`                      |

### Current State

Our project already has:

- `session` property in `ServerContext` (worker.ts:14)
- `session` populated in worker.ts (line 36-38)
- Basic app route structure with `/app` and `/app/`
- `/app.tsx` has beforeLoad that checks session authentication

### What's Missing

- `organization` and `organizations` properties in `ServerContext`
- Route structure to handle `/app/:organizationId` URLs
- Organization-scoped layout route with beforeLoad to populate organization context
- Redirect logic for `/app/` to use `activeOrganizationId`

---

## Implementation Plan

### Phase 1: Update ServerContext Interface

**File:** `src/worker.ts`

Add organization properties to existing `ServerContext` interface:

```typescript
export interface ServerContext {
  env: Env;
  repository: Repository;
  authService: AuthService;
  stripeService: StripeService;
  session?: AuthService["$Infer"]["Session"];
  organization?: AuthService["$Infer"]["Organization"];
  organizations?: AuthService["$Infer"]["Organization"][];
}
```

**Note:** `organization` and `organizations` will be populated in route-level `beforeLoad` hooks, not in worker.ts. This is more performant as it only fetches when needed.

---

### Phase 2: Create App Layout Route Structure

Use flat route structure (as in crrbuis):

```
src/routes/
  app.tsx                          # /app (existing layout route)
  app.index.tsx                     # /app/ (existing, needs update)
  app.$organizationId.tsx              # /app/:organizationId (new layout)
  app.$organizationId.index.tsx       # /app/:organizationId/ (new)
  app.$organizationId.members.tsx        # /app/:organizationId/members (future)
  app.$organizationId.billing.tsx       # /app/:organizationId/billing (future)
```

**Advantages:**

- Fewer directory levels
- Easier to see all app routes at a glance
- Matches crrbuis pattern for consistency

---

### Phase 3: Update `/app/` Index Route

**File:** `src/routes/app.index.tsx`

Add logic to redirect users to their active organization:

```typescript
import { invariant } from "@epic-web/invariant";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/")({
  beforeLoad: ({ context: { session } }) => {
    invariant(session, "Missing session");

    const activeOrganizationId = session.session.activeOrganizationId;

    invariant(activeOrganizationId, "Missing activeOrganizationId");

    throw redirect({ to: `/app/${activeOrganizationId}` });
  },
});
```

**Key Points:**

- **Session invariant**: Parent `/app.tsx` route already checks authentication, so session is guaranteed. Single `invariant(session, "Missing session")` is sufficient - TypeScript will ensure session.session exists after this check.
- **activeOrganizationId invariant**: Organizations are auto-created on sign-up (see `src/lib/auth-service.ts:246-255`), so `activeOrganizationId` is guaranteed.
- **Always redirects**: No component function - this route only redirects to user's active organization.
- **No needsOrgCreation flow**: Since organizations are auto-created on sign-up, we never reach a state where a user has no organizations.

**Note on auto-creation:**

In `src/lib/auth-service.ts:246-255`, `databaseHookUserCreateAfter` hook creates an organization for new users with `role === "user"`:

```typescript
databaseHookUserCreateAfter: async (user) => {
  if (user.role === "user") {
    await auth.api.createOrganization({
      body: {
        name: `${user.email.charAt(0).toUpperCase() + user.email.slice(1)}'s Organization`,
        slug: user.email.replace(/[^a-z0-9]/g, "-").toLowerCase(),
        userId: user.id,
      },
    });
  }
},
```

And in `databaseHookSessionCreateBefore` (lines 257-271), session is populated with user's active organization ID:

```typescript
databaseHookSessionCreateBefore: async (session) => {
  const activeOrganizationId =
    (await options.db
      .prepare(
        "select organizationId from Member where userId = ? and role = 'owner'",
      )
      .bind(session.userId)
      .first<number>("organizationId")) ?? undefined;
  return {
    data: {
      ...session,
      activeOrganizationId,
    },
  };
},
```

---

### Phase 4: Create Organization Layout Route

**File:** `src/routes/app.$organizationId.tsx` (new)

Create a layout route that populates organization context using a server function:

```typescript
import { createFileRoute, Outlet, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { invariant } from "@epic-web/invariant";

const beforeLoadServerFn = createServerFn().handler(
  async ({
    context: { session, authService },
    params: { organizationId },
  }) => {
    invariant(session, "Missing session");

    const request = getRequest();

    const organizations = await authService.api.listOrganizations({
      headers: request.headers,
    });

    const organization = organizations.find((org) => String(org.id) === organizationId);

    if (!organization) {
      throw notFound();
    }

    return {
      organization,
      organizations,
      sessionUser: session.user,
    };
  },
);

export const Route = createFileRoute("/app/$organizationId")({
  beforeLoad: async ({ params }) => {
    return await beforeLoadServerFn({ params });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { organization, organizations, sessionUser } = Route.useRouteContext();

  return (
    <SidebarProvider>
      <AppSidebar
        organization={organization}
        organizations={organizations}
        user={sessionUser}
      />
      <main className="flex h-svh w-full flex-col overflow-x-hidden">
        <SidebarTrigger />
        <Outlet />
      </main>
    </SidebarProvider>
  );
}
```

**Key Points:**

- **`getRequest()`**: Imported from `@tanstack/react-start/server` to access the current request and its headers. This is already used in `src/lib/auth-service.ts:280`.
- **Session invariant**: Parent `/app.tsx` route checks authentication, so using `invariant(session, "Missing session")` ensures session is present. TypeScript will then ensure session.user and session.session exist.
- **notFound() for organization**: If organization is not found in user's accessible organizations, use `notFound()` rather than `invariant()`. User can legitimately be removed from an organization or the organization ID could be invalid, so rendering a 404 page is appropriate.
- **Context merging**: Returned values (`organization`, `organizations`, `sessionUser`) are merged into route context and available to child routes.
- **Sequential execution**: `beforeLoad` runs sequentially from parent to child, so child routes (`/app/:organizationId/`, `/app/:organizationId/members`) can safely access this context.

---

### Phase 5: Create Organization Index Route

**File:** `src/routes/app.$organizationId.index.tsx` (new)

Create organization dashboard page:

```typescript
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/$organizationId/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { organization } = Route.useRouteContext();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold tracking-tight">
        {organization.name}
      </h1>
      <p className="text-muted-foreground text-sm mt-2">
        Organization ID: {organization.id}
      </p>
    </div>
  );
}
```

**Key Points:**

- Organization is guaranteed to be present (checked in parent layout route)
- No loader needed for basic page - can add one later for dashboard data
- Can add more routes like `/app/$organizationId/members.tsx`, `/app/$organizationId/billing.tsx` as needed

---

## TanStack Start Context Pattern

### How Context Works

In TanStack Start, context is established through module augmentation:

**In `src/worker.ts`:**

```typescript
export interface ServerContext {
  env: Env;
  repository: Repository;
  authService: AuthService;
  stripeService: StripeService;
  session?: AuthService["$Infer"]["Session"];
  organization?: AuthService["$Infer"]["Organization"];
  organizations?: AuthService["$Infer"]["Organization"][];
}

declare module "@tanstack/react-start" {
  interface Register {
    server: { requestContext: ServerContext };
  }
}
```

**In routes:** Access context via `Route.useRouteContext()`

```typescript
const { session, organization, organizations } = Route.useRouteContext();
```

### beforeLoad vs loader

Based on TanStack Router documentation and AGENTS.md:

| Feature             | beforeLoad                          | loader                                 |
| ------------------- | ----------------------------------- | -------------------------------------- |
| **Purpose**         | Route guards, context population    | Data fetching                          |
| **Execution Order** | Sequential parent→child             | Parallel across all active routes      |
| **Return Value**    | Merged into context                 | Available as `loaderData` in component |
| **Best For**        | Auth checks, org context validation | Fetching data specific to route        |

**Our Pattern:**

- Use `beforeLoad` for:
  - Session validation (redirect if not authenticated)
  - Organization authorization (fetch and validate membership)
  - Context population (session, organization, organizations)
  - Using `invariant()` to make preconditions explicit and narrow types
  - Using `notFound()` for legitimate user errors (e.g., removed from org)
- Use `loader` for:
  - Route-specific data fetching (dashboard stats, member lists, etc.)
  - Data that varies between routes under the same organization

### Using invariant()

The `invariant()` function (from `@epic-web/invariant`) serves two purposes:

1. **Runtime safety**: Throws an error if the condition is false
2. **Type narrowing**: TypeScript narrows the type based on the invariant condition

Examples:

```typescript
invariant(session, "Missing session");
// Type of session is narrowed from `Session | undefined` to `Session`
// TypeScript now knows session.session and session.user exist

invariant(activeOrganizationId, "Missing activeOrganizationId");
// Type of activeOrganizationId is narrowed from `string | undefined` to `string`
```

Keep invariant messages concise since they're program logic, not user-facing.

### Accessing Request Headers in beforeLoad

To access request headers in `beforeLoad`, use `getRequest()` from `@tanstack/react-start/server`:

```typescript
import { getRequest } from "@tanstack/react-start/server";

export const Route = createFileRoute("/app/$organizationId")({
  beforeLoad: async () => {
    const request = getRequest();
    const headers = request.headers;

    // Use headers with Better Auth API
    const session = await authService.api.getSession({ headers });
  },
});
```

This pattern is already used in `src/lib/auth-service.ts:280`:

```typescript
export const signOutServerFn = createServerFn({ method: "POST" }).handler(
  async ({ context: { authService } }) => {
    const request = getRequest();
    const { headers } = await authService.api.signOut({
      headers: request.headers,
      returnHeaders: true,
    });
    // ...
  },
);
```

---

## References

### crrbuis Codebase

- `refs/crrbuis/lib/request-context.ts` - RequestContext interface
- `refs/crrbuis/workers/app.ts:82-90` - Session population
- `refs/crrbuis/app/routes/app.$organizationId.tsx:33-51` - Organization middleware
- `refs/crrbuis/app/routes/app.$organizationId.tsx:55-71` - Loader using context
- `refs/crrbuis/app/routes/app.$organizationId.tsx:78-94` - Component using context

### TanStack Router Documentation

- `refs/tan-router/docs/router/framework/react/routing/file-naming-conventions.md` - File naming rules
- `refs/tan-router/docs/router/framework/react/routing/file-based-routing.md` - File-based routing concepts
- AGENTS.md - beforeLoad vs loader guidelines

### Current Project

- `src/worker.ts` - Server context definition and population
- `src/routes/app.tsx` - Existing app layout route with auth check
- `src/routes/app.index.tsx` - Existing app index route (renamed from app.\_index.tsx per TanStack convention)
- `src/lib/auth-service.ts` - Better Auth configuration (auto-creates org on sign-up)
