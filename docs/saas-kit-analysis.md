# SaaS-Kit Feature Analysis

This document analyzes the features and functionality available in the [saas-kit](https://github.com/backpine/saas-kit) reference implementation that are **not present** in the current codebase.

---

## Overview

**saas-kit** is a TanStack Start-based SaaS template using:

- TanStack Start + TanStack Router
- Better Auth (magic link, OAuth via Google)
- Polar Payments integration
- Cloudflare Workers (User Application + Data Service)
- Drizzle ORM with PlanetScale MySQL
- TanStack Query for data fetching
- Theme switching (dark/light/system)
- Comprehensive UI components via shadcn/ui

**Current codebase** uses:

- TanStack Start + TanStack Router
- Better Auth (magic link, OAuth)
- Stripe Payments (not Polar)
- Cloudflare Workers (single worker)
- D1 (SQLite)
- More comprehensive shadcn/ui component set (Base UI variant)

---

## Missing Features from saas-kit

### 1. Polar Payments Integration

**Status:** Not implemented - currently uses Stripe

saas-kit uses **Polar** for payments with:

- `@polar-sh/sdk` integration
- `@polar-sh/tanstack-start` plugin
- Product listing and checkout creation
- Subscription management (`/app/polar/subscriptions`, `/app/polar/portal`, `/app/polar/checkout/success`)
- `polarMiddleware` for injecting Polar client into server functions
- Payment validation server functions

**Implementation details:**

```typescript
// polarMiddleware.ts
export const polarMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const polar = new Polar({
    accessToken: env.POLAR_SECRET,
    server: "sandbox",
  });
  return next({ context: { polar } });
});
```

**Migration consideration:** Moving from Stripe to Polar would require:

1. Removing Stripe dependencies
2. Adding Polar SDK and TanStack Start integration
3. Creating new payment server functions
4. Updating billing UI components

---

### 2. Middleware Architecture Pattern

**Status:** Partially implemented - could be enhanced

saas-kit implements a **middleware pattern** for reusable server-side logic:

```typescript
// core/middleware/auth.ts
export const protectedFunctionMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const context = await getAuthContext();
  return next({ context });
});
```

**Current codebase** uses `createAuthService` hooks instead.

**Missing middleware patterns:**

- `polarMiddleware` - injects Polar client
- Request-level middleware (`protectedRequestMiddleware`)
- Function-level middleware with context merging

---

### 3. Data Service Worker (Backend API)

**Status:** Not implemented

saas-kit has a **separate Cloudflare Worker** (`data-service`) for:

- Hono-based API endpoints (`apps/data-service/src/hono/app.ts`)
- Cloudflare Workflows (`apps/data-service/src/workflows/`)
- Cloudflare Durable Objects (`apps/data-service/src/durable-objects/`)

**Benefits:**

- Separation of concerns (user-facing app vs backend services)
- Scalable backend with Hono API framework
- Workflow support for long-running operations
- Durable Objects for stateful computation

**Current codebase** has all logic in a single worker.

---

### 4. Cloudflare Workflows

**Status:** Not implemented

Example workflow structure in saas-kit:

```typescript
// workflows/example-workflow.ts
export class ExampleWorkflow extends WorkflowEntrypoint<
  Env,
  ExampleWorkflowParmas
> {
  async run(
    event: Readonly<WorkflowEvent<ExampleWorkflowParmas>>,
    step: WorkflowStep,
  ) {
    const randomNumber = await step.do("Get random number", async () => {
      return Math.floor(Math.random() * 10) + 1;
    });
    await step.sleep(
      "Wait for random number of seconds",
      `${randomNumber} seconds`,
    );
    await step.do("Log data in payload", async () => {
      console.log(event.payload);
    });
  }
}
```

**Use cases:**

- Async processing (email sending, webhooks)
- Scheduled jobs
- Multi-step business processes

---

### 5. Cloudflare Durable Objects

**Status:** Not implemented

Example durable object in saas-kit:

```typescript
// durable-objects/example-durable-object.ts
export class ExampleDurableObject extends DurableObject {
  savedData: string | undefined;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      const [savedData] = await Promise.all([
        ctx.storage.get<string>("savedData"),
      ]);
      this.savedData = savedData;
    });
  }
  async saveData(data: string) {
    await this.ctx.storage.put("savedData", data);
    this.savedData = data;
  }
}
```

**Use cases:**

- Real-time features (chat, collaborative editing)
- Rate limiting
- Distributed caching
- Stateful services

---

### 6. SEO Utilities

**Status:** Not implemented

saas-kit includes SEO utilities (`utils/seo.ts`):

```typescript
// utils/seo.ts
export function seo({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
  ];
}
```

Used in `__root.tsx` for dynamic meta tags.

---

### 7. Enhanced Default Catch Boundary

**Status:** Partial - current has basic implementation

saas-kit's `default-catch-boundary.tsx` includes:

- Collapsible error details with stack trace
- Error reporting via email (`mailto:` link)
- Try again button with router invalidation
- Context-aware navigation (home vs back)
- User-friendly error alerts with icons

**Current implementation** is simpler.

---

### 8. Theme Provider with SSR Prevention

**Status:** Different implementation - current uses next-themes

saas-kit's theme provider includes:

- SSR-safe theme application with script injection
- Prevents flash of incorrect theme (FOIT)
- System theme detection and listeners
- Transition disable option for smooth theme switching
- LocalStorage persistence

```typescript
// theme-provider.tsx
const script = document.createElement("script");
script.innerHTML = `
  try {
    var theme = localStorage.getItem('${storageKey}') || '${defaultTheme}';
    var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var resolvedTheme = theme === 'system' ? systemTheme : theme;
    if (resolvedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
`;
```

---

### 9. Account Management Dialog

**Status:** Not implemented - current has basic auth UI

saas-kit's `account-dialog.tsx` provides:

- User profile display with avatar
- Theme toggle integration
- Sign out functionality
- Modal-based account management

```typescript
// auth/account-dialog.tsx
export function AccountDialog({ children }: AccountDialogProps) {
  const { data: session } = authClient.useSession();
  // ... displays user info and provides sign out
}
```

---

### 10. Responsive Header with Search

**Status:** Not implemented

saas-kit's `layout/header.tsx` includes:

- Search input with icon
- Notification bell with badge
- Mobile menu toggle
- User avatar with dropdown
- Responsive design

---

### 11. Collapsible Sidebar

**Status:** Not implemented

saas-kit's `layout/sidebar.tsx` provides:

- Collapsible desktop sidebar
- Active route highlighting
- Navigation items with icons
- User info section
- Mobile-responsive design

---

### 12. Landing Page Components

**Status:** Current has marketing pages, but different structure

saas-kit's `components/landing/` includes:

- Hero section with gradient background
- Feature badges (Production-Ready, Edge-Optimized, Type-Safe)
- Call-to-action buttons
- GitHub link
- Features section

---

### 13. Google OAuth Provider

**Status:** Different - current supports magic link primarily

saas-kit configures Google OAuth:

```typescript
// packages/data-ops/src/auth/setup.ts
socialProviders: {
  google: {
    clientId: config.googleClientId,
    clientSecret: config.googleClientSecret,
  },
}
```

**Current codebase** uses magic link only by default.

---

### 14. Drizzle ORM with PlanetScale

**Status:** Current uses D1 (SQLite)

saas-kit uses Drizzle with PlanetScale MySQL:

```typescript
// packages/data-ops/src/database/setup.ts
import { drizzle } from "drizzle-orm/planetscale-serverless";

export function initDatabase(connection: { host; username; password }) {
  db = drizzle({ connection });
  return db;
}
```

**Schema includes:** `auth_user`, `auth_session`, `auth_account`, `auth_verification`

**Current codebase** uses Cloudflare D1 (SQLite) with simpler schema.

---

### 15. Markdown Documentation System

**Status:** Not implemented

saas-kit supports documentation pages:

- `routes/_static/docs/$name.tsx`
- React Markdown (`react-markdown`)
- Syntax highlighting (`highlight.js`)
- GitHub Flavored Markdown (`remark-gfm`)
- Code block highlighting (`rehype-highlight`)

---

### 16. Demo/Middleware Showcase

**Status:** Not implemented

saas-kit includes demo components:

- `components/demo/middleware-demo.tsx`
- Demonstrates middleware functionality

---

### 17. Data Operations Package (Monorepo)

**Status:** Not structured as monorepo

saas-kit is a monorepo with:

- `packages/data-ops/` - Shared database/auth utilities
- `apps/user-application/` - Frontend
- `apps/data-service/` - Backend worker

**Current codebase** is a single package.

---

### 18. Start Instance Middleware

**Status:** Not implemented

saas-kit's `start.tsx` creates middleware at the start level:

```typescript
startInstance.createMiddleware().server(({ next }) => {
  return next({
    context: { fromStartInstanceMw: true },
  });
});
```

---

### 19. Static Route Handling

**Status:** Different - current uses built-in static handling

saas-kit has explicit static routes:

```typescript
// routes/_static/route.tsx
// Handles static file serving
```

---

### 20. Environment-Based API Server Config

**Status:** Not implemented

saas-kit configures Polar for sandbox vs production:

```typescript
const polar = new Polar({
  accessToken: env.POLAR_SECRET,
  server: "sandbox", // or "production"
});
```

---

## Features Current Codebase Has (saas-kit Lacks)

For completeness, here are features the current codebase has that saas-kit doesn't:

| Feature                    | Current Codebase   | saas-kit        |
| -------------------------- | ------------------ | --------------- |
| Stripe Payments            | Yes                | No (uses Polar) |
| Organization Management    | Yes (multi-tenant) | Limited         |
| Invitations System         | Yes                | No              |
| Admin Panel                | Yes                | No              |
| D1 (SQLite)                | Yes                | Uses MySQL      |
| Base UI Components         | Full set           | Limited shadcn  |
| tanstack/form              | Yes                | No              |
| tanstack-form integration  | Yes                | No              |
| Charts                     | Yes                | No              |
| Carousel                   | Yes                | No              |
| Command Palette            | Yes                | No              |
| Calendar                   | Yes                | No              |
| More UI components         | 40+ components     | ~10 components  |
| Domain/Plans configuration | Yes                | Basic           |

---

## Recommendations

### High Priority

1. **Polar vs Stripe Decision**: Choose one payment provider. Stripe is more established; Polar is simpler for SaaS.

2. **Middleware Architecture**: Adopt saas-kit's middleware pattern for cleaner server function composition.

3. **Enhanced Error Handling**: Upgrade `default-catch-boundary.tsx` with saas-kit's comprehensive error UI.

4. **SEO Utilities**: Add `utils/seo.ts` for better search engine visibility.

### Medium Priority

5. **Theme Provider**: Improve SSR theme handling with saas-kit's approach.

6. **Account Management**: Add `account-dialog.tsx` with theme toggle integration.

7. **Responsive Layout**: Add header with search and collapsible sidebar.

### Lower Priority

8. **Monorepo Structure**: Consider splitting into packages/data-ops if the project grows.

9. **Cloudflare Workflows**: Add for async processing needs.

10. **Durable Objects**: Consider for real-time features.

11. **Data Service Worker**: Separate backend API if needed.

---

## Files to Reference

| File                                                                            | Purpose                 |
| ------------------------------------------------------------------------------- | ----------------------- |
| `refs/saas-kit/apps/user-application/src/core/middleware/`                      | Middleware patterns     |
| `refs/saas-kit/apps/user-application/src/utils/seo.ts`                          | SEO utilities           |
| `refs/saas-kit/apps/user-application/src/components/default-catch-boundary.tsx` | Error handling          |
| `refs/saas-kit/apps/user-application/src/components/theme/`                     | Theme provider          |
| `refs/saas-kit/apps/user-application/src/components/layout/`                    | Layout components       |
| `refs/saas-kit/apps/data-service/src/`                                          | Backend worker patterns |

---

## Route Protection Comparison: beforeLoad vs Middleware

### Overview

Both saas-kit and the current codebase protect routes from unauthorized access, but they use **different approaches**:

| Aspect                  | saas-kit                                   | Current Codebase                  |
| ----------------------- | ------------------------------------------ | --------------------------------- |
| **Auth check location** | Client-side `useSession()` hook            | Server-side `beforeLoad`          |
| **API protection**      | `middleware: [protectedRequestMiddleware]` | No middleware pattern             |
| **Role-based access**   | Not shown in examples                      | Explicit role check in beforeLoad |

---

### saas-kit: Client-Side + Middleware Pattern

**Layout-level protection (`_auth/route.tsx`):**

```typescript
function RouteComponent() {
  const session = authClient.useSession(); // Client-side check

  return (
    <>
      {session.isPending ? (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      ) : session.data ? (
        <div className="flex h-screen">
          <Sidebar />
          <Outlet />
        </div>
      ) : (
        <GoogleLogin />
      )}
    </>
  );
}
```

**Server function middleware (`core/middleware/auth.ts`):**

```typescript
import { getAuth } from "@repo/data-ops/auth/server";
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

async function getAuthContext() {
  const auth = getAuth();
  const req = getRequest();
  const session = await auth.api.getSession(req);
  if (!session) throw new Error("Unauthorized");
  return { auth, userId: session.user.id, email: session.user.email };
}

export const protectedFunctionMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const context = await getAuthContext();
  return next({ context });
});

export const protectedRequestMiddleware = createMiddleware({
  type: "request",
}).server(async ({ next }) => {
  const context = await getAuthContext();
  return next({ context });
});
```

**Applied to API routes (`routes/_auth/app/polar/portal.tsx`):**

```typescript
export const Route = createFileRoute("/_auth/app/polar/portal")({
  server: {
    middleware: [protectedRequestMiddleware],
    handlers: {
      GET: async (ctx) => {
        const polar = new Polar({
          /* ... */
        });
        const customerSession = await polar.customerSessions.create({
          externalCustomerId: ctx.context.userId,
        });
        return new Response(null, {
          status: 302,
          headers: { Location: customerSession.customerPortalUrl },
        });
      },
    },
  },
});
```

---

### Current Codebase: beforeLoad Pattern

**Layout-level protection (`routes/app.tsx`):**

```typescript
const beforeLoadServerFn = createServerFn().handler(
  ({ context: { session } }) => {
    if (!session?.user) {
      throw redirect({ to: "/login" });
    }
    if (session.user.role !== "user") {
      throw redirect({ to: "/" });
    }
    return { sessionUser: session.user };
  },
);

export const Route = createFileRoute("/app")({
  beforeLoad: async () => await beforeLoadServerFn(),
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
```

---

### Key Differences

| Aspect                   | saas-kit                           | Current Codebase             |
| ------------------------ | ---------------------------------- | ---------------------------- |
| **Check timing**         | Client-side after hydration        | Server-side before render    |
| **Loading state**        | Shows spinner while checking       | No loading state (instant)   |
| **Redirect mechanism**   | Conditional rendering in component | `throw redirect()` in loader |
| **API route protection** | Middleware array on route          | No built-in pattern          |
| **Role-based guards**    | Not demonstrated                   | Explicit role check          |
| **User experience**      | Brief loading flicker              | Instant (no flicker)         |
| **Security model**       | Client exposes auth state          | Server validates first       |
| **Reusability**          | Middleware composed per route      | Duplicated per layout        |

---

### Trade-offs

#### saas-kit (Client-Side + Middleware)

**Advantages:**

- Easier to show loading/pending states
- Auth state is reactive throughout the app
- Middleware pattern is clean and composable
- Works well for API route protection

**Disadvantages:**

- Hydration mismatch risk
- Auth state visible in client bundle
- Loading flicker on initial page load
- Protected content renders briefly before redirect

#### Current Codebase (beforeLoad)

**Advantages:**

- True SSR authentication (no unprotected render)
- No loading flicker
- Auth context not exposed to client
- Simpler mental model for route guards

**Disadvantages:**

- Less reactive (navigation required to refresh auth)
- No built-in middleware composition
- Role logic often duplicated per layout
- API routes need separate protection

---

### Recommendation

**Current approach (beforeLoad) is preferable for:**

- Security-critical applications
- Better UX (no loading flicker)
- SEO (protected content never sent to client)
- Simplicity

**saas-kit's middleware pattern is worth adopting for:**

- API route protection (`/api/*` endpoints)
- Cross-cutting concerns (auth, logging, metrics)
- Reusable server function composition

Consider implementing a hybrid approach:

- Use `beforeLoad` for route/page protection (SSR)
- Use `createMiddleware` for API route protection
