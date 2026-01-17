# Better Auth Stripe org billing analysis and plan

## Context

- Organization is created on user signup with role `owner`.
- Stripe customer should belong to the organization, not the user.
- Stripe customer should be created on first subscription, not on signup.
- Pricing page uses Better Auth Stripe plugin to create checkout sessions.
- E2E test (`basic-monthly` for `stripe-basic-monthly@e2e.com`) intermittently fails with `no such customer` errors.

## Better Auth docs highlights

- Enable org customers with:
  - `organization()` plugin installed
  - `stripe({ organization: { enabled: true } })`
- Org billing requires `customerType: "organization"` when calling subscription APIs.
- Use `referenceId` as the organization id when creating subscriptions.
- Stripe customer is created on first subscription for that customer type + reference id.
- Org name updates sync to Stripe when org customers are enabled.

## Current implementation review

- `src/lib/auth-service.ts` configures `organization()` and `stripe({ organization: { enabled: true } })`.
- Pricing page uses `upgradeSubscription` with `customerType: "organization"` and `referenceId: activeOrganizationId`.
- Billing page uses org reference id for list/cancel/restore/billing portal actions.
- `createCustomerOnSignUp` is false, which matches the desired flow.

## Likely failure mode

- Stripe plugin resolves a customer id that does not exist in Stripe, causing checkout creation to fail.
- Causes may include:
  - Stale or incorrect `stripeCustomerId` values in the database (especially on `User`).
  - Org/customer mismatch if any call omits `customerType: "organization"` or uses an inconsistent `referenceId`.
  - E2E cleanup deleting only by email, leaving org Stripe customers or subscriptions behind.

## Database expectations

- `Organization.stripeCustomerId` populated after first subscription.
- `User.stripeCustomerId` should remain empty.
- `Subscription.referenceId` should be the organization id.
- All subscription API calls should include `customerType: "organization"`.

## Plan

1. Map all subscription-related API calls and ensure `customerType` + `referenceId` are consistently passed.
2. Audit where `stripeCustomerId` is read/written to ensure org-only population.
3. Strengthen e2e delete flow to remove org stripe customers/subscriptions by org `stripeCustomerId` and org ids.
4. Add diagnostics in pricing/billing to surface org/subscription/customer ids for debugging.
5. Run `pnpm typecheck` and `pnpm lint`.
6. Run the failing Playwright test with tracing once diagnostics are in place.
