import type { AuthService } from "@/lib/auth-service";
import type { Repository } from "@/lib/repository";
import type { StripeService } from "@/lib/stripe-service";
import serverEntry from "@tanstack/react-start/server-entry";
import { createAuthService } from "@/lib/auth-service";
import { createD1SessionService } from "@/lib/d1-session-service";
import { createRepository } from "@/lib/repository";
import { createStripeService } from "@/lib/stripe-service";

export interface ServerContext {
  env: Env;
  repository: Repository;
  authService: AuthService;
  stripeService: StripeService;
  session?: AuthService["$Infer"]["Session"];
  organization?: AuthService["$Infer"]["Organization"];
  organizations?: AuthService["$Infer"]["Organization"][];
}

declare module "@tanstack/react-start" {
  interface Register {
    server: { requestContext: ServerContext };
  }
}

export default {
  async fetch(request, env, _ctx) {
    console.log(`fetch: ${request.url}`);
    const url = new URL(request.url);
    const isMagicLinkRequest =
      (url.pathname === "/login" && request.method === "POST") ||
      url.pathname === "/api/auth/magic-link/verify";
    if (isMagicLinkRequest) {
      const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
      const { success } = await env.MAGIC_LINK_RATE_LIMITER.limit({ key: ip });
      if (!success) {
        return new Response("Rate limit exceeded", { status: 429 });
      }
    }
    const d1SessionService = createD1SessionService({
      d1: env.D1,
      request,
      sessionConstraint: url.pathname.startsWith("/api/auth/")
        ? "first-primary"
        : undefined,
    });
    const repository = createRepository({ db: d1SessionService.getSession() });
    const stripeService = createStripeService();
    const authService = createAuthService({
      db: d1SessionService.getSession(),
      stripeService,
      kv: env.KV,
      baseURL: env.BETTER_AUTH_URL,
      secret: env.BETTER_AUTH_SECRET,
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      demoMode: env.DEMO_MODE === "true",
      transactionalEmail: env.TRANSACTIONAL_EMAIL,
      stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
    });
    const session = await authService.api.getSession({
      headers: request.headers,
    });
    const response = await serverEntry.fetch(request, {
      context: {
        env,
        repository,
        authService,
        stripeService,
        session: session ?? undefined,
      },
    });
    d1SessionService.setSessionBookmarkCookie(response);
    return response;
  },

  async scheduled(scheduledEvent, env, _ctx) {
    switch (scheduledEvent.cron) {
      case "0 0 * * *": {
        const repository = createRepository({ db: env.D1 });
        const deletedCount = await repository.deleteExpiredSessions();
        console.log(`Deleted ${String(deletedCount)} expired sessions`);
        break;
      }
      default: {
        console.warn(`Unexpected cron schedule: ${scheduledEvent.cron}`);
        break;
      }
    }
  },
} satisfies ExportedHandler<Env>;
