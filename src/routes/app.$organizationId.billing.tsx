import { invariant } from "@epic-web/invariant";
import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
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

const organizationIdSchema = z.object({ organizationId: z.string() });

const subscriptionActionSchema = z.object({
  organizationId: z.string(),
  subscriptionId: z.string(),
});

export const Route = createFileRoute("/app/$organizationId/billing")({
  loader: ({ params }) => getLoaderData({ data: params }),
  component: RouteComponent,
});

const getLoaderData = createServerFn({ method: "GET" })
  .inputValidator(organizationIdSchema)
  .handler(async ({ data: { organizationId }, context: { authService } }) => {
    const request = getRequest();
    const subscriptions = await authService.api.listActiveSubscriptions({
      headers: request.headers,
      query: { referenceId: organizationId, customerType: "organization" },
    });

    const activeSubscription = subscriptions.find(
      (v) => v.status === "active" || v.status === "trialing",
    );

    return {
      // `limits` is typed as `Record<string, unknown>` in better-auth's stripe plugin.
      // TanStack Start server function results must be serializable (no `unknown`), so we omit it.
      activeSubscription: activeSubscription
        ? (({ limits: _limits, ...rest }) => rest)(activeSubscription)
        : undefined,
    };
  });

function RouteComponent() {
  const { activeSubscription } = Route.useLoaderData();
  const { organizationId } = Route.useParams();

  return (
    <div className="flex flex-col gap-8 p-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground text-sm">
          Manage your organization's subscription and billing information.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
          <CardDescription>
            Manage your billing information and subscription settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeSubscription ? (
            <SubscriptionCard
              subscription={activeSubscription}
              organizationId={organizationId}
            />
          ) : (
            <NoSubscriptionCard />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SubscriptionCard({
  subscription,
  organizationId,
}: {
  subscription: NonNullable<
    (typeof Route)["types"]["loaderData"]["activeSubscription"]
  >;
  organizationId: string;
}) {
  const router = useRouter();
  const isHydrated = useHydrated();
  const manageBillingServerFn = useServerFn(manageBilling);
  const cancelSubscriptionServerFn = useServerFn(cancelSubscription);
  const restoreSubscriptionServerFn = useServerFn(restoreSubscription);

  const manageBillingMutation = useMutation({
    mutationFn: () =>
      manageBillingServerFn({
        data: { organizationId },
      }),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: () => {
      invariant(
        subscription.stripeSubscriptionId,
        "Missing stripeSubscriptionId",
      );
      return cancelSubscriptionServerFn({
        data: {
          organizationId,
          subscriptionId: subscription.stripeSubscriptionId,
        },
      });
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const restoreSubscriptionMutation = useMutation({
    mutationFn: () => {
      invariant(
        subscription.stripeSubscriptionId,
        "Missing stripeSubscriptionId",
      );
      return restoreSubscriptionServerFn({
        data: {
          organizationId,
          subscriptionId: subscription.stripeSubscriptionId,
        },
      });
    },
    onSuccess: () => {
      void router.invalidate();
    },
  });

  const pending =
    manageBillingMutation.isPending ||
    cancelSubscriptionMutation.isPending ||
    restoreSubscriptionMutation.isPending;

  const error =
    manageBillingMutation.error ??
    cancelSubscriptionMutation.error ??
    restoreSubscriptionMutation.error;

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium capitalize" data-testid="active-plan">
            {subscription.plan} Plan
          </p>
          <p
            className="text-muted-foreground text-sm"
            data-testid="active-status"
          >
            Status:{" "}
            {subscription.status === "active" && subscription.cancelAtPeriodEnd
              ? `Active ${
                  subscription.periodEnd
                    ? `(Cancels ${
                        new Date(subscription.periodEnd)
                          .toISOString()
                          .split("T")[0]
                      })`
                    : ""
                }`
              : subscription.status}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!isHydrated || pending}
            onClick={() => {
              manageBillingMutation.mutate();
            }}
          >
            Manage Billing
          </Button>
          {subscription.cancelAtPeriodEnd ? (
            <Button
              type="button"
              variant="default"
              disabled={!isHydrated || pending}
              onClick={() => {
                restoreSubscriptionMutation.mutate();
              }}
            >
              Restore Subscription
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              disabled={!isHydrated || pending}
              onClick={() => {
                cancelSubscriptionMutation.mutate();
              }}
            >
              Cancel Subscription
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function NoSubscriptionCard() {
  return (
    <div className="flex items-center justify-between">
      <p className="text-muted-foreground text-sm">
        No active subscription for this organization.
      </p>
      <Button variant="outline" render={<Link to="/pricing" />}>
        Pricing
      </Button>
    </div>
  );
}

/**
 * Authorization is enforced by better-auth createBillingPortal.
 */
const manageBilling = createServerFn({ method: "POST" })
  .inputValidator(organizationIdSchema)
  .handler(async ({ data: { organizationId }, context: { authService } }) => {
    const request = getRequest();
    const result = await authService.api.createBillingPortal({
      headers: request.headers,
      body: {
        referenceId: organizationId,
        customerType: "organization",
        returnUrl: `${new URL(request.url).origin}/app/${organizationId}/billing`,
      },
    });
    return result;
  });

/**
 * Authorization is enforced by better-auth cancelSubscription.
 */
const cancelSubscription = createServerFn({ method: "POST" })
  .inputValidator(subscriptionActionSchema)
  .handler(
    async ({
      data: { organizationId, subscriptionId },
      context: { authService },
    }) => {
      const request = getRequest();
      const result = await authService.api.cancelSubscription({
        headers: request.headers,
        body: {
          referenceId: organizationId,
          customerType: "organization",
          subscriptionId,
          returnUrl: `${new URL(request.url).origin}/app/${organizationId}/billing`,
        },
      });

      return result;
    },
  );

/**
 * Authorization is enforced by better-auth restoreSubscription.
 */
const restoreSubscription = createServerFn({ method: "POST" })
  .inputValidator(subscriptionActionSchema)
  .handler(
    async ({
      data: { organizationId, subscriptionId },
      context: { authService },
    }) => {
      const request = getRequest();
      await authService.api.restoreSubscription({
        headers: request.headers,
        body: {
          referenceId: organizationId,
          customerType: "organization",
          subscriptionId,
        },
      });
    },
  );
