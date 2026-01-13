# crrbuis Vitest Pool Workers Test Configuration Analysis

## Overview

This document analyzes the test configuration and implementation patterns from crrbuis (cloudflare-react-router-bui-saas) for bringing similar test infrastructure to ctss (cloudflare-tanstack-saas).

## Architecture Comparison

| Aspect              | crrbuis                                  | ctss (Current)                           |
| ------------------- | ---------------------------------------- | ---------------------------------------- |
| Router              | React Router 7                           | TanStack Start + Router                  |
| Test Framework      | vitest + @cloudflare/vitest-pool-workers | vitest + @cloudflare/vitest-pool-workers |
| Test Files Location | `test/`                                  | `test/`                                  |
| D1 Tests            | `test/d1/*.test.ts`                      | `test/d1/*.test.ts`                      |

## Root Configuration Files

### vitest.config.ts (Root)

**crrbuis:**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["test/*/vitest.config.ts"],
  },
});
```

**ctss:** Identical configuration. Both use project-based test discovery.

### tsconfig.json (Root)

**crrbuis:**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "~/*": ["./app/*"]
    }
  }
}
```

**ctss:**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Key difference: crrbuis uses `~/*` for app aliases, ctss uses `@/*` for src.

## Test-Specific TypeScript Configuration

### tsconfig.test.json (crrbuis)

```json
{
  "$schema": "http://json.schemastore.org/tsconfig",
  "extends": "./tsconfig.base.jsonc",
  "include": [
    "test/**/*.ts",
    "e2e/**/*.ts",
    "worker-configuration.d.ts",
    ".react-router/types/**/*"
  ],
  "exclude": [".output/**", "refs/**"],
  "references": [{ "path": "./tsconfig.cloudflare.json" }],
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.test.tsbuildinfo",
    "types": ["vitest", "@cloudflare/vitest-pool-workers", "@playwright/test"],
    "lib": ["es2023", "DOM", "DOM.Iterable"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "~/*": ["./app/*"]
    },
    "rootDirs": [".", "./.react-router/types"]
  }
}
```

### test/tsconfig.json (ctss - Current)

```json
{
  "extends": "../tsconfig.json",
  "include": ["./**/*.ts", "../worker-configuration.d.ts"],
  "exclude": [],
  "compilerOptions": {
    "types": ["node", "@cloudflare/vitest-pool-workers"],
    "tsBuildInfoFile": "../node_modules/.tmp/tsconfig.test.tsbuildinfo"
  }
}
```

**Gaps Identified:**

1. ctss lacks `vitest` type import
2. ctss lacks `@playwright/test` type import
3. ctss lacks explicit `module: "esnext"` and `moduleResolution: "bundler"`
4. ctss lacks `lib` configuration for tests
5. ctss lacks `paths` configuration for test aliases
6. ctss lacks rootDirs configuration

## D1 Test Configuration

### test/d1/vitest.config.ts (crrbuis)

```typescript
import path from "node:path";
import {
  defineWorkersProject,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineWorkersProject(async () => {
  const migrationsPath = path.join(__dirname, "../../migrations");
  const migrations = await readD1Migrations(migrationsPath);
  return {
    plugins: [
      tsconfigPaths({
        projects: [path.resolve(__dirname, "../../tsconfig.json")],
      }),
    ],
    ssr: {
      noExternal: [
        "better-auth",
        "@better-auth/stripe",
        "@base-ui/react",
        "tabbable",
      ],
    },
    test: {
      include: ["*.test.ts"],
      setupFiles: ["../apply-migrations.ts"],
      poolOptions: {
        workers: {
          main: "../test-worker.ts",
          isolatedStorage: false,
          singleWorker: true,
          wrangler: {
            configPath: "../../wrangler.jsonc",
          },
          miniflare: {
            bindings: { TEST_MIGRATIONS: migrations },
          },
        },
      },
    },
  };
});
```

### test/d1/vitest.config.ts (ctss - Current)

```typescript
import path from "node:path";
import {
  defineWorkersProject,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineWorkersProject(async () => {
  const migrationsPath = path.join(__dirname, "../../migrations");
  const migrations = await readD1Migrations(migrationsPath);
  return {
    plugins: [
      tsconfigPaths({
        projects: [path.resolve(__dirname, "../../tsconfig.json")],
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "../../src"),
      },
    },
    ssr: {
      noExternal: [
        "better-auth",
        "@better-auth/core",
        "@better-auth/stripe",
        "@base-ui/react",
        "tabbable",
      ],
    },
    test: {
      include: ["*.test.ts"],
      setupFiles: ["../apply-migrations.ts"],
      poolOptions: {
        workers: {
          main: "../test-worker.ts",
          isolatedStorage: false,
          singleWorker: true,
          wrangler: {
            configPath: "../../wrangler.jsonc",
          },
          miniflare: {
            bindings: { TEST_MIGRATIONS: migrations },
          },
        },
      },
    },
  };
});
```

**Key Difference:** ctss has an additional `resolve.alias` configuration since it doesn't use vite-tsconfig-paths at root level.

## Test Helper Files

### test/apply-migrations.ts (Both Projects)

```typescript
import { applyD1Migrations, env } from "cloudflare:test";

await applyD1Migrations(env.D1, env.TEST_MIGRATIONS);
```

This setup file runs before each test to ensure the database schema is up to date.

### test/test-utils.ts (crrbuis)

```typescript
import { env } from "cloudflare:test";

export async function resetDb(resetFn?: (db: D1Database) => Promise<void>) {
  await env.D1.batch([
    ...["Session", "Member", "Invitation", "Verification", "Organization"].map(
      (table) => env.D1.prepare(`delete from ${table}`),
    ),
    env.D1.prepare(`delete from Account where accountId <> 1`),
    env.D1.prepare(`delete from User where userId <> 1`),
  ]);
  if (resetFn) await resetFn(env.D1);
}
```

### test/test-utils.ts (ctss - Current)

**Identical to crrbuis** - same implementation for database reset.

### test/test-worker.ts (Both Projects)

```typescript
export default {
  fetch: (request, _env, _ctx) =>
    Promise.resolve(new Response(`👋 ${request.url}`)),
} satisfies ExportedHandler<Env>;
```

Minimal worker export for test environment.

### test/cloudflare-test.d.ts (crrbuis)

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */

declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {
    TEST_MIGRATIONS: D1Migration[];
  }

  export function runInDurableObject<T>(
    stub: any,
    callback: (instance: any, state: any) => Promise<T>,
  ): Promise<T>;

  export function listDurableObjectIds(namespace: any): Promise<any[]>;
}
```

### test/cloudflare-test.d.ts (ctss - Current)

```typescript
declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {
    TEST_MIGRATIONS: D1Migration[];
  }
  export const env: ProvidedEnv;
  export function applyD1Migrations(
    database: D1Database,
    migrations: D1Migration[],
  ): Promise<void>;
}
```

**Gap:** ctss lacks `runInDurableObject` and `listDurableObjectIds` helpers.

## Test Implementation Patterns

### D1 Adapter Tests (test/d1/d1-adapter.test.ts)

```typescript
import {
  runAdapterTest,
  runNumberIdAdapterTest,
} from "better-auth/adapters/test";
import { env } from "cloudflare:test";
import { beforeAll, describe } from "vitest";
import { d1Adapter } from "@/lib/d1-adapter";
import { resetDb } from "../test-utils";

describe("better-auth d1Adapter", async () => {
  beforeAll(async () => {
    await resetDb(async (db) => {
      await db.batch([
        db.prepare(`delete from Account`),
        db.prepare(`delete from User`),
        db.prepare(
          `insert into User (name, email, emailVerified) values ('test-name-with-modified-field', 'test-email-with-modified-field@email.com', 1)`,
        ),
      ]);
    });
  });

  await runAdapterTest({
    getAdapter: (options = {}) => {
      return Promise.resolve(d1Adapter(env.D1.withSession())(options));
    },
    disableTests: {
      CREATE_MODEL: false,
      FIND_MODEL_WITH_MODIFIED_FIELD_NAME: true,
      // ... more disableTests
    },
  });
});
```

**Current ctss:** Has the same D1 adapter tests for better-auth.

### Integration Tests (test/d1/auth.test.ts)

The crrbuis project includes comprehensive integration tests for:

1. **User Authentication Flow**
   - Login with email
   - Magic link verification
   - Sign out
   - Role-based redirects
   - Invalid email handling

2. **Accept Invitation Flow**
   - Create invitation
   - Admin invitation (with role)
   - Unauthenticated user detection
   - Authenticated user detection
   - Accept invitation action

3. **Reject Invitation Flow**
   - Create and reject invitations

4. **Admin Bootstrap**
   - Admin user login flow

**Key Patterns:**

1. **Test Context Factory:**

```typescript
async function createTestContext() {
  await resetDb();

  const mockSendMagicLink = vi.fn().mockResolvedValue(undefined);
  const mockSendInvitationEmail = vi.fn().mockResolvedValue(undefined);
  const auth = createAuthService({
    db: env.D1.withSession(),
    stripeService: createStripeService(),
    sesService: { async sendEmail() {} },
    sendMagicLink: mockSendMagicLink,
    sendInvitationEmail: mockSendInvitationEmail,
  });

  const context = async ({ headers }: { headers?: Headers } = {}) => {
    const session = headers
      ? ((await auth.api.getSession({ headers })) ?? undefined)
      : undefined;
    const context = new RouterContextProvider();
    context.set(RequestContext, {
      env,
      authService: auth,
      repository: {} as any,
      stripeService: {} as any,
      session,
    });
    return context;
  };

  const createTestUser = async (email: User["email"]) => {
    // Create user via magic link flow
    const signInMagicLinkResponse = await auth.api.signInMagicLink({
      asResponse: true,
      headers: {},
      body: { email },
    });
    const magicLinkToken = (
      mockSendMagicLink.mock.calls[0][0] as { token: string }
    ).token;
    mockSendMagicLink.mockReset();
    const magicLinkVerifyResponse = await auth.api.magicLinkVerify({
      asResponse: true,
      headers: {},
      query: { token: magicLinkToken },
    });
    user.headers.set("Cookie", sessionCookie(magicLinkVerifyResponse));
    return user;
  };

  return {
    db,
    auth,
    context,
    mockSendMagicLink,
    mockSendInvitationEmail,
    createTestUser,
    sessionCookie,
  };
}
```

2. **Route Testing Pattern:**

```typescript
it("logs in with email", async () => {
  const form = new FormData();
  form.append("email", testUser.email);
  const request = new Request("http://localhost/login", {
    method: "POST",
    body: form,
  });

  await loginAction({
    request,
    context: await c.context(),
    params: {},
    unstable_pattern: "/login",
  });
  expect(c.mockSendMagicLink).toHaveBeenCalledTimes(1);
});
```

3. **Session Cookie Extraction:**

```typescript
const sessionCookie = (response: Response) => {
  const setCookieHeader = response.headers.get("Set-Cookie");
  invariant(setCookieHeader, "Expected Set-Cookie header.");
  const match = setCookieHeader.match(/better-auth\.session_token=([^;]+)/);
  if (!match) throw new Error(`Missing session cookie: ${setCookieHeader}`);
  return `better-auth.session_token=${match[1]}`;
};
```

## Package.json Test Scripts

### crrbuis

```json
{
  "test": "vitest run",
  "test:e2e": "pnpm exec playwright test",
  "typecheck:test": "tsc -p test/tsconfig.json"
}
```

### ctss (Current)

```json
{
  "test": "vitest run",
  "test:e2e": "pnpm exec playwright test",
  "typecheck:test": "tsc -p test/tsconfig.json"
}
```

**Both projects have identical test scripts.**

## Dependencies

### crrbuis

```json
{
  "@cloudflare/vitest-pool-workers": "0.9.3",
  "vitest": "3.2.4",
  "@playwright/test": "1.56.1"
}
```

### ctss (Current)

```json
{
  "@cloudflare/vitest-pool-workers": "0.9.3",
  "vitest": "3.2.4",
  "@playwright/test": "1.57.0",
  "@testing-library/dom": "10.4.1",
  "@testing-library/react": "16.3.1",
  "jsdom": "27.4.0"
}
```

**ctss has additional testing libraries** for client-side unit tests (jsdom, testing-library).

## Key Takeaways

1. **Configuration Alignment:** Both projects use the same vitest-pool-workers configuration pattern
2. **Migration Handling:** Both use `applyD1Migrations` in setup files
3. **DB Reset Pattern:** Both use `resetDb` utility for test isolation
4. **Integration Tests:** crrbuis has comprehensive route/action integration tests that ctss lacks
5. **Test Types:** ctss has client-side unit test setup (jsdom) that crrbuis doesn't use
6. **Durable Objects:** crrbuis has Durable Object test helpers that ctss could use
