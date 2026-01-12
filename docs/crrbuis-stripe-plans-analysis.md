# Stripe Plans Implementation in crrbuis

## Overview

The crrbuis reference code implements a Stripe subscription system with plans defined locally, synchronized with Stripe API, and cached in Cloudflare Workers KV.

## 1. Plan Specification (`planData`)

Plans are defined as a const array in `refs/crrbuis/lib/domain.ts:116-138`:

```ts
export const planData = [
  {
    name: "basic",
    displayName: "Basic",
    description: "For personal use.",
    monthlyPriceInCents: 5000,
    monthlyPriceLookupKey: "basic-monthly",
    annualPriceInCents: Math.round(5000 * 12 * 0.8), // 20% discount
    annualPriceLookupKey: "basic-annual",
    freeTrialDays: 2,
  },
  {
    name: "pro",
    displayName: "Pro",
    description: "For professionals.",
    monthlyPriceInCents: 10000,
    monthlyPriceLookupKey: "pro-monthly",
    annualPriceInCents: Math.round(10000 * 12 * 0.8),
    annualPriceLookupKey: "pro-annual",
    freeTrialDays: 7,
  },
] as const;
```

### Key Points

- `name`: Lowercase identifier (required by better-auth)
- `displayName`: Human-readable plan name
- `description`: Short description
- `monthlyPriceInCents`: Monthly price in cents
- `monthlyPriceLookupKey`: Stripe lookup key for monthly price
- `annualPriceInCents`: Annual price in cents (includes 20% discount calculation)
- `annualPriceLookupKey`: Stripe lookup key for annual price
- `freeTrialDays`: Free trial duration

## 2. Caching in KV

Plans are cached with key `"stripe:plans"` in `refs/crrbuis/lib/stripe-service.ts:24-33`:

```ts
const getPlans = async (): Promise<Plan[]> => {
  const key = "stripe:plans";
  const cachedPlans = await env.KV.get(key, { type: "json" });
  if (cachedPlans) {
    const parseResult = z.array(PlanSchema).safeParse(cachedPlans);
    if (parseResult.success) {
      console.log(`stripeService: getPlans: cache hit`);
      return parseResult.data;
    }
  }
  console.log(`stripeService: getPlans: cache miss`);
  // ... fetch from Stripe
  await env.KV.put(key, JSON.stringify(plans));
  return plans;
};
```

### Cache Flow

1. Check KV for cached plans with key `"stripe:plans"`
2. If cache hit, validate with Zod schema and return
3. If cache miss or invalid, fetch from Stripe API
4. Store fetched plans in KV for next request

## 3. Stripe Population

If prices don't exist in Stripe, they're created in `refs/crrbuis/lib/stripe-service.ts:44-79`:

```ts
if (priceList.data.length === 0) {
  // Create products first
  const products = await Promise.all(
    planData.map(async (plan) => {
      const product = await stripe.products.create({
        name: plan.displayName,
        description: `${plan.displayName} plan.`,
      });
      return { plan, product };
    }),
  );
  // Then create prices for each product
  const prices = await Promise.all(
    products.flatMap(({ plan, product }) => [
      stripe.prices.create({
        product: product.id,
        unit_amount: plan.monthlyPriceInCents,
        currency: "usd",
        recurring: { interval: "month" },
        lookup_key: plan.monthlyPriceLookupKey,
        expand: ["product"],
      }),
      stripe.prices.create({
        product: product.id,
        unit_amount: plan.annualPriceInCents,
        currency: "usd",
        recurring: { interval: "year" },
        lookup_key: plan.annualPriceLookupKey,
        expand: ["product"],
      }),
    ]),
  );
}
```

### Creation Process

1. Query Stripe for prices using lookup keys
2. If no prices found, create products first
3. Create two prices per product (monthly and annual)
4. Use `lookup_key` for stable references (allows price changes without code changes)
5. Expand product data to avoid additional API calls

## 4. Better Auth Integration

Plans are returned to Better Auth plugin in `refs/crrbuis/lib/auth-service.ts:200-228`:

```ts
stripe({
  stripeClient: stripeService.stripe,
  stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
  subscription: {
    enabled: true,
    plans: async () => {
      const plans = await stripeService.getPlans();
      return plans.map((plan) => ({
        name: plan.name,
        priceId: plan.monthlyPriceId,
        annualDiscountPriceId: plan.annualPriceId,
        freeTrial: {
          days: plan.freeTrialDays,
          onTrialStart: (subscription) => {
            console.log(
              `stripe plugin: onTrialStart: ${plan.name} plan trial started for subscription ${subscription.id}`,
            );
            return Promise.resolve();
          },
          onTrialEnd: ({ subscription }) => {
            console.log(
              `stripe plugin: onTrialEnd: ${plan.name} plan trial ended for subscription ${subscription.id}`,
            );
            return Promise.resolve();
          },
          onTrialExpired: (subscription) => {
            console.log(
              `stripe plugin: onTrialExpired: ${plan.name} plan trial expired for subscription ${subscription.id}`,
            );
            return Promise.resolve();
          },
        },
      }));
    },
  },
}),
```

### Integration Points

- `priceId`: Used for monthly subscriptions
- `annualDiscountPriceId`: Used for annual subscriptions
- `freeTrial`: Configuration for trial periods with lifecycle hooks
- Lifecycle hooks: `onTrialStart`, `onTrialEnd`, `onTrialExpired`

## 5. Usage in UI

Plans are fetched in route loaders like `refs/crrbuis/app/routes/_mkt.pricing.tsx:13-18`:

```ts
export async function loader({ context }: Route.LoaderArgs) {
  const requestContext = context.get(RequestContext);
  invariant(requestContext, "Missing request context.");
  const { stripeService } = requestContext;
  const plans = await stripeService.getPlans();
  return { plans };
}
```

### Action Handler

When user selects a plan, the lookup key is used to identify the plan:

```ts
const plans = await stripeService.getPlans();
const plan = plans.find(
  (p) =>
    p.monthlyPriceLookupKey === intent || p.annualPriceLookupKey === intent,
);
invariant(plan, `Missing plan for intent ${intent}`);

const { url } = await auth.api.upgradeSubscription({
  headers: request.headers,
  body: {
    plan: plan.name,
    annual: intent === plan.annualPriceLookupKey,
    referenceId: activeOrganizationId,
    subscriptionId,
    seats: 1,
    successUrl: ReactRouter.href("/app"),
    cancelUrl: ReactRouter.href("/pricing"),
    returnUrl: ReactRouter.href("/app/:organizationId/billing", {
      organizationId: activeOrganizationId,
    }),
    disableRedirect: false,
  },
});
```

## Summary

The implementation follows a clean separation of concerns:

1. **Specification**: `planData` defines plan configuration in code
2. **Caching**: KV cache reduces API calls and improves performance
3. **Synchronization**: Automatic Stripe product/price creation if missing
4. **Integration**: Better Auth plugin consumes plans for subscription management
5. **UI**: Routes fetch plans via `stripeService.getPlans()` for display

The use of Stripe `lookup_key` allows price updates without code changes, while the KV cache ensures optimal performance.
