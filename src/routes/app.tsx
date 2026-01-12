import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const beforeLoadServerFn = createServerFn().handler(
  ({ context: { session } }) => {
    if (!session?.user) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/login" });
    }
    if (session.user.role !== "user") {
      // Cannot throw Response directly - TanStack Start serializes errors to transfer
      // from server to client, and Response contains non-serializable properties
      // (ReadableStream, Headers, etc.).
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/" });
    }
    return { sessionUser: session.user };
  },
);

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    return await beforeLoadServerFn();
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
