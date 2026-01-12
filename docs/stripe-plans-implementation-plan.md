# Stripe Plans Implementation: tanstack-sandbox3 vs crrbuis

## Overview

The crrbuis reference code implements a Stripe subscription system with plans defined locally, synchronized with Stripe API, and cached in Cloudflare Workers KV. This analysis compares tanstack-sandbox3's current implementation against crrbuis and provides an implementation plan.

## Comparison Analysis

### 1. Plan Specification (✅ IDENTICAL)

**tanstack-sandbox3** (`src/lib/domain.ts:116-138`):

```ts
export const planData = [
  {
    name: "basic",
    displayName: "Basic",
    description: "For personal use.",
    monthlyPriceInCents: 5000,
    monthlyPriceLookupKey: "basic-monthly",
    annualPriceInCents: Math.round(5000 * 12 * 0.8),
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

**crrbuis** has identical plan data. This is fully implemented.

---

### 2. Stripe Service (❌ STUB IMPLEMENTATION)

**tanstack-sandbox3** (`src/lib/stripe-service.ts:17-19`):

```ts
const getPlans = (): Promise<Plan[]> => {
  return Promise.resolve([]);
};
```

**crrbuis** (`refs/crrbuis/lib/stripe-service.ts:24-124`):

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
  const _getPrices = async (): Promise<PriceWithLookupKey[]> => {
    const lookupKeys = planData.flatMap((plan) => [
      plan.monthlyPriceLookupKey,
      plan.annualPriceLookupKey,
    ]);
    const priceList = await stripe.prices.list({
      lookup_keys: lookupKeys,
      expand: ["data.product"],
    });
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
      return prices.map((price) => {
        assertPriceWithLookupKey(price);
        return price;
      });
    } else {
      const prices = priceList.data.filter(isPriceWithLookupKey);
      invariant(
        prices.length === planData.length * 2,
        "Count of prices not " +
          (planData.length * 2).toString() +
          " (" +
          prices.length.toString() +
          ")",
      );
      return prices;
    }
  };

  const prices = await _getPrices();
  const plans: Plan[] = planData.map((plan) => {
    const monthlyPrice = prices.find(
      (p) => p.lookup_key === plan.monthlyPriceLookupKey,
    );
    invariant(monthlyPrice, `Missing monthly price for ${plan.name}`);
    invariant(
      typeof monthlyPrice.product !== "string",
      "Product should be expanded",
    );
    const annualPrice = prices.find(
      (p) => p.lookup_key === plan.annualPriceLookupKey,
    );
    invariant(annualPrice, `Missing annual price for ${plan.name}`);
    return {
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description,
      productId: monthlyPrice.product.id,
      monthlyPriceId: monthlyPrice.id,
      monthlyPriceLookupKey: plan.monthlyPriceLookupKey,
      monthlyPriceInCents: plan.monthlyPriceInCents,
      annualPriceId: annualPrice.id,
      annualPriceLookupKey: plan.annualPriceLookupKey,
      annualPriceInCents: plan.annualPriceInCents,
      freeTrialDays: plan.freeTrialDays,
    };
  });
  await env.KV.put(key, JSON.stringify(plans));
  return plans;
};
```

**Missing:**

- KV caching with key `"stripe:plans"`
- Stripe API calls to fetch/create products and prices
- Lookup key validation
- Product/price population if missing

---

### 3. Billing Portal Configuration (❌ STUB IMPLEMENTATION)

**tanstack-sandbox3** (`src/lib/stripe-service.ts:21-24`):

```ts
const ensureBillingPortalConfiguration = () => {
  console.log("ensureBillingPortalConfiguration");
  return Promise.resolve();
};
```

**crrbuis** (`refs/crrbuis/lib/stripe-service.ts:126-188`):

```ts
const ensureBillingPortalConfiguration = async (): Promise<void> => {
  const key = "stripe:isBillingPortalConfigured";
  const isConfigured = await env.KV.get(key);
  if (isConfigured === "true") return;
  const configurations = await stripe.billingPortal.configurations.list({
    limit: 2,
  });
  if (configurations.data.length === 0) {
    const plans = await getPlans();
    const basicPlan = plans.find((p) => p.name === "basic");
    invariant(basicPlan, "Missing basic plan");
    const proPlan = plans.find((p) => p.name === "pro");
    invariant(proPlan, "Missing pro plan");
    await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: "Manage your subscription and billing information",
      },
      features: {
        customer_update: {
          enabled: true,
          allowed_updates: ["name", "phone"],
        },
        invoice_history: {
          enabled: true,
        },
        payment_method_update: {
          enabled: true,
        },
        subscription_cancel: {
          enabled: true,
          mode: "immediately",
          proration_behavior: "create_prorations",
        },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ["price"],
          proration_behavior: "create_prorations",
          products: [
            {
              product: basicPlan.productId,
              prices: [basicPlan.monthlyPriceId, basicPlan.annualPriceId],
            },
            {
              product: proPlan.productId,
              prices: [proPlan.monthlyPriceId, proPlan.annualPriceId],
            },
          ],
        },
      },
    });
    console.log(
      `stripeService: ensureBillingPortalConfiguration: created billing portal configuration`,
    );
  } else {
    if (configurations.data.length > 1) {
      console.log(
        "WARNING: More than 1 billing portal configuration found. Should not be more than 1.",
      );
    }
    await env.KV.put(key, "true");
  }
};
```

**Missing:**

- KV caching of configuration status
- Stripe billing portal configuration creation
- Product and price mapping to billing portal

---

### 4. Better Auth Integration (⚠️ PARTIAL)

**tanstack-sandbox3** (`src/lib/auth-service.ts:151-179`):

```ts
plans: async () => {
  const plans = await stripeService.getPlans();
  return plans.map((plan) => ({
    name: plan.name,
    priceId: plan.monthlyPriceId,
    annualDiscountPriceId: plan.annualPriceId,
    freeTrial: {
      days: plan.freeTrialDays,
      onTrialStart: (subscription) => { /* ... */ },
      onTrialEnd: ({ subscription }) => { /* ... */ },
      onTrialExpired: (subscription) => { /* ... */ },
    },
  }));
},
```

**crrbuis** has identical integration structure. However, since `getPlans()` returns an empty array in tanstack-sandbox3, no plans are provided to Better Auth.

---

### 5. Pricing Route (❌ NOT IMPLEMENTED)

**tanstack-sandbox3**: No pricing route exists. In `_mkt.tsx:52-56`, the pricing link is commented out:

```ts
{
  /* <Link
  to="/pricing"
  className="data-hovered:text-primary text-muted-foreground font-medium"
>
  Pricing
</Link> */
}
```

**crrbuis** (`refs/crrbuis/app/routes/_mkt.pricing.tsx`):

- Full pricing page with loader that fetches plans
- Action handler for subscription upgrade using `auth.api.upgradeSubscription()`
- UI with monthly/annual toggle switch
- Form submission with plan lookup keys

**Missing:**

- `/pricing` route file
- Plan display UI with toggle
- Subscription upgrade action handler
- Integration with Better Auth's `upgradeSubscription` API

---

## Summary of Differences

| Feature                   | crrbuis                            | tanstack-sandbox3                  |
| ------------------------- | ---------------------------------- | ---------------------------------- |
| Plan specification        | ✅ Implemented                     | ✅ Implemented (identical)         |
| KV caching                | ✅ Implemented                     | ❌ Not used                        |
| Stripe API integration    | ✅ Products/prices fetched/created | ❌ Stub returns empty array        |
| Billing portal config     | ✅ Created and cached              | ❌ Stub implementation             |
| Better Auth integration   | ✅ Full with plan data             | ⚠️ Set up but receives empty plans |
| Pricing UI route          | ✅ `/pricing` with loader/action   | ❌ No pricing route                |
| Subscription upgrade flow | ✅ Complete flow                   | ❌ Not implemented                 |

---

## Implementation Plan

### Step 1: Update Stripe Service Function Signature

**File:** `src/lib/stripe-service.ts`

Update the function signature to accept `env` with KV namespace:

```ts
export function createStripeService(stripeSecretKey: string, env: { KV: KVNamespace }) {
```

Update the call in `src/worker.ts`:

```ts
const stripeService = createStripeService(env.STRIPE_SECRET_KEY, {
  KV: env.KV,
});
```

---

### Step 2: Implement `getPlans()` with KV Caching

**File:** `src/lib/stripe-service.ts`

Replace the stub implementation with:

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

  const lookupKeys = planData.flatMap((plan) => [
    plan.monthlyPriceLookupKey,
    plan.annualPriceLookupKey,
  ]);

  const priceList = await stripe.prices.list({
    lookup_keys: lookupKeys,
    expand: ["data.product"],
  });

  if (priceList.data.length === 0) {
    const products = await Promise.all(
      planData.map(async (plan) => {
        const product = await stripe.products.create({
          name: plan.displayName,
          description: `${plan.displayName} plan.`,
        });
        return { plan, product };
      }),
    );

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

  const prices = priceList.data.filter(
    (p): p is PriceWithLookupKey => p.lookup_key !== null,
  );

  const plans: Plan[] = planData.map((plan) => {
    const monthlyPrice = prices.find(
      (p) => p.lookup_key === plan.monthlyPriceLookupKey,
    );
    if (!monthlyPrice)
      throw new Error(`Missing monthly price for ${plan.name}`);
    if (typeof monthlyPrice.product === "string")
      throw new Error("Product should be expanded");

    const annualPrice = prices.find(
      (p) => p.lookup_key === plan.annualPriceLookupKey,
    );
    if (!annualPrice) throw new Error(`Missing annual price for ${plan.name}`);

    return {
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description,
      productId: monthlyPrice.product.id,
      monthlyPriceId: monthlyPrice.id,
      monthlyPriceLookupKey: plan.monthlyPriceLookupKey,
      monthlyPriceInCents: plan.monthlyPriceInCents,
      annualPriceId: annualPrice.id,
      annualPriceLookupKey: plan.annualPriceLookupKey,
      annualPriceInCents: plan.annualPriceInCents,
      freeTrialDays: plan.freeTrialDays,
    };
  });

  await env.KV.put(key, JSON.stringify(plans));
  return plans;
};
```

Add necessary imports:

```ts
import * as z from "zod";
import { planData, Plan as PlanSchema } from "@/lib/domain";

type Price = StripeTypes.Price;
type PriceWithLookupKey = Price & { lookup_key: string };
```

---

### Step 3: Implement `ensureBillingPortalConfiguration()`

**File:** `src/lib/stripe-service.ts`

Replace the stub implementation with:

```ts
const ensureBillingPortalConfiguration = async (): Promise<void> => {
  const key = "stripe:isBillingPortalConfigured";
  const isConfigured = await env.KV.get(key);
  if (isConfigured === "true") return;

  const configurations = await stripe.billingPortal.configurations.list({
    limit: 2,
  });

  if (configurations.data.length === 0) {
    const plans = await getPlans();
    const basicPlan = plans.find((p) => p.name === "basic");
    if (!basicPlan) throw new Error("Missing basic plan");

    const proPlan = plans.find((p) => p.name === "pro");
    if (!proPlan) throw new Error("Missing pro plan");

    await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: "Manage your subscription and billing information",
      },
      features: {
        customer_update: {
          enabled: true,
          allowed_updates: ["name", "phone"],
        },
        invoice_history: {
          enabled: true,
        },
        payment_method_update: {
          enabled: true,
        },
        subscription_cancel: {
          enabled: true,
          mode: "immediately",
          proration_behavior: "create_prorations",
        },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ["price"],
          proration_behavior: "create_prorations",
          products: [
            {
              product: basicPlan.productId,
              prices: [basicPlan.monthlyPriceId, basicPlan.annualPriceId],
            },
            {
              product: proPlan.productId,
              prices: [proPlan.monthlyPriceId, proPlan.annualPriceId],
            },
          ],
        },
      },
    });
    console.log(
      `stripeService: ensureBillingPortalConfiguration: created billing portal configuration`,
    );
  } else {
    if (configurations.data.length > 1) {
      console.log(
        "WARNING: More than 1 billing portal configuration found. Should not be more than 1.",
      );
    }
    await env.KV.put(key, "true");
  }
};
```

---

### Step 4: Update Worker to Pass KV to Stripe Service

**File:** `src/worker.ts`

```ts
const stripeService = createStripeService(env.STRIPE_SECRET_KEY, {
  KV: env.KV,
});
```

---

### Step 5: Create Pricing Route

**File:** `src/routes/_mkt.pricing.tsx` (create new file)

Create a pricing route with loader and action handler:

```ts
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const getPricingPlansServerFn = createServerFn().handler(
  async ({ context: { stripeService } }) => {
    return await stripeService.getPlans();
  },
);

const upgradeSubscriptionServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ intent: z.string().nonempty() }))
  .handler(async ({ data: { intent }, context: { authService, session } }) => {
    if (!session) throw new Error("Unauthorized");
    if (session.user.role !== "user") throw new Error("Forbidden");

    const { stripeService } = context;
    const plans = await stripeService.getPlans();
    const plan = plans.find(
      (p) => p.monthlyPriceLookupKey === intent || p.annualPriceLookupKey === intent,
    );
    if (!plan) throw new Error(`Missing plan for intent ${intent}`);

    const activeOrganizationId = session.session.activeOrganizationId;
    if (!activeOrganizationId) throw new Error("Missing activeOrganizationId");

    const subscriptions = await authService.api.listActiveSubscriptions({
      query: { referenceId: activeOrganizationId },
    });
    const subscriptionId = subscriptions.length > 0 ? subscriptions[0].stripeSubscriptionId : undefined;

    const { url } = await authService.api.upgradeSubscription({
      body: {
        plan: plan.name,
        annual: intent === plan.annualPriceLookupKey,
        referenceId: activeOrganizationId,
        subscriptionId,
        seats: 1,
        successUrl: "/app",
        cancelUrl: "/pricing",
        returnUrl: `/app/${activeOrganizationId}/billing`,
        disableRedirect: false,
      },
    });
    return { url };
  },
);

export const Route = createFileRoute("/_mkt/pricing")({
  component: RouteComponent,
  loader: () => getPricingPlansServerFn(),
});

function RouteComponent() {
  const { data: plans } = Route.useLoaderData();
  const [isAnnual, setIsAnnual] = useState(false);
  const upgradeFn = useServerFn(upgradeSubscriptionServerFn);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center py-12">
      <div className="relative flex w-full flex-col items-center justify-center gap-4 border px-6 py-48">
        <h1 className="text-center text-3xl leading-tight font-semibold text-wrap md:text-5xl">
          Find the perfect plan for you.
        </h1>
        <p className="text-muted-foreground text-center text-xl text-pretty">
          Simple and transparent pricing. No hidden fees, no surprises.
        </p>
      </div>

      <div className="relative flex w-full flex-col items-center">
        <div className="bg-secondary absolute -top-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-6 rounded-full p-2 px-3">
          <span className="text-sm font-medium">Monthly</span>
          <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
          <span className="text-sm font-medium">Annual</span>
        </div>

        <div className="flex w-full flex-col items-center md:flex-row">
          {plans?.map((plan) => {
            const price = isAnnual
              ? plan.annualPriceInCents / 100
              : plan.monthlyPriceInCents / 100;
            const lookupKey = isAnnual
              ? plan.annualPriceLookupKey
              : plan.monthlyPriceLookupKey;

            return (
              <div
                key={plan.name}
                className="group relative flex aspect-square h-full w-full flex-col items-center justify-center gap-4 overflow-hidden border-l p-6 not-sm:border-r"
              >
                <h1 className="text-center text-2xl leading-tight font-semibold text-wrap lg:text-3xl">
                  {plan.displayName}
                </h1>
                <p className="text-center text-2xl leading-tight font-medium text-wrap lg:text-3xl">
                  {plan.description}
                </p>
                <div className="relative flex items-end">
                  <span className="text-4xl font-semibold">${price}</span>
                  <span className="text-muted-foreground text-2xl">
                    {isAnnual ? "/yr" : "/mo"}
                  </span>
                </div>
                <Button
                  onClick={() => upgradeFn({ data: { intent: lookupKey } })}
                  className="w-full rounded-full! text-base! font-semibold"
                >
                  Get {plan.name.charAt(0).toUpperCase() + plan.name.slice(1)}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

---

### Step 6: Enable Pricing Link in Navigation

**File:** `src/routes/_mkt.tsx`

Uncomment the pricing link:

```ts
<Link
  to="/pricing"
  className="data-hovered:text-primary text-muted-foreground font-medium"
>
  Pricing
</Link>
```

---

### Step 7: Update Stripe Webhook Secret

**File:** `src/lib/auth-service.ts`

Update the webhook secret configuration (requires environment variable):

```ts
stripe({
  stripeClient: stripeService.stripe,
  stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
  // ... rest of configuration
}),
```

---

### Step 8: Test the Implementation

1. **Verify Stripe configuration**:
   - Ensure `STRIPE_SECRET_KEY` is set in wrangler.toml
   - Ensure `STRIPE_WEBHOOK_SECRET` is set for production

2. **Test KV caching**:
   - First call should log "cache miss" and fetch from Stripe
   - Subsequent calls should log "cache hit"

3. **Test pricing page**:
   - Navigate to `/pricing`
   - Toggle between monthly/annual
   - Click plan buttons (should redirect to Stripe checkout)

4. **Test subscription flow**:
   - Complete Stripe checkout
   - Verify subscription is created in database
   - Test billing portal access

---

## Notes

- The Plan interface in `src/lib/stripe-service.ts` needs to match the Plan schema from `@/lib/domain.ts`
- KV caching requires KV namespace to be available in `env`
- Stripe lookup keys allow price updates without code changes
- Billing portal configuration should be idempotent
- Better Auth's stripe plugin handles webhook events automatically when webhook secret is configured
