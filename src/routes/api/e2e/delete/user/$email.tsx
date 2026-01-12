import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/e2e/delete/user/$email")({
  server: {
    handlers: {
      POST: async ({ params, context }) => {
        const { repository, stripeService, env } = context;

        const email = params.email;

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
          return new Response(
            JSON.stringify({
              success: true,
              message: `User ${email} already deleted.`,
            }),
            { headers: { "Content-Type": "application/json" } },
          );
        }
        if (user.role === "admin") {
          return new Response(
            JSON.stringify({
              success: false,
              message: `Cannot delete admin user ${email}.`,
            }),
            { status: 403, headers: { "Content-Type": "application/json" } },
          );
        }
        const results = await env.D1.batch([
          env.D1.prepare(
            `
with t as (
  select m.organizationId
  from Member m
  where m.userId = ?1 and m.role = 'owner'
  and not exists (
    select 1 from Member m1
    where m1.organizationId = m.organizationId
    and m1.userId != ?1 and m1.role = 'owner'
  )
)
delete from Organization where organizationId in (select organizationId from t)
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
        return new Response(
          JSON.stringify({
            success: true,
            message: `Deleted user ${email} (deletedCount: ${String(deletedCount)}).`,
            customers: customers.data,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
