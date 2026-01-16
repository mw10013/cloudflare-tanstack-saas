# Better Auth ID Naming Alignment

## Goals

- Align database schema and code with Better Auth’s default `id` primary key convention.
- Remove adapter-level ID remapping and the `betterAuthAccountId` workaround.
- Keep Better Auth organization + stripe integrations predictable (especially `activeOrganizationId`).

## Better Auth Schema Expectations (from docs)

- Core tables (`user`, `session`, `account`, `verification`) use `id` as the primary key.
- `account.accountId` is a **separate** required field that stores the provider account identifier.
- Organization plugin uses `session.activeOrganizationId` typed as `string`.
- Numeric IDs are supported; Better Auth returns them as strings even when stored as numbers.

Sources:

- https://www.better-auth.com/docs/concepts/database
- https://www.better-auth.com/docs/guides/create-a-db-adapter

## Current Schema and Adapter Findings

### Schema (migrations/0001_init.sql)

- Primary keys are named with the `modelId` convention:
  - `User.userId`, `Session.sessionId`, `Organization.organizationId`, `Member.memberId`, `Invitation.invitationId`, `Account.accountId`, `Verification.verificationId`, `Subscription.subscriptionId`.
- `Account.betterAuthAccountId` exists solely to avoid the `accountId` naming collision.
- `Session.activeOrganizationId` is an integer foreign key to `Organization.organizationId`.

### Adapter (src/lib/d1-adapter.ts)

- Implements custom id mapping (`modelId` ↔ `id`) across all models.
- Applies a custom `activeOrganizationId` transform to stringify numbers.
- Works around `accountId` collision by mapping to `betterAuthAccountId`.

### Codebase Usage

- Domain types mirror `modelId` columns (`src/lib/domain.ts`).
- SQL queries and JSON projections embed `userId`, `organizationId`, etc. (`src/lib/repository.ts`, `src/routes/**`).
- Auth config maps account field names to `betterAuthAccountId` (`src/lib/auth-service.ts`).
- `activeOrganizationId` is treated as `number | null` in domain types and stored as numeric in D1.

## Proposed Target Schema (Better Auth Convention)

- Use `id` as the primary key across core and plugin tables:
  - `User.id`, `Session.id`, `Organization.id`, `Member.id`, `Invitation.id`, `Account.id`, `Verification.id`, `Subscription.id`.
- Keep `Account.accountId` (provider identifier) as a separate column.
- Store `activeOrganizationId` as an integer foreign key to `Organization.id` and retain the adapter transform to string.

## Tricky Areas

### `betterAuthAccountId`

- This should be removed entirely in favor of Better Auth’s `accountId` field.
- Data migration needed: rename `betterAuthAccountId` → `accountId` and set the PK column to `id`.
- Update auth config to remove `fields: { accountId: "betterAuthAccountId" }` and remove adapter remapping.

### `activeOrganizationId`

- Better Auth expects `session.activeOrganizationId` to be a string.
- With numeric IDs, Better Auth will still emit strings for `id`, but `activeOrganizationId` is not a primary key field.
- Keep `activeOrganizationId` numeric in D1 and retain the adapter transform to string for Better Auth expectations.

## Refactoring Plan

1. **Schema migration (new SQL migration)**
   - Create new tables or rebuild existing tables with `id` PK columns and updated foreign keys.
   - Replace `betterAuthAccountId` with `accountId` in `Account`.
   - Update indexes to target `id`/`userId` columns that remain as foreign keys.
   - Migrate data: copy existing `modelId` values into `id` columns, then drop old columns.

2. **Update Better Auth configuration** (`src/lib/auth-service.ts`)
   - Remove account field mapping override.
   - Keep numeric IDs (`generateId: false`, `useNumberId: true`) to match the schema.

3. **Simplify the D1 adapter** (`src/lib/d1-adapter.ts`)
   - Remove per-model ID mapping (`modelId` ↔ `id`).
   - Remove `betterAuthAccountId` references.
   - Keep `activeOrganizationId` string conversion in the adapter.

4. **Update domain schemas and repository queries**
   - Change Zod schemas to `id` fields (`src/lib/domain.ts`).
   - Update SQL projections and joins in `src/lib/repository.ts` to use `id` columns.
   - Update any raw SQL in routes and scripts (`src/routes/**`, `scripts/**`, `test/**`).

5. **Adjust route params and type expectations**
   - Ensure route handlers and UI components remain consistent if DB fields rename to `id`.
   - Keep URL params like `organizationId` if desirable, but map them to `id` fields in DB queries.

6. **Verify Better Auth hooks and plugins**
   - Re-check `databaseHookSessionCreateBefore` to use `id` columns.
   - Validate `activeOrganizationId` behavior after schema changes, especially for Stripe org-mode paths.

7. **Docs and tests**
   - Update tests and e2e fixtures that select or assert against `modelId` columns.

## Decisions Locked In

- `activeOrganizationId` stays `integer` with adapter string conversion.
- Numeric IDs remain (`generateId: false`, `useNumberId: true`).
- No external integrations depend on `modelId` column names.

## Remaining Decisions

- Database will be reset after refactor; no backfill needed.
- Keep PascalCase table names; only rename columns to `id`.
