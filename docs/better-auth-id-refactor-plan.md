# Better Auth Text ID Refactor Plan

## Goal

Switch Better Auth back to its default ID generation so IDs are text-based (Better Auth–generated) instead of database-generated numeric IDs. We can reset the database, so no data migration is required beyond updating the schema.

## Current State (Numeric IDs)

### Better Auth Configuration

- `src/lib/auth-service.ts` sets `advanced.database.generateId: false` and `useNumberId: true`.
- This delegates ID generation to the database and pushes numeric IDs through Better Auth.

### Adapter Settings

- `src/lib/d1-adapter.ts` sets `supportsNumericIds: true` and `disableIdGeneration: true`.
- Adapter transforms `activeOrganizationId` and `referenceId` from numbers to strings.

### Schema and Domain Types

- `migrations/0001_init.sql` defines `id integer primary key` for most tables.
- `Organization.id` uses `integer primary key autoincrement`.
- Foreign keys use `integer` across `userId`, `organizationId`, etc.
- `src/lib/domain.ts` models `id`, `userId`, `organizationId`, `referenceId` as `number`.

### Code Usage

- SQL queries and JSON projections in `src/lib/repository.ts` treat IDs as numbers.
- Stripe plugin authorization in `src/lib/auth-service.ts` casts IDs with `Number(...)`.

## Target State (Better Auth Default IDs)

- Better Auth generates text IDs (default behavior).
- Database columns for primary keys and foreign keys are `text`.
- Adapter does not disable ID generation and does not need numeric ID transforms.

## Refactor Checklist

1. **Better Auth config** (`src/lib/auth-service.ts`)
   - Remove `advanced.database.generateId: false` and `useNumberId: true`.
   - Keep other `advanced` settings intact.

2. **D1 adapter config** (`src/lib/d1-adapter.ts`)
   - Set `disableIdGeneration: false` (or remove the flag).
   - Set `supportsNumericIds: false` (or remove if unused).
   - Remove numeric-to-string transforms for `activeOrganizationId` and `referenceId` once schema types are text.

3. **Schema** (`migrations/0001_init.sql`)
   - Change all primary key columns to `id text primary key`.
   - Change all foreign key columns to `text` (e.g., `userId`, `organizationId`, `referenceId`).
   - Remove `autoincrement` from `Organization.id`.
   - Update seed inserts to use text IDs (or remove seed data if not required).

4. **Domain types** (`src/lib/domain.ts`)
   - Update ID fields to `z.string()`.
   - Update `referenceId` and other ID references to `string` to match the DB schema.

5. **Repository SQL and binding** (`src/lib/repository.ts`)
   - Ensure query bindings and projections use string IDs.
   - Remove any `Number(...)` conversion paths on IDs.

6. **Stripe plugin logic** (`src/lib/auth-service.ts`)
   - Replace `Number(user.id)` and `Number(referenceId)` with direct string bindings once DB IDs are text.

7. **Adapter tests** (`test/d1/d1-adapter.test.ts`)
   - Drop the number-id test suite once numeric IDs are removed.
   - Update any test setup assumptions to match text ID schema.

## Notes / Risks

- Better Auth expects IDs as strings in API inputs and outputs even when numeric IDs are used. Moving to text IDs removes the conversion friction.
- Resetting the database is required after schema changes.
- Route params can remain named `organizationId` but should be treated as strings end-to-end.

