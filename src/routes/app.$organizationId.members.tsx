import { invariant } from "@epic-web/invariant";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as Domain from "@/lib/domain";

const organizationIdSchema = z.object({ organizationId: z.string() });

export const Route = createFileRoute("/app/$organizationId/members")({
  loader: ({ params: data }) => getLoaderData({ data }),
  component: RouteComponent,
});

const getLoaderData = createServerFn({ method: "GET" })
  .inputValidator(organizationIdSchema)
  .handler(async ({ data: { organizationId }, context: { authService } }) => {
    const request = getRequest();
    const session = await authService.api.getSession({
      headers: request.headers,
    });
    invariant(session, "Missing session");

    const { success: canEdit } = await authService.api.hasPermission({
      headers: request.headers,
      body: {
        organizationId,
        permissions: { member: ["update", "delete"] },
      },
    });

    const { members } = await authService.api.listMembers({
      headers: request.headers,
      query: { organizationId },
    });

    const currentMember = members.find(
      (m) => m.user.email === session.user.email,
    );
    invariant(currentMember, "Missing member");

    const canLeaveMemberId =
      currentMember.role !== "owner" ? currentMember.id : undefined;

    return {
      canEdit,
      canLeaveMemberId,
      userEmail: session.user.email,
      members,
    };
  });

/**
 * Authorization is enforced by better-auth removeMember.
 */
const removeMember = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      organizationId: z.string(),
      memberId: z.string(),
    }),
  )
  .handler(
    async ({
      data: { organizationId, memberId },
      context: { authService },
    }) => {
      const request = getRequest();
      await authService.api.removeMember({
        headers: request.headers,
        body: { memberIdOrEmail: memberId, organizationId },
      });
    },
  );

/**
 * Authorization is enforced by better-auth leaveOrganization.
 */
const leaveOrganization = createServerFn({ method: "POST" })
  .inputValidator(organizationIdSchema)
  .handler(async ({ data: { organizationId }, context: { authService } }) => {
    const request = getRequest();
    await authService.api.leaveOrganization({
      headers: request.headers,
      body: { organizationId },
    });
  });

/**
 * Authorization is enforced by better-auth updateMemberRole.
 */
const updateMemberRole = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      organizationId: z.string(),
      memberId: z.string(),
      role: Domain.MemberRole.exclude(["owner"]),
    }),
  )
  .handler(
    async ({
      data: { organizationId, memberId, role },
      context: { authService },
    }) => {
      const request = getRequest();
      await authService.api.updateMemberRole({
        headers: request.headers,
        body: { role, memberId, organizationId },
      });
    },
  );

function RouteComponent() {
  const { canEdit, canLeaveMemberId, members } = Route.useLoaderData();

  return (
    <div className="flex flex-col gap-8 p-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Members</h1>
        <p className="text-muted-foreground text-sm">
          Manage organization members and control access to your organization.
        </p>
      </header>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Current Members</CardTitle>
          <CardDescription>
            Review and manage members currently part of this organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length > 0 ? (
            <div aria-label="Organization members" data-testid="members-list">
              {members.map((member) => (
                <MemberItem
                  key={member.id}
                  member={member}
                  canEdit={canEdit}
                  canLeaveMemberId={canLeaveMemberId}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No members have been added to this organization yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MemberItem({
  member,
  canEdit,
  canLeaveMemberId,
}: {
  member: (typeof Route)["types"]["loaderData"]["members"][number];
  canEdit: boolean;
  canLeaveMemberId?: string;
}) {
  const router = useRouter();
  const removeMemberServerFn = useServerFn(removeMember);
  const leaveOrganizationServerFn = useServerFn(leaveOrganization);
  const updateMemberRoleServerFn = useServerFn(updateMemberRole);

  const removeMemberMutation = useMutation({
    mutationFn: () =>
      removeMemberServerFn({
        data: {
          organizationId: member.organizationId,
          memberId: member.id,
        },
      }),
    onSuccess: () => {
      void router.invalidate();
    },
  });

  const leaveOrganizationMutation = useMutation({
    mutationFn: () =>
      leaveOrganizationServerFn({
        data: { organizationId: member.organizationId },
      }),
    onSuccess: () => {
      void router.navigate({ to: "/app" });
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: (role: "member" | "admin") =>
      updateMemberRoleServerFn({
        data: {
          organizationId: member.organizationId,
          memberId: member.id,
          role,
        },
      }),
    onSuccess: () => {
      void router.invalidate();
    },
  });

  const isOwner = member.role === "owner";
  const pending =
    removeMemberMutation.isPending ||
    leaveOrganizationMutation.isPending ||
    updateMemberRoleMutation.isPending;

  return (
    <Item size="sm" className="gap-4 px-0">
      <ItemContent>
        <ItemTitle>{member.user.email}</ItemTitle>
        <ItemDescription className="mt-0.5">
          {!isOwner && canEdit ? (
            <Select
              value={member.role}
              onValueChange={(value) => {
                updateMemberRoleMutation.mutate(value as "member" | "admin");
              }}
            >
              <SelectTrigger
                aria-label={`Change role for ${member.user.email}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            member.role
          )}
        </ItemDescription>
      </ItemContent>
      {!isOwner && (
        <ItemActions>
          <div className="flex gap-2">
            {canEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => {
                  removeMemberMutation.mutate();
                }}
              >
                Remove
              </Button>
            )}
            {member.id === canLeaveMemberId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => {
                  leaveOrganizationMutation.mutate();
                }}
              >
                Leave
              </Button>
            )}
          </div>
        </ItemActions>
      )}
    </Item>
  );
}
