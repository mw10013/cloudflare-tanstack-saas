import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/e2e/delete/user/$email")({
  server: {
    handlers: {
      POST: async ({
        params: { email },
        context: { repository, stripeService, env },
      }) => {
        // Always delete Stripe customers by email since D1 database may be out of sync
        const customers = await stripeService.stripe.customers.list({
          email,
          expand: ["data.subscriptions"],
        });
        for (const customer of customers.data) {
          await stripeService.stripe.customers.del(customer.id);
        }

        const user = await repository.getUser({ email });
        if (!user) {
          return Response.json({
            success: true,
            message: `User ${email} already deleted.`,
          });
        }
        if (user.role === "admin") {
          return Response.json(
            {
              success: false,
              message: `Cannot delete admin user ${email}.`,
            },
            { status: 403 },
          );
        }
        const results = await env.D1.batch([
          env.D1.prepare(
            `
 with owned_orgs as (
   select m.organizationId
   from Member m
   where m.userId = ?1
   and m.role = 'owner'
   and not exists (
     select 1
     from Member m1
     where m1.organizationId = m.organizationId
     and m1.userId != ?1
     and m1.role = 'owner'
   )
 ),
 user_stripe as (
   select stripeCustomerId
   from User
   where userId = ?1
 )
 delete from Subscription
 where referenceId in (select organizationId from owned_orgs)
 or stripeCustomerId in (select stripeCustomerId from user_stripe)
 `,
          ).bind(user.userId),
          env.D1.prepare(
            `
 with owned_orgs as (
   select m.organizationId
   from Member m
   where m.userId = ?1
   and m.role = 'owner'
   and not exists (
     select 1
     from Member m1
     where m1.organizationId = m.organizationId
     and m1.userId != ?1
     and m1.role = 'owner'
   )
 )
 delete from Organization
 where organizationId in (select organizationId from owned_orgs)
 `,
          ).bind(user.userId),
          env.D1.prepare(
            `delete from User where userId = ? and role <> 'admin' returning *`,
          ).bind(user.userId),
        ]);

        const deletedCount = results[1].results.length;

        console.log(
          `e2e deleted user ${email} (deletedCount: ${String(deletedCount)})`,
        );
        return Response.json({
          success: true,
          message: `Deleted user ${email} (deletedCount: ${String(deletedCount)}).`,
          customers: customers.data,
        });
      },
    },
  },
});
