# Test Infrastructure Implementation Plan for ctss

## Overview

This plan outlines the steps to bring crrbuis test patterns to ctss (cloudflare-tanstack-saas), enhancing the existing D1 adapter tests with integration tests for TanStack Start routes, actions, and authentication flows.

## Current State Assessment

### Already Implemented

- [x] Root `vitest.config.ts` with project-based discovery
- [x] `test/d1/vitest.config.ts` with D1 migration handling
- [x] `test/apply-migrations.ts` - Database migration setup
- [x] `test/test-utils.ts` - Database reset utility
- [x] `test/test-worker.ts` - Minimal test worker
- [x] `test/cloudflare-test.d.ts` - Type declarations for `cloudflare:test`
- [x] `test/d1/d1-adapter.test.ts` - Better-auth D1 adapter tests
- [x] D1 database configuration in `wrangler.jsonc`

### Gaps Identified

1. **TypeScript Configuration:**
   - `test/tsconfig.json` lacks vitest types and proper module configuration
   - Missing paths configuration for test aliases
   - Missing rootDirs configuration

2. **Test Type Declarations:**
   - Missing `runInDurableObject` helper
   - Missing `listDurableObjectIds` helper

3. **Integration Tests:**
   - No route/action integration tests
   - No authentication flow tests
   - No organization/invitation flow tests

4. **Test Utilities:**
   - Missing `createTestContext` factory pattern
   - Missing `createTestUser` helper
   - Missing session cookie utilities

## Implementation Plan

### Phase 1: TypeScript Configuration Updates

#### 1.1 Update test/tsconfig.json

```json
{
  "extends": "../tsconfig.json",
  "include": ["./**/*.ts", "../worker-configuration.d.ts"],
  "exclude": [],
  "compilerOptions": {
    "types": [
      "vitest",
      "node",
      "@cloudflare/vitest-pool-workers",
      "@playwright/test"
    ],
    "tsBuildInfoFile": "../node_modules/.tmp/tsconfig.test.tsbuildinfo",
    "module": "esnext",
    "moduleResolution": "bundler",
    "lib": ["es2023", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "rootDirs": [".."]
  }
}
```

**Priority:** High
**Estimated Effort:** 5 minutes

### Phase 2: Type Declarations Enhancement

#### 2.1 Update test/cloudflare-test.d.ts

Add Durable Object test helpers:

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

  export function runInDurableObject<T>(
    stub: any,
    callback: (instance: any, state: any) => Promise<T>,
  ): Promise<T>;

  export function listDurableObjectIds(namespace: any): Promise<any[]>;
}
```

**Priority:** Medium
**Estimated Effort:** 10 minutes

### Phase 3: Test Utilities Expansion

#### 3.1 Enhance test/test-utils.ts

Add integration test utilities:

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

export function extractSessionCookie(response: Response): string {
  const setCookieHeader = response.headers.get("Set-Cookie");
  if (!setCookieHeader) throw new Error("Expected Set-Cookie header");
  const match = setCookieHeader.match(/better-auth\.session_token=([^;]+)/);
  if (!match) throw new Error(`Missing session cookie: ${setCookieHeader}`);
  return `better-auth.session_token=${match[1]}`;
}

export function parseSetCookie(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader.split(";").map((cookie) => {
      const [key, value] = cookie.trim().split("=");
      return [key, value];
    }),
  );
}
```

**Priority:** Medium
**Estimated Effort:** 15 minutes

### Phase 4: Integration Test Suite Creation

#### 4.1 Create test/integration/auth.test.ts

Test authentication flows:

- Login with email
- Magic link verification
- Sign out
- Session persistence

#### 4.2 Create test/integration/invitations.test.ts

Test invitation flows:

- Create invitation
- Accept invitation (authenticated)
- Reject invitation
- Invitation role handling

#### 4.3 Create test/integration/organizations.test.ts (Optional)

Test organization flows:

- Organization creation
- Member management
- Role-based access

**Pattern to Follow** (from crrbuis auth.test.ts):

```typescript
import { env } from "cloudflare:workers";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createAuthService } from "@/lib/auth-service";
import { RequestContext } from "@/lib/request-context";
import { loginAction } from "@/routes/login";
import { extractSessionCookie, resetDb } from "../test-utils";

type TestContext = Awaited<ReturnType<typeof createTestContext>>;

async function createTestContext() {
  await resetDb();

  const mockSendMagicLink = vi.fn().mockResolvedValue(undefined);
  const auth = createAuthService({
    db: env.D1.withSession(),
    stripeService: createStripeService(),
    sesService: { async sendEmail() {} },
    sendMagicLink: mockSendMagicLink,
  });

  const context = async ({ headers }: { headers?: Headers } = {}) => {
    const session = headers
      ? ((await auth.api.getSession({ headers })) ?? undefined)
      : undefined;
    const ctx = new RouterContextProvider();
    ctx.set(RequestContext, {
      env,
      authService: auth,
      repository: {} as any,
      stripeService: {} as any,
      session,
    });
    return ctx;
  };

  const createTestUser = async (email: string) => {
    await auth.api.signInMagicLink({ headers: {}, body: { email } });
    const magicLinkToken = (
      mockSendMagicLink.mock.calls[0][0] as { token: string }
    ).token;
    mockSendMagicLink.mockReset();
    await auth.api.magicLinkVerify({
      headers: {},
      query: { token: magicLinkToken },
    });
    const user = { email, headers: new Headers() };
    return user;
  };

  return { db: env.D1, auth, context, mockSendMagicLink, createTestUser };
}

describe("authentication flow", () => {
  let c: TestContext;

  beforeAll(async () => {
    c = await createTestContext();
  });

  afterEach(() => vi.restoreAllMocks());

  it("sends magic link on login", async () => {
    const form = new FormData();
    form.append("email", "test@example.com");
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
});
```

**Priority:** High
**Estimated Effort:** 2-4 hours

### Phase 5: Vite Configuration for Tests

#### 5.1 Update vitest.config.ts (Optional Enhancement)

Currently identical to crrbuis. No changes required unless adding coverage or global setup.

**Priority:** Low
**Estimated Effort:** N/A

### Phase 6: Test Script Verification

#### 6.1 Verify test commands work

```bash
pnpm test              # Should run vitest run
pnpm typecheck:test   # Should pass without errors
```

**Priority:** High
**Estimated Effort:** 10 minutes

## Dependencies Check

All required dependencies are already present:

- `@cloudflare/vitest-pool-workers`: 0.9.3
- `vitest`: 3.2.4
- `@playwright/test`: 1.57.0
- `vite-tsconfig-paths`: 6.0.3 (via vite-tsconfig-paths in deps)

## Files to Create/Modify

### New Files to Create

1. `test/cloudflare-test.d.ts` - Enhanced type declarations
2. `test/test-utils.ts` - Enhanced utilities
3. `test/integration/auth.test.ts` - Auth integration tests
4. `test/integration/invitations.test.ts` - Invitation integration tests

### Files to Modify

1. `test/tsconfig.json` - Add missing TypeScript options
2. `test/d1/vitest.config.ts` - Add resolve.alias if needed

### Files Already Complete

- `vitest.config.ts` - Root config (no changes)
- `test/apply-migrations.ts` - Migration setup (no changes)
- `test/test-worker.ts` - Test worker (no changes)
- `test/d1/d1-adapter.test.ts` - D1 adapter tests (no changes)
- `test/d1/vitest.config.ts` - D1 test config (no changes)

## Execution Order

1. **Phase 1:** Update `test/tsconfig.json`
2. **Phase 2:** Update `test/cloudflare-test.d.ts`
3. **Phase 3:** Enhance `test/test-utils.ts`
4. **Phase 4:** Create integration tests
5. **Phase 6:** Verify test commands

## Estimated Total Effort

- **Configuration Updates:** 30 minutes
- **Integration Tests:** 2-4 hours
- **Verification:** 10 minutes

**Total:** 3-5 hours

## Verification Checklist

- [ ] `pnpm test` runs successfully
- [ ] `pnpm typecheck:test` passes without errors
- [ ] D1 adapter tests pass
- [ ] New integration tests pass
- [ ] No TypeScript errors in test files
- [ ] Type declarations resolve correctly
