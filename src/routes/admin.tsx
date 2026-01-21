import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useMatchRoute,
} from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
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

const beforeLoadServerFn = createServerFn().handler(
  ({ context: { session } }) => {
    if (!session?.user) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/login" });
    }
    if (session.user.role !== "admin") {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/" });
    }
    return { sessionUser: session.user };
  },
);

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    return await beforeLoadServerFn();
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { sessionUser } = Route.useRouteContext();
  return (
    <SidebarProvider>
      <AppSidebar user={sessionUser} />
      <main className="flex h-svh w-full flex-col overflow-x-hidden">
        <SidebarTrigger />
        <Outlet />
      </main>
    </SidebarProvider>
  );
}

function AppSidebar({ user }: { user: { email: string } }) {
  const matchRoute = useMatchRoute();

  return (
    <Sidebar>
      <SidebarHeader className="items-center justify-center">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Home"
          render={<Link to="/" />}
        >
          <AppLogo />
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={Boolean(matchRoute({ to: "/admin" }))}
                  render={<Link to="/admin">Dashboard</Link>}
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={Boolean(matchRoute({ to: "/admin/users" }))}
                  render={
                    <Link to="/admin/users" search={{ page: 1 }}>
                      Users
                    </Link>
                  }
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={Boolean(matchRoute({ to: "/admin/customers" }))}
                  render={
                    <Link to="/admin/customers" search={{ page: 1 }}>
                      Customers
                    </Link>
                  }
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={Boolean(matchRoute({ to: "/admin/subscriptions" }))}
                  render={
                    <Link to="/admin/subscriptions" search={{ page: 1 }}>
                      Subscriptions
                    </Link>
                  }
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={Boolean(matchRoute({ to: "/admin/sessions" }))}
                  render={
                    <Link to="/admin/sessions" search={{ page: 1 }}>
                      Sessions
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
