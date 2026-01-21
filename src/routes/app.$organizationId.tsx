import type { AuthService } from "@/lib/auth-service";
import { invariant } from "@epic-web/invariant";
import {
  createFileRoute,
  Link,
  notFound,
  Outlet,
  useMatchRoute,
} from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { signOutServerFn } from "@/lib/auth-service";

const beforeLoadServerFn = createServerFn({ method: "GET" })
  .inputValidator((organizationId: string) => organizationId)
  .handler(async ({ context: { session, authService }, data }) => {
    invariant(session, "Missing session");

    const request = getRequest();

    const organizations = await authService.api.listOrganizations({
      headers: request.headers,
    });

    const organization = organizations.find((org) => org.id === data);

    if (!organization) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw notFound();
    }

    return {
      organization,
      organizations,
      sessionUser: session.user,
    };
  });

export const Route = createFileRoute("/app/$organizationId")({
  beforeLoad: async ({ params }) =>
    await beforeLoadServerFn({ data: params.organizationId }),
  component: RouteComponent,
});

function RouteComponent() {
  const { organization, organizations, sessionUser } = Route.useRouteContext();

  return (
    <SidebarProvider>
      <AppSidebar
        organization={organization}
        organizations={organizations}
        user={sessionUser}
      />
      <main className="flex h-svh w-full flex-col overflow-x-hidden">
        <SidebarTrigger />
        <Outlet />
      </main>
    </SidebarProvider>
  );
}

function AppSidebar({
  organization,
  organizations,
  user,
}: {
  organization: AuthService["$Infer"]["Organization"];
  organizations: AuthService["$Infer"]["Organization"][];
  user: { email: string };
}) {
  const matchRoute = useMatchRoute();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex w-full items-center gap-2 p-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Home"
            render={<Link to="/" />}
          >
            <AppLogo />
          </Button>
          <OrganizationSwitcher
            organizations={organizations}
            organization={organization}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={Boolean(matchRoute({ to: "/app/$organizationId" }))}
                  render={
                    <Link
                      to="/app/$organizationId"
                      params={{ organizationId: organization.id }}
                    >
                      Organization Home
                    </Link>
                  }
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={Boolean(
                    matchRoute({ to: "/app/$organizationId/invitations" }),
                  )}
                  render={
                    <Link
                      to="/app/$organizationId/invitations"
                      params={{ organizationId: organization.id }}
                      data-testid="sidebar-invitations"
                    >
                      Invitations
                    </Link>
                  }
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={Boolean(
                    matchRoute({ to: "/app/$organizationId/members" }),
                  )}
                  render={
                    <Link
                      to="/app/$organizationId/members"
                      params={{ organizationId: organization.id }}
                    >
                      Members
                    </Link>
                  }
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={Boolean(
                    matchRoute({ to: "/app/$organizationId/billing" }),
                  )}
                  render={
                    <Link
                      to="/app/$organizationId/billing"
                      params={{ organizationId: organization.id }}
                      data-testid="sidebar-billing"
                    >
                      Billing
                    </Link>
                  }
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}

function OrganizationSwitcher({
  organizations,
  organization,
}: {
  organizations: AuthService["$Infer"]["Organization"][];
  organization: AuthService["$Infer"]["Organization"];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(props) => (
          <Button
            {...props}
            variant="ghost"
            className="h-auto flex-1 items-center justify-between p-0 text-left font-medium data-hovered:bg-transparent"
          >
            <div className="grid leading-tight">
              <span className="truncate font-medium">{organization.name}</span>
            </div>
            <ChevronsUpDown className="text-muted-foreground ml-2 size-4" />
          </Button>
        )}
      />
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              render={
                <Link
                  to="/app/$organizationId"
                  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-conversion
                  params={{ organizationId: String(org.id) }}
                />
              }
            >
              {org.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavUser({ user }: { user: { email: string } }) {
  const signOutFn = useServerFn(signOutServerFn);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(props) => (
          <SidebarMenuButton
            {...props}
            className="h-12 w-full justify-start overflow-hidden rounded-md p-2 text-left text-sm font-normal"
          >
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.email}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </SidebarMenuButton>
        )}
      />
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate px-1 py-1.5 text-center text-sm font-medium">
            {user.email}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOutFn()}>
          <LogOut className="mr-2 size-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
