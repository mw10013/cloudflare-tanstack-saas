# E2E delete cleanup

## Summary

- E2E deletes must remove both D1 records and related Stripe customers.
- Stripe search is eventually consistent, so deleted customers can still appear briefly.
- Better Auth uses Stripe search by organization metadata when `stripeCustomerId` is empty.

## Root cause

- Organization IDs were being reused after deletes in local tests.
- Better Auth uses `organizationId` in Stripe metadata, so reused IDs can match stale customers.
- Stripe search index lag can surface deleted customers, leading to `resource_missing` errors.

## Fixes applied

- Organization primary keys now use `autoincrement` to prevent ID reuse.
- E2E delete endpoint deletes Stripe customers found by:
  - email
  - `metadata.organizationId`
- E2E delete cancels subscriptions, unlinks metadata, and deletes customers.

## Better Auth behavior (reference)

- `refs/better-auth/packages/stripe/src/routes.ts` searches by
  `metadata["organizationId"]:"${org.id}"` when org has no `stripeCustomerId`.
- If a customer is returned by that search, it is reused for checkout creation.

## Practical guidance

- Use the e2e delete endpoint before Stripe tests.
- If a test fails with `No such customer`, check Stripe search results for that org id.
- Avoid reusing org IDs to prevent metadata collisions in Stripe search.
