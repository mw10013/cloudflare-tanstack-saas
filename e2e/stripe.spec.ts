import type { APIRequestContext, Page } from "@playwright/test";
import { invariant } from "@epic-web/invariant";
import { expect, test } from "@playwright/test";
import { planData } from "@/lib/domain";
import { scopeEmail } from "./utils";

const emailPrefix = "stripe-";

test.describe("subscribe", () => {
  planData
    .flatMap((plan) => [
      {
        email: scopeEmail(
          `${emailPrefix}${plan.monthlyPriceLookupKey.toLowerCase()}@e2e.com`,
        ),
        intent: plan.monthlyPriceLookupKey,
        planName: plan.name,
      },
      {
        email: scopeEmail(
          `${emailPrefix}${plan.annualPriceLookupKey.toLowerCase()}@e2e.com`,
        ),
        intent: plan.annualPriceLookupKey,
        planName: plan.name,
      },
    ])
    .forEach(({ email, intent, planName }) => {
      test(`${intent} for ${email}`, async ({ page, request, baseURL }) => {
        invariant(baseURL, "Missing baseURL");
        const pom = createStripePom({ page, baseURL });

        await pom.deleteUser({ request, email });
        await pom.login({ email });
        await pom.subscribe({ email, intent });
        await pom.verifySubscription({ planName, status: "trialing" });
      });
    });
});

test.describe("subscribe/cancel", () => {
  test.describe.configure({ mode: "parallel", timeout: 120_000 });
  planData
    .flatMap((plan) => [
      {
        email: scopeEmail(
          `${emailPrefix}${plan.monthlyPriceLookupKey.toLowerCase()}-cancel@e2e.com`,
        ),
        intent: plan.monthlyPriceLookupKey,
        planName: plan.name,
      },
      {
        email: scopeEmail(
          `${emailPrefix}${plan.annualPriceLookupKey.toLowerCase()}-cancel@e2e.com`,
        ),
        intent: plan.annualPriceLookupKey,
        planName: plan.name,
      },
    ])
    .forEach(({ email, intent, planName }) => {
      test(`${intent} for ${email}`, async ({ page, request, baseURL }) => {
        invariant(baseURL, "Missing baseURL");
        const pom = createStripePom({ page, baseURL });

        await pom.deleteUser({ request, email });
        await pom.login({ email });
        await pom.subscribe({ email, intent });
        await pom.verifySubscription({ planName, status: "trialing" });
        await pom.cancelSubscription();
        await pom.verifyNoSubscription();
      });
    });
});

test.describe("subscribe/upgrade", () => {
  test.describe.configure({ mode: "parallel", timeout: 120_000 });
  [planData, [...planData].reverse()]
    .flatMap(([plan, plan1]) => [
      {
        email: scopeEmail(
          `${emailPrefix}${plan.monthlyPriceLookupKey.toLowerCase()}-${plan.monthlyPriceLookupKey.toLowerCase()}-upgrade@e2e.com`,
        ),
        intent: plan.monthlyPriceLookupKey,
        planName: plan.name,
        intent1: plan.annualPriceLookupKey,
        planName1: plan.name,
      },
      {
        email: scopeEmail(
          `${emailPrefix}${plan.monthlyPriceLookupKey.toLowerCase()}-${plan1.monthlyPriceLookupKey.toLowerCase()}-upgrade@e2e.com`,
        ),
        intent: plan.monthlyPriceLookupKey,
        planName: plan.name,
        intent1: plan1.monthlyPriceLookupKey,
        planName1: plan1.name,
      },
      {
        email: scopeEmail(
          `${emailPrefix}${plan.monthlyPriceLookupKey.toLowerCase()}-${plan1.annualPriceLookupKey.toLowerCase()}-upgrade@e2e.com`,
        ),
        intent: plan.monthlyPriceLookupKey,
        planName: plan.name,
        intent1: plan1.annualPriceLookupKey,
        planName1: plan1.name,
      },
    ])
    .forEach(({ email, intent, planName, intent1, planName1 }) => {
      test(`${intent} to ${intent1} for ${email}`, async ({
        page,
        request,
        baseURL,
      }) => {
        invariant(baseURL, "Missing baseURL");
        const pom = createStripePom({ page, baseURL });

        await pom.deleteUser({ request, email });
        await pom.login({ email });
        await pom.subscribe({ email, intent });
        await pom.verifySubscription({ planName, status: "trialing" });

        await pom.upgrade({ intent: intent1 });
        await pom.verifySubscription({ planName: planName1, status: "active" });
      });
    });
});

// https://playwright.dev/docs/pom

const createStripePom = ({
  page,
  baseURL,
}: {
  readonly page: Page;
  readonly baseURL: string;
}) => {
  invariant(baseURL.endsWith("/"), "baseURL must have a trailing slash");

  const deleteUser = async ({
    request,
    email,
  }: {
    request: APIRequestContext;
    email: string;
  }) => {
    const response = await request.post(`/api/e2e/delete/user/${email}`);
    expect(response.ok()).toBe(true);
  };

  const login = async ({ email }: { email: string }) => {
    await page.goto("/login");
    await page.getByRole("textbox", { name: "Email" }).fill(email);
    await page.getByRole("button", { name: "Send magic link" }).click();
    await page.getByRole("link", { name: /magic-link/ }).waitFor();
    await page.getByRole("link", { name: /magic-link/ }).click();
    await page.waitForURL(/\/app\//);
  };

  const navigateToPricing = async () => {
    await page.getByRole("link", { name: "Home", exact: true }).click();
    await page.getByRole("link", { name: "Pricing" }).click();
  };

  const selectPlan = async ({ intent }: { intent: string }) => {
    const plan = planData.find(
      (p) =>
        p.monthlyPriceLookupKey === intent || p.annualPriceLookupKey === intent,
    );
    if (!plan) throw new Error(`Plan not found for intent ${intent}`);

    const isAnnual = intent === plan.annualPriceLookupKey;
    const switchElement = page.getByLabel("Annual pricing");
    const isCurrentlyAnnual =
      (await switchElement.getAttribute("aria-checked")) === "true";

    if (isAnnual !== isCurrentlyAnnual) {
      await switchElement.click();
      await expect(switchElement).toHaveAttribute(
        "aria-checked",
        isAnnual ? "true" : "false",
      );
    }

    await page.getByTestId(plan.name).click();
    await page.waitForURL(/stripe/);
  };

  const fillPaymentForm = async ({ email }: { email: string }) => {
    await page.getByTestId("card-accordion-item-button").dispatchEvent("click");

    await page.getByRole("textbox", { name: "Card number" }).click();
    await page
      .getByRole("textbox", { name: "Card number" })
      .fill("4242 4242 4242 4242");
    await page.getByRole("textbox", { name: "Expiration" }).click();
    await page.getByRole("textbox", { name: "Expiration" }).fill("12 / 34");
    await page.getByRole("textbox", { name: "CVC" }).click();
    await page.getByRole("textbox", { name: "CVC" }).fill("123");
    await page.getByRole("textbox", { name: "Cardholder name" }).click();
    await page.getByRole("textbox", { name: "Cardholder name" }).fill(email);
    await page.getByRole("textbox", { name: "ZIP" }).click();
    await page.getByRole("textbox", { name: "ZIP" }).fill("12345");
    await page
      .getByRole("checkbox", { name: "Save my information for" })
      .uncheck();
  };

  const submitPayment = async () => {
    await page.getByTestId("hosted-payment-submit-button").click();
    await page.waitForURL(`${baseURL}**`);
  };

  const navigateToBilling = async () => {
    await page.getByTestId("sidebar-billing").click();
    await page.waitForURL(/billing/);
  };

  const verifySubscription = async ({
    planName,
    status,
  }: {
    planName: string;
    status: string;
  }) => {
    await navigateToBilling();
    await expect(async () => {
      await page.reload();
      await expect(page.getByTestId("active-plan")).toContainText(planName, {
        ignoreCase: true,
        timeout: 100,
      });
      await expect(page.getByTestId("active-status")).toContainText(status, {
        ignoreCase: true,
        timeout: 100,
      });
    }).toPass({ timeout: 60_000 });
  };

  const cancelSubscription = async () => {
    await page.getByRole("button", { name: "Cancel Subscription" }).click();
    await page.waitForURL(/stripe/);
    await page.getByTestId("confirm").click();
    await expect(page.getByTestId("page-container-main")).toContainText(
      "Subscription canceled",
    );
    await page.getByTestId("return-to-business-link").click();
    await page.waitForURL(`${baseURL}**`);
  };

  const verifyNoSubscription = async () => {
    await expect(async () => {
      await page.reload();
      await expect(page.getByText("No active subscription for")).toBeVisible({
        timeout: 100,
      });
    }).toPass({ timeout: 60_000 });
  };

  const subscribe = async ({
    email,
    intent,
  }: {
    email: string;
    intent: string;
  }) => {
    await navigateToPricing();
    await selectPlan({ intent });
    await fillPaymentForm({ email });
    await submitPayment();
  };

  const upgrade = async ({ intent }: { intent: string }) => {
    await navigateToPricing();
    await selectPlan({ intent });
    await page.getByTestId("confirm").click();
    await page.waitForURL(`${baseURL}**`);
  };

  return {
    deleteUser,
    login,
    navigateToPricing,
    selectPlan,
    fillPaymentForm,
    submitPayment,
    navigateToBilling,
    verifySubscription,
    cancelSubscription,
    verifyNoSubscription,
    subscribe,
    upgrade,
  };
};
