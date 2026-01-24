import type { StripeService } from "@/lib/stripe-service";
import type { BetterAuthOptions } from "better-auth";
import { stripe } from "@better-auth/stripe";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { admin, magicLink, organization } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { d1Adapter } from "@/lib/d1-adapter";

export type AuthService = ReturnType<typeof createAuthService>;

interface CreateAuthServiceOptions {
  db: D1Database | D1DatabaseSession;
  stripeService: StripeService;
  kv?: KVNamespace;
  baseURL: string;
  secret: string;
  demoMode?: boolean;
  transactionalEmail: string;
  stripeWebhookSecret: string;
  sendMagicLink?: Parameters<typeof magicLink>[0]["sendMagicLink"];
  sendInvitationEmail?: NonNullable<
    Parameters<typeof organization>[0]
  >["sendInvitationEmail"];
  databaseHookUserCreateAfter?: NonNullable<
    NonNullable<
      NonNullable<BetterAuthOptions["databaseHooks"]>["user"]
    >["create"]
  >["after"];
  databaseHookSessionCreateBefore?: NonNullable<
    NonNullable<
      NonNullable<BetterAuthOptions["databaseHooks"]>["session"]
    >["create"]
  >["before"];
}

function createBetterAuthOptions({
  db,
  stripeService,
  kv,
  baseURL,
  secret,
  demoMode,
  transactionalEmail,
  stripeWebhookSecret,
  sendMagicLink,
  sendInvitationEmail,
  databaseHookUserCreateAfter,
  databaseHookSessionCreateBefore,
}: CreateAuthServiceOptions) {
  return {
    baseURL,
    secret,
    telemetry: { enabled: false },
    rateLimit: { enabled: false },
    database: d1Adapter(db),
    user: { modelName: "User" },
    session: { modelName: "Session", storeSessionInDatabase: true },
    account: {
      modelName: "Account",
      accountLinking: { enabled: true },
    },
    verification: { modelName: "Verification" },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
    },
    databaseHooks: {
      user: {
        create: {
          after:
            databaseHookUserCreateAfter ??
            ((user) => {
              console.log("databaseHooks.user.create.after", user);
              return Promise.resolve();
            }),
        },
      },
      session: {
        create: {
          before:
            databaseHookSessionCreateBefore ??
            ((session) => {
              console.log("databaseHooks.session.create.before", session);
              return Promise.resolve();
            }),
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (
          ctx.path === "/subscription/upgrade" ||
          ctx.path === "/subscription/billing-portal" ||
          ctx.path === "/subscription/cancel-subscription"
        ) {
          console.log(`better-auth: hooks: before: ${ctx.path}`);
          await stripeService.ensureBillingPortalConfiguration();
        }
      }),
    },
    plugins: [
      magicLink({
        storeToken: "hashed",
        sendMagicLink:
          sendMagicLink ??
          (async (data) => {
            console.log("sendMagicLink", data);
            if (demoMode && kv) {
              await kv.put(`demo:magicLink`, data.url, {
                expirationTtl: 60,
              });
            }
            console.log(`Email would be sent to: ${data.email}`);
            console.log(`Subject: Your Magic Link`);
            console.log(`From: ${transactionalEmail}`);
            console.log(`Magic link URL: ${data.url}`);
          }),
      }),
      admin(),
      organization({
        organizationLimit: 1,
        requireEmailVerificationOnInvitation: true,
        cancelPendingInvitationsOnReInvite: true,
        schema: {
          organization: { modelName: "Organization" },
          member: { modelName: "Member" },
          invitation: { modelName: "Invitation" },
        },
        sendInvitationEmail:
          sendInvitationEmail ??
          ((data) => {
            const url = `${baseURL}/accept-invitation/${data.id}`;
            console.log(`Invitation email would be sent to: ${data.email}`);
            console.log(`Subject: You're invited!`);
            console.log(`From: ${transactionalEmail}`);
            console.log(`Invitation URL: ${url}`);
            return Promise.resolve();
          }),
      }),
      stripe({
        stripeClient: stripeService.stripe,
        stripeWebhookSecret,
        createCustomerOnSignUp: false,
        subscription: {
          enabled: true,
          requireEmailVerification: true,
          // [BUG]: Stripe plugin does not handle lookupKey and annualDiscountLookupKey in onCheckoutSessionCompleted: https://github.com/better-auth/better-auth/issues/3537
          // Workaround: populate `priceId`.
          plans: async () => {
            // console.log(`stripe plugin: plans`);
            const plans = await stripeService.getPlans();
            return plans.map((plan) => ({
              name: plan.name,
              priceId: plan.monthlyPriceId,
              annualDiscountPriceId: plan.annualPriceId,
              freeTrial: {
                days: plan.freeTrialDays,
                onTrialStart: (subscription) => {
                  console.log(
                    `stripe plugin: onTrialStart: ${plan.name} plan trial started for subscription ${subscription.id}`,
                  );
                  return Promise.resolve();
                },
                onTrialEnd: ({ subscription }) => {
                  console.log(
                    `stripe plugin: onTrialEnd: ${plan.name} plan trial ended for subscription ${subscription.id}`,
                  );
                  return Promise.resolve();
                },
                onTrialExpired: (subscription) => {
                  console.log(
                    `stripe plugin: onTrialExpired: ${plan.name} plan trial expired for subscription ${subscription.id}`,
                  );
                  return Promise.resolve();
                },
              },
            }));
          },
          authorizeReference: async ({ user, referenceId, action }) => {
            const result = Boolean(
              await db
                .prepare(
                  "select 1 from Member where userId = ? and organizationId = ? and role = 'owner'",
                )
                .bind(user.id, referenceId)
                .first(),
            );
            console.log(
              `stripe plugin: authorizeReference: user ${user.id} is attempting to ${action} subscription for referenceId ${referenceId}, authorized: ${String(result)}`,
            );
            return result;
          },
          onSubscriptionComplete: ({ subscription, plan }) => {
            console.log(
              `stripe plugin: onSubscriptionComplete: subscription ${subscription.id} completed for plan ${plan.name}`,
            );
            return Promise.resolve();
          },
          onSubscriptionUpdate: ({ subscription }) => {
            console.log(
              `stripe plugin: onSubscriptionUpdate: subscription ${subscription.id} updated`,
            );
            return Promise.resolve();
          },
          onSubscriptionCancel: ({ subscription }) => {
            console.log(
              `stripe plugin: onSubscriptionCancel: subscription ${subscription.id} canceled`,
            );
            return Promise.resolve();
          },
          onSubscriptionDeleted: ({ subscription }) => {
            console.log(
              `stripe plugin: onSubscriptionDeleted: subscription ${subscription.id} deleted`,
            );
            return Promise.resolve();
          },
        },
        organization: {
          enabled: true,
          getCustomerCreateParams: (_organization, ctx) => {
            const userEmail = ctx.context.session?.user.email;
            return Promise.resolve(userEmail ? { email: userEmail } : {});
          },
        },
        schema: {
          subscription: {
            modelName: "Subscription",
          },
        },
        onCustomerCreate: ({ stripeCustomer, user }) => {
          console.log(
            `stripe plugin: onCustomerCreate: customer ${stripeCustomer.id} created for user ${user.email}`,
          );
          return Promise.resolve();
        },
        onEvent: (event) => {
          console.log(
            `stripe plugin: onEvent: stripe event received: ${event.type}`,
          );
          return Promise.resolve();
        },
      }),
      // Must be last so it sees final response headers.
      tanstackStartCookies(),
    ],
  } satisfies BetterAuthOptions;
}

export function createAuthService(
  options: CreateAuthServiceOptions,
): ReturnType<typeof betterAuth<ReturnType<typeof createBetterAuthOptions>>> {
  const auth = betterAuth(
    createBetterAuthOptions({
      databaseHookUserCreateAfter: async (user) => {
        if (user.role === "user") {
          await auth.api.createOrganization({
            body: {
              name: `${user.email.charAt(0).toUpperCase() + user.email.slice(1)}'s Organization`,
              slug: user.email.replace(/[^a-z0-9]/g, "-").toLowerCase(),
              userId: user.id,
            },
          });
        }
      },
      databaseHookSessionCreateBefore: async (session) => {
        const activeOrganizationId =
          (await options.db
            .prepare(
              "select id from Organization where id in (select organizationId from Member where userId = ? and role = 'owner')",
            )
            .bind(session.userId)
            .first<number>("id")) ?? undefined;
        return {
          data: {
            ...session,
            activeOrganizationId,
          },
        };
      },
      ...options,
    }),
  );
  return auth;
}

export const signOutServerFn = createServerFn({ method: "POST" }).handler(
  async ({ context: { authService } }) => {
    const request = getRequest();
    await authService.api.signOut({
      headers: request.headers,
    });
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({
      to: "/",
    });
  },
);
