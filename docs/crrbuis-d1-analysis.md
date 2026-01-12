# Cloudflare D1 Database in crrbuis

Analysis of how the crrbuis reference code sets up, configures, and uses Cloudflare D1 database.

## 1. Configuration (`wrangler.jsonc`)

```jsonc
{
  "d1_databases": [
    {
      "binding": "D1",
      "database_name": "d1-local",
      "database_id": "d1-local"
    }
  ],
  "env": {
    "production": {
      "d1_databases": [
        {
          "binding": "D1",
          "database_name": "crrbuis-d1-production",
          "database_id": "e14476b7-6127-401e-960d-4b6541c36b5e"
        }
      ]
    }
  }
}
```

- Binding name is `D1` (accessible as `env.D1`)
- Local environment uses `d1-local` database
- Production uses separate database with real UUID

## 2. Database Schema (`migrations/0001_init.sql`)

Schema includes:
- **Lookup tables**: `UserRole`, `MemberRole`, `InvitationStatus`
- **Core tables**: `User`, `Session`, `Organization`, `Member`, `Invitation`, `Account`, `Verification`, `Subscription`
- **Foreign keys** with cascade deletes
- **Indexes** on commonly queried columns

Example:
```sql
create table User (
  userId integer primary key,
  email text not null unique,
  emailVerified integer not null default 0,
  role text not null default 'user' references UserRole (userRoleId),
  createdAt text not null default (datetime('now')),
  updatedAt text not null default (datetime('now'))
);
```

**Migration commands:**
- `pnpm d1:migrate:apply` (local)
- `pnpm d1:migrate:apply:PRODUCTION`

## 3. Custom D1 Adapter for Better-Auth (`lib/d1-adapter.ts`)

Bridges Better-Auth ORM with D1:

```typescript
export const d1Adapter = (db: D1Database | D1DatabaseSession) => {
  return createAdapterFactory({
    config: {
      adapterId: "d1-adapter",
      supportsNumericIds: true,
      supportsDates: false,
      supportsBooleans: false,
      disableIdGeneration: true,
    },
    adapter: () => ({
      create: async ({ model, data, select }) => { /* ... */ },
      findOne: async ({ model, where, select }) => { /* ... */ },
      update: async ({ model, where, data, select }) => { /* ... */ },
      // ... other CRUD methods
    })
  });
};
```

**Features:**
- Handles id mapping (Better-Auth `id` → SQLite `userId`, `sessionId`, etc.)
- Transforms dates (SQLite ISO strings ↔ Better-Auth Date objects)
- Supports all WHERE operators: `eq`, `ne`, `lt`, `in`, `contains`, etc.
- Uses positional parameters (`?`)
- Capitalizes model names (`user` → `User`)

## 4. D1 Session Service for Read Replication (`lib/d1-session-service.ts`)

Manages D1 read replication using sessions and bookmarks:

```typescript
export function createD1SessionService({
  d1,
  request,
  sessionConstraint
}: CreateD1SessionServiceConfig) {
  let session: D1DatabaseSession | null = null;
  
  const getSession = (constraint?: D1SessionConstraint): D1DatabaseSession => {
    if (!session) {
      const bookmark = /* extract from cookie */;
      session = d1.withSession(bookmark ?? constraint ?? sessionConstraint);
    }
    return session;
  };
  
  const setSessionBookmarkCookie = (response: Response) => {
    const bookmark = session.getBookmark();
    if (bookmark) {
      response.headers.append('Set-Cookie', 
        `X-D1-Bookmark=${bookmark}; Path=/; HttpOnly; SameSite=Strict; Secure`);
    }
  };
  
  return { setSessionContraint, getSession, setSessionBookmarkCookie };
}
```

**Purpose:** Ensures read-after-write consistency across D1's distributed replicas by tracking session bookmarks via cookies.

## 5. Repository Pattern for Data Access (`lib/repository.ts`)

Type-safe data access with complex queries:

```typescript
export function createRepository({
  db,
}: {
  db: D1Database | D1DatabaseSession;
}) {
  const getUser = async ({ email }: { email: Domain.User["email"] }) => {
    const result = await db
      .prepare(`select * from User where email = ?1`)
      .bind(email)
      .first();
    return Domain.User.nullable().parse(result);
  };

  const getAppDashboardData = async ({
    userEmail,
    organizationId,
  }: {
    userEmail: string;
    organizationId: string;
  }) => {
    const result = await db.prepare(`
      select json_object(
        'userInvitations', (
          select json_group_array(
            json_object(
              'invitationId', i.invitationId,
              'email', i.email,
              'organizationId', i.organizationId
            )
          )
          from Invitation i
          where i.email = ?1 and i.status = 'pending'
        ),
        'memberCount', (
          select count(*) from Member where organizationId = ?2
        )
      ) as data
    `).bind(userEmail, organizationId).first();
    
    return z.object({ /* ... */ }).parse(JSON.parse(result.data));
  };
}
```

**Patterns:**
- Lowercase SQL keywords
- Positional parameters (`?1`, `?2`)
- JSON aggregation for complex queries
- Zod schemas validate/parse results
- Method prefixes: `get*`, `update*`, `create*`, `delete*`

## 6. Worker Entry Point (`workers/app.ts`)

Shows D1 initialization flow:

```typescript
export default {
  async fetch(request, env, ctx) {
    // 1. Create D1 session service with read replication
    const d1SessionService = createD1SessionService({
      d1: env.D1,
      request,
      sessionConstraint: new URL(request.url).pathname.startsWith("/api/auth/")
        ? "first-primary"
        : undefined,
    });
    
    // 2. Create repository with D1 session
    const repository = createRepository({ 
      db: d1SessionService.getSession() 
    });
    
    // 3. Create auth service with D1 session
    const authService = createAuthService({
      db: d1SessionService.getSession(),
      stripeService,
    });
    
    // 4. Set up React Router context
    const context = new ReactRouter.RouterContextProvider();
    context.set(RequestContext, {
      env,
      authService,
      repository,
      session: await authService.api.getSession({ headers: c.req.raw.headers }) ?? undefined,
    });
    
    // 5. Handle request
    const response = await hono.fetch(request, env, ctx);
    
    // 6. Set bookmark cookie for read replication
    d1SessionService.setSessionBookmarkCookie(response);
    
    return response;
  },
}
```

## 7. Accessing D1 in Routes

Routes access D1 via `RequestContext`:

```typescript
export async function loader({ request, context }: Route.LoaderArgs) {
  const requestContext = context.get(RequestContext);
  invariant(requestContext, "Missing request context.");
  const { repository, authService } = requestContext;
  
  const session = await authService.api.getSession({ headers: request.headers });
  
  return {
    dashboardData: await repository.getAppDashboardData({
      userEmail: session.user.email,
      organizationId: params.organizationId,
    }),
  };
}
```

**Request Context Interface** (`lib/request-context.ts`):
```typescript
export interface RequestContext {
  env: Env;
  authService: AuthService;
  repository: Repository;
  stripeService: StripeService;
  session?: AuthService["$Infer"]["Session"];
}

export const RequestContext = createContext<RequestContext | undefined>(undefined);
```

## 8. Domain Types with Zod (`lib/domain.ts`)

Type-safe models matching database schema:

```typescript
const intToBoolean = z.codec(z.number().int(), z.boolean(), {
  decode: (num) => num !== 0,
  encode: (bool) => (bool ? 1 : 0),
});

const isoDatetimeToDate = z.codec(z.string(), z.date(), {
  decode: (str) => new Date(str),
  encode: (date) => date.toISOString(),
});

export const User = z.object({
  userId: z.number().int(),
  email: z.email(),
  emailVerified: intToBoolean,  // SQLite stores as 0/1
  createdAt: isoDatetimeToDate,  // SQLite stores as ISO string
  // ...
});
export type User = z.infer<typeof User>;
```

## Key Architecture Patterns

1. **No `context.cloudflare.env.DB` pattern** - Uses React Router's `context.get(RequestContext)` instead
2. **Dependency injection** - Worker creates services, passes D1 session, sets in context
3. **Repository pattern** for complex queries with JSON aggregation
4. **Better-Auth adapter** for auth-related tables
5. **Read replication** support via D1 sessions and bookmark cookies
6. **Type safety** with Zod schemas matching database schema
7. **Lowercase SQL**, positional parameters, explicit column selection
8. **Service layer** architecture: Repository → AuthService → Routes
9. **Session constraints** for auth endpoints (`first-primary` for consistency)
10. **No ORM** - Raw SQL with custom Better-Auth adapter

## File References

- Configuration: `refs/crrbuis/wrangler.jsonc`
- Migration: `refs/crrbuis/migrations/0001_init.sql`
- D1 Adapter: `refs/crrbuis/lib/d1-adapter.ts`
- Session Service: `refs/crrbuis/lib/d1-session-service.ts`
- Repository: `refs/crrbuis/lib/repository.ts`
- Worker: `refs/crrbuis/workers/app.ts`
- Request Context: `refs/crrbuis/lib/request-context.ts`
- Domain Types: `refs/crrbuis/lib/domain.ts`
- Auth Service: `refs/crrbuis/lib/auth-service.ts`
- Worker Types: `refs/crrbuis/worker-configuration.d.ts`
