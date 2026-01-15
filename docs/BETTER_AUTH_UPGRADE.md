# Better-Auth Upgrade Analysis and Plan

## Current State

| Package               | Current Version | Latest Version | Latest Release Date |
| --------------------- | --------------- | -------------- | ------------------- |
| `better-auth`         | 1.4.12          | 1.4.12         | Jan 13, 2026        |
| `@better-auth/core`   | 1.4.12          | 1.4.12         | Jan 13, 2026        |
| `@better-auth/stripe` | 1.4.12          | 1.4.12         | Jan 13, 2026        |
| `@better-auth/cli`    | 1.4.12          | 1.4.12         | Jan 13, 2026        |

**Gap**: 0 versions (1.4.12 → 1.4.12) - Upgrade completed.

---

## Key Changes in Better-Auth 1.4.x

### 1. Stateless Session Management

From the v1.4.0 changelog:

> **Stateless session management** - by @Bekacru, @ping-maxwell, and @himself65 in [#5601](https://github.com/better-auth/better-auth/pull/5601)

This is a significant architectural change. Sessions can now be managed without mandatory database persistence, with optional cookie-based caching.

**Impact on codebase**: Our current configuration stores sessions in the database:

```typescript
// src/lib/auth-service.ts:60
session: { modelName: "Session", storeSessionInDatabase: true },
```

This setting can remain, but the new architecture may offer performance improvements.

### 2. Adapter Join Support

From v1.4.0:

> **Adapter join support** - by @ping-maxwell in [#5730](https://github.com/better-auth/better-auth/pull/5730)

> **Utilize database joins across better-auth** - by @ping-maxwell in [#6004](https://github.com/better-auth/better-auth/pull/6004)

This feature optimizes queries by using JOINs instead of separate database calls when fetching related data.

**Impact on codebase**: Our custom D1 adapter may benefit from this optimization if properly implemented. The adapter now supports more efficient querying patterns.

### 3. Session Store Chunking

From v1.4.0:

> **Session store chunking** - by @himself65 and **Copilot** in [#5645](https://github.com/better-auth/better-auth/pull/5645)

Large session data stored in cookies is now automatically chunked to avoid size limits.

**Impact on codebase**: No configuration changes needed; this is automatic.

### 4. Custom Adapter Improvements

The adapter interface has been enhanced with:

- **`customTransformInput`**: Now receives additional context including `fieldAttributes`, `action`, `model`, `schema`, and `options`
- **`customTransformOutput`**: Enhanced with `select` parameter and more context
- **`mapKeysTransformInput` / `mapKeysTransformOutput`**: New key mapping capabilities
- **`transaction`**: Better transaction support with async local storage

### 5. ESM-Only Build

From v1.4.0:

> **Esm only** - by @himself65 in [#5703](https://github.com/better-auth/better-auth/pull/5703)

Better-Auth 1.4.x is ESM-only. Our project is already configured as ESM (`"type": "module"` in package.json), so this should not cause issues.

### 6. Stripe Plugin Enhancements

Key Stripe plugin changes:

| Version | Change                                                                                                 | Impact                                       |
| ------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| 1.4.11  | **Organization customer support** - Enhanced stripe plugin with organization customer support          | ✅ Directly relevant to our use case         |
| 1.4.10  | **Flexible subscription cancellation** - Flexible subscription cancellation and termination management | May simplify cancellation flow               |
| 1.4.10  | **Handle `customer.subscription.created` webhook event**                                               | Better webhook handling                      |
| 1.4.9   | **Array field handling across adapters**                                                               | Bug fix for subscription metadata            |
| 1.4.0   | **Upgrade stripe support to v19.1.0**                                                                  | We currently use stripe v19.3.0 - compatible |

### 7. Organization Plugin Improvements

| Version | Change                                               | Impact                    |
| ------- | ---------------------------------------------------- | ------------------------- |
| 1.4.11  | **Hook injection with opts pattern**                 | May affect our workaround |
| 1.4.9   | **Allow invited users to see organization name**     | New feature               |
| 1.4.9   | **Validate role existence in inviteMember endpoint** | Bug fix                   |

---

## Breaking Changes

### 1. Admin Plugin: Impersonation Disabled by Default

From v1.4.6:

> **admin**: Prevent impersonating admins by default [breaking] - by @jslno and @Bekacru

If our codebase uses the admin impersonation feature, we need to explicitly enable it:

```typescript
admin({
  // Add this if impersonation is needed
  // impersonateEnabled: true
});
```

### 2. Zod Type Replacement

From v1.4.0:

> **core**: Replace ZodType with `@standard-schema/spec` - by @himself65

This is an internal change but affects validation behavior. The migration to standard-schema means validators behave slightly differently.

### 3. JWT Plugin Changes

From v1.4.0:

- JWT plugin now supports custom adapter option
- Added JWT verification endpoint
- Added key rotation support

If using JWT plugin, configuration may need updates.

### 4. Deprecations

- `ssoClient` export removed from client plugin
- `forgetPassword` endpoints removed
- `generateId: "serial"` treated as numeric ID (UUID column types corrected)

---

## Workarounds in Current Codebase

### Workaround 1: Stripe Plugin `lookupKey` and `annualDiscountLookupKey`

**Location**: `src/lib/auth-service.ts:153-154`

```typescript
// [BUG]: Stripe plugin does not handle lookupKey and annualDiscountLookupKey in onCheckoutSessionCompleted: https://github.com/better-auth/better-auth/issues/3537
// Workaround: populate `priceId`.
plans: async () => {
  const plans = await stripeService.getPlans();
  return plans.map((plan) => ({
    name: plan.name,
    priceId: plan.monthlyPriceId,
    annualDiscountPriceId: plan.annualPriceId,
    // ...
  }));
};
```

**Status**: This workaround uses `priceId` and `annualDiscountPriceId` directly. In v1.4.x, the Stripe plugin may have improved handling, but the current approach should still work. The issue referenced (#3537) should be verified in the new version.

### Workaround 2: Better-Auth `createInvitation` Role Bug

**Location**: `src/routes/app.$organizationId.invitations.tsx:155-165`

```typescript
// Workaround for better-auth createInvitation role bug.
// Occurs when a pending invitation exists and a new invitation is created with a different role.
if (result.role !== role) {
  console.log(
    `Applying workaround for better-auth createInvitation role bug: expected role ${role}, got ${String(result.role)} for invitation ${String(result.id)}`,
  );
  await repository.updateInvitationRole({
    invitationId: Number(result.id),
    role,
  });
}
```

**Status**: This bug was related to how invitations were created when a pending invitation already existed with a different role. The v1.4.9 changelog mentions "Validate role existence in inviteMember endpoint" which may have addressed related issues. **Should test after upgrade** to determine if workaround is still needed.

### Workaround 3: D1 Adapter Custom Implementation

**Location**: `src/lib/d1-adapter.ts`

The custom D1 adapter implements:

- Model name capitalization handling (e.g., `user` → `User`)
- ID field mapping (e.g., `userId` → `id`)
- Date serialization in where clauses
- `activeOrganizationId` transformation (number → string)
- Custom adapter with `createAdapterFactory`

**Status**: The adapter factory in v1.4.x has enhanced capabilities:

- `mapKeysTransformInput` / `mapKeysTransformOutput` could replace some manual mapping
- `customTransformInput` / `customTransformOutput` have more context
- Better support for numeric IDs and transaction handling

**However**, D1-specific features (like `returning *` syntax) mean the custom adapter will likely need to remain.

---

## D1 Adapter Analysis

### Current Implementation Summary

```typescript
// src/lib/d1-adapter.ts

export const d1Adapter = (db: D1Database | D1DatabaseSession) => {
  return createAdapterFactory({
    config: {
      adapterId: "d1-adapter",
      adapterName: "D1 Adapter",
      supportsNumericIds: true,
      supportsDates: false, // We serialize dates ourselves
      supportsBooleans: false, // We don't use boolean columns
      disableIdGeneration: true, // D1 auto-generates IDs
      debugLogs: false,
      customTransformOutput: ({ field, data }) => {
        if (field === "activeOrganizationId" && typeof data === "number") {
          return String(data);
        }
        return data;
      },
    },
    adapter: () => {
      // Implements: create, findOne, findMany, update, updateMany, delete, deleteMany, count
    },
  });
};
```

### Changes Needed for D1 Adapter

1. **No changes required** to the core adapter methods - they follow the `CustomAdapter` interface which hasn't changed.

2. **Consider adding** `mapKeysTransformOutput` to handle `id` → `modelId` mapping more elegantly:

```typescript
mapKeysTransformOutput: {
  id: "userId", // This won't work as-is, needs per-model handling
}
```

The current approach of using `customTransformOutput` per-field is actually more flexible for D1's multi-model scenario.

3. **Verify transaction support**: The current adapter doesn't implement transactions. D1 has transaction support that could be enabled:

```typescript
transaction: async (callback) => {
  const trx = db.batch(); // or db.transaction()
  return callback(trx);
};
```

### D1-Specific Concerns

1. **`returning *` syntax**: D1 supports `returning *` in INSERT/UPDATE/DELETE, which the current adapter uses. This is compatible with v1.4.x.

2. **Boolean handling**: The adapter doesn't set `supportsBooleans: true`, which means booleans are stored as 0/1. This is intentional and correct for D1.

3. **Date handling**: Dates are serialized to ISO strings in `adaptWhere`. This is correct and should remain.

---

## Stripe Plugin Impact

### Current Configuration

```typescript
// src/lib/auth-service.ts:146-241
stripe({
  stripeClient: stripeService.stripe,
  stripeWebhookSecret,
  createCustomerOnSignUp: false,
  subscription: {
    enabled: true,
    requireEmailVerification: true,
    plans: async () => {
      /* ... */
    },
    authorizeReference: async ({ user, referenceId, action }) => {
      /* ... */
    },
    onSubscriptionComplete: ({ subscription, plan }) => {
      /* ... */
    },
    onSubscriptionUpdate: ({ subscription }) => {
      /* ... */
    },
    onSubscriptionCancel: ({ subscription }) => {
      /* ... */
    },
    onSubscriptionDeleted: ({ subscription }) => {
      /* ... */
    },
  },
  schema: {
    subscription: { modelName: "Subscription" },
  },
  onCustomerCreate: ({ stripeCustomer, user }) => {
    /* ... */
  },
  onEvent: (event) => {
    /* ... */
  },
});
```

### Changes in v1.4.x

1. **Organization Customer Support** (v1.4.11): The Stripe plugin now has explicit support for organization-based customers:

```typescript
plugins: [
  organization(),
  stripe({
    // ...
    organization: {
      enabled: true,
    },
  }),
];
```

Our current implementation uses `authorizeReference` to check organization ownership. This new feature may provide a cleaner approach.

2. **Subscription Metadata**: v1.4.9 fixes "Array field handling across adapters" which may affect how subscription metadata is stored.

3. **Webhook Event Handling**: v1.4.10 added handling for `customer.subscription.created` webhook event.

4. **Error Handling**: v1.4.11 improved error handling and `subscriptionSuccess` route.

### Recommendations

1. **Test the webhook handlers** after upgrade - some event types may now be handled automatically.

2. **Consider migrating to organization-based customers** if the new feature is stable:

```typescript
stripe({
  // ...
  organization: {
    enabled: true,
  },
});
```

3. **The `lookupKey` workaround** (using `priceId` directly) should be tested against the fixed version.

---

## Organization Plugin Impact

### Current Configuration

```typescript
// src/lib/auth-service.ts:126-145
organization({
  organizationLimit: 1,
  requireEmailVerificationOnInvitation: true,
  cancelPendingInvitationsOnReInvite: true,
  schema: {
    organization: { modelName: "Organization" },
    member: { modelName: "Member" },
    invitation: { modelName: "Invitation" },
  },
  sendInvitationEmail: /* ... */
})
```

### Changes in v1.4.x

1. **Hook Injection** (v1.4.11): The organization plugin now uses an opts pattern for hook injection, which may affect how we could potentially customize behavior in the future.

2. **Invitation Role Validation** (v1.4.9): The plugin now validates that roles exist when inviting members, which may affect our workaround.

3. **CreatedAt on Invitations** (v1.4.0): Invitations now support `createdAt` field.

### The Invitation Role Bug Workaround

Our workaround handles a scenario where:

1. A pending invitation exists with role X
2. A new invitation is created with role Y
3. Better-Auth returns role X instead of Y

This bug appears to be related to invitation re-use. The v1.4.9 fix "Validate role existence in inviteMember endpoint" may have addressed this.

**Recommendation**: After upgrade, test the invitation flow to determine if the workaround is still needed. If the bug persists, the workaround should remain.

---

## Migration Plan

### Phase 1: Preparation ✅ COMPLETED

1. **Update package.json** dependencies: ✅ Updated to 1.4.12

2. **Run typecheck** after update to identify any TypeScript errors: ✅ Passed

3. **Review ESLint** for any new warnings: ✅ Run (some dist file warnings, but no source code issues)

### Phase 2: Adapter Compatibility

1. **Test the D1 adapter** with the adapter test suite:

```bash
pnpm test
```

2. **Verify all CRUD operations** work correctly:

- User creation and retrieval
- Session creation and validation
- Account linking
- Organization operations
- Invitation creation
- Subscription management

### Phase 3: Feature Testing

1. **Test invitation flow** to determine if the role workaround is still needed:
   - Create invitation with role "member"
   - Create new invitation with role "admin" for same email
   - Verify returned role matches request

2. **Test Stripe webhook handling**:
   - Verify `checkout.session.completed` works
   - Verify `customer.subscription.*` events are handled
   - Check if `lookupKey` is now properly handled

3. **Test organization operations**:
   - Create organization
   - Add members
   - Send and accept invitations

### Phase 4: Production Readiness

1. **Test admin impersonation** if used:

```typescript
admin({
  impersonateEnabled: true, // If needed
});
```

2. **Verify session behavior** with the new stateless architecture:
   - Test session persistence
   - Test session expiry
   - Test concurrent sessions

3. **Performance testing** with adapter join support enabled.

---

## Risk Assessment

| Area                     | Risk Level | Mitigation                                                         |
| ------------------------ | ---------- | ------------------------------------------------------------------ |
| D1 Adapter Compatibility | Low        | Custom adapter isolates our logic; core interface unchanged        |
| Stripe Plugin            | Medium     | Test webhook handlers thoroughly; org customer feature is optional |
| Organization Plugin      | Low        | Invitation role workaround handles edge case                       |
| Admin Plugin             | Low        | Only affects impersonation, not used in current codebase           |
| TypeScript Types         | Medium     | Run typecheck; `@standard-schema` may require validator updates    |

---

## Testing Checklist

- [x] TypeScript compilation succeeds
- [x] ESLint passes with no new errors (dist files excluded)
- [ ] User authentication flow works
- [ ] Session creation and validation works
- [ ] Organization creation on signup works
- [ ] Organization invitation with role works
- [ ] Invitation role workaround can be removed (test first)
- [ ] Stripe subscription creation works
- [ ] Stripe webhook processing works
- [ ] All existing tests pass
- [ ] No regressions in production-like environment

---

## Rollback Plan

If issues are discovered after upgrade:

1. **Pin versions** in package.json:

```json
{
  "resolutions": {
    "better-auth": "1.3.32",
    "@better-auth/core": "1.3.32",
    "@better-auth/stripe": "1.3.32",
    "@better-auth/cli": "1.3.32"
  }
}
```

2. **Run** `pnpm dedupe` and reinstall

3. **Verify** the application works with the previous version

---

## References

- [Better-Auth Changelogs](https://www.better-auth.com/changelogs)
- [Better-Auth GitHub Releases](https://github.com/better-auth/better-auth/releases)
- [Better-Auth Stripe Plugin Docs](https://www.better-auth.com/docs/plugins/stripe)
- [Better-Auth Create DB Adapter Guide](https://www.better-auth.com/docs/guides/create-a-db-adapter)
- [Custom D1 Adapter Source](src/lib/d1-adapter.ts)
- [Auth Service Configuration](src/lib/auth-service.ts)
