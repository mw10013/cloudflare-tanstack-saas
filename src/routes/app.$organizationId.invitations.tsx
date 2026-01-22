import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  useHydrated,
  useRouter,
} from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { AlertCircle } from "lucide-react";
import * as z from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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

export const Route = createFileRoute("/app/$organizationId/invitations")({
  loader: ({ params: data }) => getLoaderData({ data }),
  component: RouteComponent,
});

const getLoaderData = createServerFn({ method: "GET" })
  .inputValidator((data: { organizationId: string }) => data)
  .handler(async ({ data, context: { authService } }) => {
    const request = getRequest();
    const { success: canManageInvitations } =
      await authService.api.hasPermission({
        headers: request.headers,
        body: {
          organizationId: data.organizationId,
          permissions: { invitation: ["create", "cancel"] },
        },
      });
    const invitations = await authService.api.listInvitations({
      headers: request.headers,
      query: { organizationId: data.organizationId },
    });
    return { canManageInvitations, invitations };
  });

function RouteComponent() {
  const { canManageInvitations, invitations } = Route.useLoaderData();
  const { organizationId } = Route.useParams();

  return (
    <div className="flex flex-col gap-8 p-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Invitations</h1>
        <p className="text-muted-foreground text-sm">
          Invite new members and manage your invitations.
        </p>
      </header>

      {canManageInvitations && <InviteForm organizationId={organizationId} />}

      <Card>
        <CardHeader>
          <CardTitle>Invitations</CardTitle>
          <CardDescription>
            Review and manage invitations sent for this organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length > 0 ? (
            <div
              aria-label="Organization invitations"
              data-testid="invitations-list"
            >
              {invitations.map((invitation) => (
                <InvitationItem
                  key={invitation.id}
                  invitation={invitation}
                  canManageInvitations={canManageInvitations}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No invitations have been sent for this organization yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const inviteSchema = z.object({
  organizationId: z.string(),
  emails: z
    .string()
    .transform((v) =>
      v
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean),
    )
    .refine(
      (emails) => emails.every((email) => z.email().safeParse(email).success),
      "Please provide valid email addresses.",
    )
    .refine((emails) => emails.length >= 1, "At least one email is required")
    .refine((emails) => emails.length <= 10, "Maximum 10 emails allowed"),
  role: Domain.MemberRole.extract(
    ["member", "admin"],
    "Role must be Member or Admin.",
  ),
});

/**
 * Authorization is enforced by better-auth createInvitation.
 */
const invite = createServerFn({ method: "POST" })
  .inputValidator(inviteSchema)
  .handler(
    async ({
      data: { organizationId, emails, role },
      context: { authService, repository },
    }) => {
      const request = getRequest();
      for (const email of emails) {
        const result = await authService.api.createInvitation({
          headers: request.headers,
          body: {
            email,
            role,
            organizationId: organizationId,
            resend: true,
          },
        });
        // Workaround for better-auth createInvitation role bug.
        // Occurs when a pending invitation exists and a new invitation is created with a different role.
        if (result.role !== role) {
          console.log(
            `Applying workaround for better-auth createInvitation role bug: expected role ${role}, got ${result.role} for invitation ${result.id}`,
          );
          await repository.updateInvitationRole({
            invitationId: result.id,
            role,
          });
        }
      }
    },
  );

function InviteForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const isHydrated = useHydrated();
  const inviteServerFn = useServerFn(invite);
  const inviteMutation = useMutation({
    mutationFn: (data: z.input<typeof inviteSchema>) =>
      inviteServerFn({ data }),
    onSuccess: () => {
      form.reset();
      void router.invalidate();
    },
  });

  const form = useForm({
    defaultValues: {
      organizationId,
      emails: "",
      role: "member" as Extract<Domain.MemberRole, "member" | "admin">,
    },
    validators: {
      onSubmit: inviteSchema,
    },
    onSubmit: ({ value }) => {
      inviteMutation.mutate(value);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite New Members</CardTitle>
        <CardDescription>
          Enter email addresses separated by commas to send invitations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <FieldGroup>
            {inviteMutation.error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {inviteMutation.error.message}
                </AlertDescription>
              </Alert>
            )}
            <form.Field
              name="emails"
              children={(field) => {
                const isInvalid = field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Email Addresses
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                      }}
                      placeholder="user1@example.com, user2@example.com"
                      aria-invalid={isInvalid}
                      disabled={!isHydrated}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />
            <form.Field
              name="role"
              children={(field) => {
                const isInvalid = field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={isInvalid} className="w-fit">
                    <FieldLabel htmlFor={field.name}>Role</FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => {
                        if (value) field.handleChange(value);
                      }}
                      disabled={!isHydrated}
                    >
                      <SelectTrigger className="capitalize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />
            <form.Subscribe
              selector={(state) => state.canSubmit}
              children={(canSubmit) => (
                <Button
                  type="submit"
                  disabled={
                    !canSubmit || !isHydrated || inviteMutation.isPending
                  }
                  className="self-end"
                >
                  Invite
                </Button>
              )}
            />
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Authorization is enforced by better-auth cancelInvitation.
 */
const cancelInvitation = createServerFn({ method: "POST" })
  .inputValidator(z.object({ invitationId: z.string() }))
  .handler(async ({ data: { invitationId }, context: { authService } }) => {
    const request = getRequest();
    await authService.api.cancelInvitation({
      headers: request.headers,
      body: { invitationId },
    });
  });

function InvitationItem({
  invitation,
  canManageInvitations,
}: {
  invitation: (typeof Route)["types"]["loaderData"]["invitations"][number];
  canManageInvitations: boolean;
}) {
  const router = useRouter();
  const isHydrated = useHydrated();
  const cancelInvitationServerFn = useServerFn(cancelInvitation);
  const cancelInvitationMutation = useMutation({
    mutationFn: () =>
      cancelInvitationServerFn({
        data: { invitationId: invitation.id },
      }),
    onSuccess: () => {
      void router.invalidate();
    },
  });

  return (
    <Item size="sm" className="gap-4 px-0">
      <ItemContent>
        <ItemTitle>{invitation.email}</ItemTitle>
        <ItemDescription>
          {invitation.role} — {invitation.status}
          {invitation.status === "pending" && (
            <>
              <br />
              <span className="text-xs">
                Expires:{" "}
                {new Date(invitation.expiresAt)
                  .toISOString()
                  .replace("T", " ")
                  .slice(0, 16)}{" "}
                UTC
              </span>
            </>
          )}
        </ItemDescription>
      </ItemContent>
      {canManageInvitations && invitation.status === "pending" && (
        <ItemActions>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Cancel invitation for ${invitation.email}`}
            disabled={!isHydrated || cancelInvitationMutation.isPending}
            onClick={() => {
              cancelInvitationMutation.mutate();
            }}
          >
            Cancel
          </Button>
        </ItemActions>
      )}
    </Item>
  );
}
