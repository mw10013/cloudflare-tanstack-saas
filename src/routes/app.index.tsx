import { invariant } from "@epic-web/invariant";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const beforeLoadServerFn = createServerFn().handler(
  ({ context: { session } }) => {
    invariant(session, "Missing session");

    const activeOrganizationId = session.session.activeOrganizationId;

    invariant(activeOrganizationId, "Missing activeOrganizationId");

    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({
      to: "/app/$organizationId",
      params: { organizationId: activeOrganizationId },
    });
  },
);

export const Route = createFileRoute("/app/")({
  beforeLoad: async () => await beforeLoadServerFn(),
});
