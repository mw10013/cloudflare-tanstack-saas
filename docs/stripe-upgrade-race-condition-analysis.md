# Analysis of Subscribe/Upgrade Tests in @e2e/stripe.spec.ts

## Overview

The subscribe/upgrade tests in `@e2e/stripe.spec.ts` are designed to verify the end-to-end flow of subscribing to a plan and then upgrading it. The tests that frequently fail (but not always) are those upgrading from monthly to annual pricing for the same plan (e.g., `basic-monthly` to `basic-annual`, `pro-monthly` to `pro-annual`). These intermittent failures suggest a race condition between the Stripe webhook processing and the test's database verification.

## Test Flow Breakdown

### 1. Initial Subscription (`subscribe` test)

- **Delete User**: Calls `/api/e2e/delete/user/{email}` to clean up any existing test data.
- **Login**: Navigates to `/login`, fills email, sends magic link, clicks the link, waits for `/app/` URL.
- **Subscribe**:
  - Navigates to `/pricing`.
  - Selects plan based on `intent` (lookup key like `basic-monthly`).
  - Fills payment form with test card details (`4242 4242 4242 4242`).
  - Submits payment.
  - Waits for URL change (likely to Stripe checkout success).
- **Verify Subscription**:
  - Navigates to billing page.
  - Reloads page and asserts plan name and status `trialing` within 60 seconds.

### 2. Upgrade Flow (`subscribe/upgrade` test)

- **Same initial steps**: Delete user, login, subscribe with first intent (e.g., `basic-monthly`), verify `trialing`.
- **Upgrade**:
  - Navigates to `/pricing`.
  - Selects new plan based on `intent1` (e.g., `basic-annual`).
  - Clicks the "Get [Plan]" button (data-testid matches plan name).
  - Waits for URL change (redirect after Stripe checkout).
- **Verify Subscription**:
  - Navigates to billing page.
  - Reloads page and asserts new plan name and status `active` within 60 seconds.

## Page Refresh Behavior in Tests

The `verifySubscription` method implements retry logic to handle asynchronous updates, including page refreshes to fetch the latest data from the database. However, this does not eliminate the race condition if the webhook has not yet processed.

### Code Excerpt: verifySubscription Method

```typescript
async verifySubscription({
  planName,
  status,
}: {
  planName: string;
  status: string;
}) {
  await this.navigateToBilling();
  await expect(async () => {
    await this.page.reload();  // Forces fresh data fetch from DB
    await expect(this.page.getByTestId("active-plan")).toContainText(
      planName,
      { ignoreCase: true, timeout: 100 },
    );
    await expect(this.page.getByTestId("active-status")).toContainText(
      status,
      { ignoreCase: true, timeout: 100 },
    );
  }).toPass({ timeout: 60_000 });  // Retries until assertions pass or timeout
}
```

- `navigateToBilling()` loads the billing page initially.
- The `expect` callback with `toPass` retries the entire block (including `page.reload()`) every few seconds until successful or timeout.
- `page.reload()` ensures the page fetches current DB state on each retry, but if the Stripe webhook hasn't updated the DB, the data remains stale, causing retries.

This approach accounts for potential UI staleness but relies on the webhook completing within the 60-second window.

## Potential Race Condition Sources

### Stripe Webhook Processing

The suspected race condition stems from asynchronous Stripe webhook handling:

1. **Checkout Session Creation**: When upgrading, the `upgradeSubscriptionServerFn` in `src/routes/_mkt.pricing.tsx` calls `authService.api.upgradeSubscription()` from the Better Auth Stripe plugin.

2. **Stripe Checkout Redirect**: User completes payment on Stripe, which redirects to the `successUrl` (`/app`).

3. **Better Auth Success URL Handling**: According to Better Auth docs, the plugin modifies the success URL to create an intermediate redirect that "ensures the subscription status is properly updated in the system before redirecting users to the final success page" (source: https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/plugins/stripe.mdx#creating-a-subscription--success-url-handling).

4. **Webhook Events**: The plugin automatically handles webhooks like:
   - `checkout.session.completed`: Processed immediately for checkout completion.
   - `customer.subscription.updated`: Fired when subscription details change (e.g., plan upgrade).

### Race Condition Details

- The intermediate redirect likely waits for `checkout.session.completed` but may not wait for `customer.subscription.updated`.
- The test's `verifySubscription` immediately checks the database after the redirect, but the `customer.subscription.updated` webhook might process asynchronously after the redirect completes.
- For same-plan monthly-to-annual upgrades, Stripe may handle this as a subscription modification rather than a new subscription, potentially delaying the webhook or changing the event sequence.

### Why It Fails Intermittently

- **Network/Webhook Latency**: Webhook delivery can be delayed due to Stripe's processing time or network issues.
- **Event Ordering**: `checkout.session.completed` might fire before `customer.subscription.updated`, causing the intermediate redirect to proceed before the DB is fully updated.
- **Test Timing**: The 60-second timeout in `verifySubscription` might not be sufficient if webhooks are particularly slow in some environments.

### Additional Race Condition in upgrade() Method

The `upgrade()` method has a separate race condition unrelated to webhooks, causing failures "at the confirm click":

- **Mutation Dependency on DB State**: The upgrade relies on the DB being updated by prior webhooks. If `customer.subscription.updated` hasn't processed, `subscriptionId` is `undefined`, leading the Better Auth `upgradeSubscription` to fail or behave unexpectedly (e.g., create a new subscription instead of upgrading).
- **Inconsistent Page State**: On mutation failure, the page stays on `/pricing` with an error alert, and no `data-testid="confirm"` element exists. The test attempts the click anyway, failing immediately (element not found) within Playwright's 30s action timeout.
- **Intermittent Weird State**:
  - Fast webhooks: Mutation succeeds, redirects to Stripe, `confirm` click proceeds (but may fail if the element doesn't exist on Stripe's page).
  - Slow webhooks: Mutation fails, page remains on pricing in error state, `confirm` click fails early, creating the "weird state" before the 2min test timeout.

This explains why failures occur at the `confirm` click— the test assumes a redirect but sometimes gets stuck on an error page.

## Code Excerpts

### Test Upgrade Method (StripePom)

```typescript
async upgrade({ intent }: { intent: string }) {
  await this.navigateToPricing();
  await this.selectPlan({ intent });
  await this.page.getByTestId("confirm").click();  // Actually "Get [Plan]" button
  await this.page.waitForURL(`${this.baseURL}**`);
}
```

### Server-Side Upgrade (src/routes/\_mkt.pricing.tsx)

```typescript
const { url, redirect: isRedirect } = await authService.api.upgradeSubscription(
  {
    headers: request.headers,
    body: {
      plan: plan.name,
      annual: intent === plan.annualPriceLookupKey,
      referenceId: activeOrganizationId,
      subscriptionId,
      seats: 1,
      successUrl: "/app",
      cancelUrl: "/pricing",
      returnUrl: `/app/${activeOrganizationId}`,
      disableRedirect: false,
    },
  },
);
```

### Better Auth Stripe Plugin Configuration (src/lib/auth-service.ts)

```typescript
stripe({
  stripeClient: stripeService.stripe,
  stripeWebhookSecret,
  // ... other config
  onEvent: ({ event }) => {
    console.log(`stripe plugin: onEvent: stripe event received: ${event.type}`);
  },
  // Automatic handling of subscription events
}),
```

### Webhook Handling (src/routes/api/auth/$.tsx)

```typescript
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request, context }) => {
        return context.authService.handler(request); // Handles webhooks
      },
      POST: async ({ request, context }) => {
        return context.authService.handler(request); // Handles webhooks
      },
    },
  },
});
```

## Recommendations

1. **Increase Test Timeout**: Extend the `verifySubscription` timeout beyond 60 seconds for upgrade tests.
2. **Add Retry Logic**: Implement more robust polling in `verifySubscription` to wait for specific DB changes.
3. **Better Auth Enhancement**: Consider requesting Better Auth to ensure success URL handling waits for all relevant webhooks (including `customer.subscription.updated`).
4. **Webhook Monitoring**: Add logging or monitoring for webhook event timing to diagnose delays.
5. **Test Isolation**: Ensure webhooks from previous tests don't interfere by using unique identifiers or waiting for webhook completion.</content>
   <parameter name="filePath">docs/stripe-upgrade-race-condition-analysis.md
