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

        const [deleteOrganizationResult, deleteUserResult] = await env.D1.batch(
          [
            env.D1.prepare(
              `
delete from Organization where id in (
  select o.id
  from Organization o
  inner join Member m on m.organizationId = o.id
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
          `,
            ).bind(user.id),
            env.D1.prepare("delete from User where id = ? returning *").bind(
              user.id,
            ),
          ],
        );

        const message = `Deleted user ${email}, deletedOrganizationCount: ${String(deleteOrganizationResult.results.length)} deletedUserCount: ${String(deleteUserResult.results.length)})`;
        console.log(message);
        return Response.json({
          success: true,
          message,
        });
      },
    },
  },
});
