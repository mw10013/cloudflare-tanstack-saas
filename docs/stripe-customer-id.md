# Stripe customer IDs (Better Auth)

This project uses Better Auth with the `@better-auth/stripe` plugin and the `organization` plugin.

Better Auth’s Stripe plugin supports two distinct Stripe-customer “ownership models”:

- **User customer**: a Stripe customer record is tied to a Better Auth `user`.
- **Organization customer**: a Stripe customer record is tied to a Better Auth `organization`.

We are currently running in an organization-centric subscription model (our `Subscription.referenceId` points at `Organization.organizationId`), but we are not yet enabling Better Auth’s built-in organization-customer mode.

## Current state (in this repo)

### What we have in the database

We currently store:

- `User.stripeCustomerId` (nullable)
- `Organization.stripeCustomerId` (nullable) — added for Better Auth upgrade compatibility, but unused
- `Subscription.stripeCustomerId` (nullable)

Notes:

- `Subscription.referenceId` is a foreign key to `Organization.organizationId` (so subscriptions are per-organization).
- `Session.activeOrganizationId` exists in the DB and is populated at session creation.

### How Better Auth is configured

In `src/lib/auth-service.ts`, we enable:

- `organization(...)`
- `stripe({ subscription: { enabled: true }, ... })`

But we do **not** pass `stripe({ organization: { enabled: true } })`.

That matters because the Stripe plugin gates a number of organization-customer behaviors behind `options.organization?.enabled`.

Better Auth reference:

- `refs/better-auth/packages/stripe/src/routes.ts:80-92`

  ```ts
  if (type === "organization") {
    if (!options.organization?.enabled) {
      throw new APIError("BAD_REQUEST", {
        message: STRIPE_ERROR_CODES.ORGANIZATION_SUBSCRIPTION_NOT_ENABLED,
      });
    }

    if (!session.activeOrganizationId) {
      throw new APIError("BAD_REQUEST", {
        message: STRIPE_ERROR_CODES.ORGANIZATION_NOT_FOUND,
      });
    }
    return session.activeOrganizationId;
  }
  ```

And the Stripe plugin declares the explicit `organization` options:

- `refs/better-auth/packages/stripe/src/types.ts:93-104`

  ```ts
  /**
   * Organization Stripe integration
   *
   * Enable organizations to have their own Stripe customer ID
   */
  organization?: {
    enabled: true;
    getCustomerCreateParams?: (organization: Organization, ctx: GenericEndpointContext) => Promise<Partial<Stripe.CustomerCreateParams>>;
    onCustomerCreate?: (data: { stripeCustomer: Stripe.Customer; organization: Organization & WithStripeCustomerId }, ctx: GenericEndpointContext) => Promise<void>;
  };
  ```

### What the Stripe plugin will do today

Because we do not enable the Stripe plugin’s `organization` mode:

- If a request uses `customerType="organization"`, Better Auth will error (see excerpt above).
- The plugin will choose a Stripe customer id using the **user path**, and will write that customer id back to `user.stripeCustomerId`.

Reference (user customer creation + persistence):

- `refs/better-auth/packages/stripe/src/routes.ts:394-431`

  ```ts
  customerId = subscriptionToUpdate?.stripeCustomerId || user.stripeCustomerId;
  if (!customerId) {
    const existingCustomers = await client.customers.search({
      query: `email:"${escapeStripeSearchValue(user.email)}" AND -metadata["customerType"]:"organization"`,
      limit: 1,
    });

    let stripeCustomer = existingCustomers.data[0];

    if (!stripeCustomer) {
      stripeCustomer = await client.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          ...ctx.body.metadata,
          userId: user.id,
          customerType: "user",
        },
      });
    }

    await ctx.context.adapter.update({
      model: "user",
      update: { stripeCustomerId: stripeCustomer.id },
      where: [{ field: "id", value: user.id }],
    });

    customerId = stripeCustomer.id;
  }
  ```

This matches the “we only used `User.stripeCustomerId` because that’s all we had” historical behavior.

## Why add `Organization.stripeCustomerId` if we’re not using it?

Two reasons:

1. **Forward compatibility with Better Auth Stripe org-mode**

   The Stripe plugin’s organization-customer code path reads and writes this field:
   - `refs/better-auth/packages/stripe/src/routes.ts:301-382`

     ```ts
     const org = await ctx.context.adapter.findOne<
       Organization & WithStripeCustomerId
     >({
       model: "organization",
       where: [{ field: "id", value: referenceId }],
     });

     customerId = org.stripeCustomerId;

     // If org doesn't have a customer ID, create one
     if (!customerId) {
       const existingOrgCustomers = await client.customers.search({
         query: `metadata["organizationId"]:"${org.id}"`,
         limit: 1,
       });

       let stripeCustomer = existingOrgCustomers.data[0];

       if (!stripeCustomer) {
         const customerParams = defu(
           {
             name: org.name,
             metadata: {
               ...ctx.body.metadata,
               organizationId: org.id,
               customerType: "organization",
             },
           },
           extraCreateParams,
         );
         stripeCustomer = await client.customers.create(customerParams);
       }

       await ctx.context.adapter.update({
         model: "organization",
         update: { stripeCustomerId: stripeCustomer.id },
         where: [{ field: "id", value: org.id }],
       });

       customerId = stripeCustomer.id;
     }
     ```

   Without a DB column to store the organization customer id, enabling org-mode later would fail at runtime when that update runs.

2. **Better Auth webhook reference resolution can prefer organizations**

   Stripe webhooks (e.g. `customer.subscription.created`) attempt to map a Stripe customer back to either an organization or user.
   That lookup checks organizations first when `options.organization?.enabled` is set:
   - `refs/better-auth/packages/stripe/src/hooks.ts:17-35`

     ```ts
     if (options.organization?.enabled) {
       const org = await ctx.context.adapter.findOne<Organization>({
         model: "organization",
         where: [{ field: "stripeCustomerId", value: stripeCustomerId }],
       });
       if (org) return { customerType: "organization", referenceId: org.id };
     }

     const user = await ctx.context.adapter.findOne<User>({
       model: "user",
       where: [{ field: "stripeCustomerId", value: stripeCustomerId }],
     });
     if (user) return { customerType: "user", referenceId: user.id };
     ```

   So if we enable org-mode in the future, our DB must be able to store `Organization.stripeCustomerId` for webhook mapping to work.

## How `Organization.stripeCustomerId` differs from `User.stripeCustomerId`

They represent different “owners” of a Stripe customer:

- `User.stripeCustomerId` is for **personal** billing.
- `Organization.stripeCustomerId` is for **workspace/tenant** billing.

Better Auth Stripe plugin treats these as distinct via metadata:

- user customers created with: `customerType: "user"` and `userId`
  - `refs/better-auth/packages/stripe/src/routes.ts:411-415`

    ```ts
    metadata: {
      ...ctx.body.metadata,
      userId: user.id,
      customerType: "user",
    }
    ```

- organization customers created with: `customerType: "organization"` and `organizationId`
  - `refs/better-auth/packages/stripe/src/routes.ts:48-52`

    ```ts
    metadata: {
      ...ctx.body.metadata,
      organizationId: org.id,
      customerType: "organization",
    }
    ```

## Practical guidance

### For now (keep things working)

- Keep `Organization.stripeCustomerId` in the schema (already added).
- Do **not** enable `stripe({ organization: { enabled: true } })` yet.
- Continue to rely on:
  - `Subscription.stripeCustomerId` as the immediate per-subscription Stripe customer handle.
  - `User.stripeCustomerId` as Better Auth’s default customer store.

This aligns with our current Better Auth config.

### Future state (recommended once stable)

If the product billing model is truly per-organization (it likely is, since `Subscription.referenceId` points at organizations), the cleaner model is:

- Enable `stripe({ organization: { enabled: true } })`.
- Treat `Organization.stripeCustomerId` as the canonical Stripe customer id.
- Keep `User.stripeCustomerId` only for optional personal billing use-cases.

When enabling org-mode, pay attention to:

- Requests must specify `customerType: "organization"` (or use routes that do) so that Better Auth uses `session.activeOrganizationId` as the reference.
- We already populate `Session.activeOrganizationId`, which is required:
  - `refs/better-auth/packages/stripe/src/routes.ts:87-92`

    ```ts
    if (!session.activeOrganizationId) {
      throw new APIError("BAD_REQUEST", {
        message: STRIPE_ERROR_CODES.ORGANIZATION_NOT_FOUND,
      });
    }
    ```

- Authorization is required for org subscriptions: the middleware forces `subscription.authorizeReference` when `customerType === "organization"`.
  - `refs/better-auth/packages/stripe/src/middleware.ts:39-48`

    ```ts
    if (customerType === "organization") {
      if (!subscriptionOptions.authorizeReference) {
        throw new APIError("BAD_REQUEST", {
          message: STRIPE_ERROR_CODES.ORGANIZATION_SUBSCRIPTION_NOT_ENABLED,
        });
      }
      ...
    }
    ```

We already implement `authorizeReference` in our Stripe plugin config (`src/lib/auth-service.ts`), so we should be able to satisfy this requirement when we choose to switch.
