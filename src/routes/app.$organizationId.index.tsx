import { invariant } from "@epic-web/invariant";
import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  useHydrated,
  useRouter,
} from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";

const organizationIdSchema = z.object({ organizationId: z.string() });

const invitationIdSchema = z.object({ invitationId: z.string() });

export const Route = createFileRoute("/app/$organizationId/")({
  loader: ({ params: data }) => getLoaderData({ data }),
  component: RouteComponent,
});

const getLoaderData = createServerFn({ method: "GET" })
  .inputValidator(organizationIdSchema)
  .handler(
    async ({
      data: { organizationId },
      context: { authService, repository },
    }) => {
      const request = getRequest();
      const session = await authService.api.getSession({
        headers: request.headers,
      });
      invariant(session, "Missing session");
      return repository.getAppDashboardData({
        userEmail: session.user.email,
        organizationId,
      });
    },
  );

const acceptInvitation = createServerFn({ method: "POST" })
  .inputValidator(invitationIdSchema)
  .handler(async ({ data: { invitationId }, context: { authService } }) => {
    const request = getRequest();
    await authService.api.acceptInvitation({
      headers: request.headers,
      body: { invitationId },
    });
  });

const rejectInvitation = createServerFn({ method: "POST" })
  .inputValidator(invitationIdSchema)
  .handler(async ({ data: { invitationId }, context: { authService } }) => {
    const request = getRequest();
    await authService.api.rejectInvitation({
      headers: request.headers,
      body: { invitationId },
    });
  });

function RouteComponent() {
  const { userInvitations, memberCount, pendingInvitationCount } =
    Route.useLoaderData();

  return (
    <div className="flex flex-col gap-6 p-6">
      {userInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invitations</CardTitle>
            <CardDescription>
              Invitations awaiting your response.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              {userInvitations.map((invitation) => (
                <InvitationItem key={invitation.id} invitation={invitation} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              Total members in this organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="member-count">
              {memberCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>Invitations awaiting response</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInvitationCount}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InvitationItem({
  invitation,
}: {
  invitation: (typeof Route)["types"]["loaderData"]["userInvitations"][number];
}) {
  const router = useRouter();
  const isHydrated = useHydrated();
  const acceptInvitationServerFn = useServerFn(acceptInvitation);
  const rejectInvitationServerFn = useServerFn(rejectInvitation);

  const acceptInvitationMutation = useMutation({
    mutationFn: () =>
      acceptInvitationServerFn({
        data: { invitationId: invitation.id },
      }),
    onSuccess: () => {
      void router.invalidate();
    },
  });

  const rejectInvitationMutation = useMutation({
    mutationFn: () =>
      rejectInvitationServerFn({
        data: { invitationId: invitation.id },
      }),
    onSuccess: () => {
      void router.invalidate();
    },
  });

  const disabled =
    !isHydrated ||
    acceptInvitationMutation.isPending ||
    rejectInvitationMutation.isPending;

  return (
    <Item size="sm" className="gap-4 px-0">
      <ItemContent>
        <ItemTitle>{invitation.inviter.email}</ItemTitle>
        <ItemDescription>
          Role: {invitation.role}
          <br />
          Organization: {invitation.organization.name}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button
          type="button"
          name="intent"
          value="accept"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label={`Accept invitation from ${invitation.inviter.email}`}
          onClick={() => {
            acceptInvitationMutation.mutate();
          }}
        >
          Accept
        </Button>
        <Button
          type="button"
          name="intent"
          value="reject"
          variant="destructive"
          size="sm"
          disabled={disabled}
          aria-label={`Reject invitation from ${invitation.inviter.email}`}
          onClick={() => {
            rejectInvitationMutation.mutate();
          }}
        >
          Reject
        </Button>
      </ItemActions>
    </Item>
  );
}
