import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request, context }) => {
        return context.authService.handler(request);
      },
      POST: async ({ request, context }) => {
        return context.authService.handler(request);
      },
    },
  },
});
