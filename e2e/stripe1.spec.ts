import type { APIRequestContext, Page } from "@playwright/test";
import { invariant } from "@epic-web/invariant";
import { expect, test } from "@playwright/test";
import { planData } from "@/lib/domain";

test.describe("stripe1", () => {
  test("basic-monthly subscribe", async ({ page, request, baseURL }) => {
    invariant(baseURL, "Missing baseURL");

    const plan = planData[0];
    invariant(plan, "Missing planData[0]");

    const email = `stripe1-${plan.monthlyPriceLookupKey.toLowerCase()}@e2e.com`;
    const intent = plan.monthlyPriceLookupKey;

    const pom = new Stripe1Pom({ page, baseURL });

    await pom.deleteUser({ request, email });
    await pom.login({ email });
    await pom.subscribe({ email, intent });
    await pom.verifySubscription({ planName: plan.name, status: "trialing" });
  });
});

class Stripe1Pom {
  readonly page: Page;
  readonly baseURL: string;

  constructor({ page, baseURL }: { page: Page; baseURL: string }) {
    invariant(baseURL.endsWith("/"), "baseURL must have a trailing slash");
    this.page = page;
    this.baseURL = baseURL;
  }

  async deleteUser({
    request,
    email,
  }: {
    request: APIRequestContext;
    email: string;
  }) {
    const response = await request.post(`/api/e2e/delete/user/${email}`);
    expect(response.ok()).toBe(true);
  }

  async login({ email }: { email: string }) {
    await this.page.goto("/login");
    await this.page.getByRole("textbox", { name: "Email" }).fill(email);
    await this.page.getByRole("button", { name: "Send magic link" }).click();
    await this.page.getByRole("link", { name: /magic-link/ }).waitFor();
    await this.page.getByRole("link", { name: /magic-link/ }).click();
    await this.page.waitForURL(/\/app\//);
  }

  async subscribe({ email, intent }: { email: string; intent: string }) {
    await this.navigateToPricing();
    await this.selectPlan({ intent });
    await this.fillPaymentForm({ email });
    await this.submitPayment();
  }

  async navigateToPricing() {
    await this.page.getByRole("link", { name: "Home", exact: true }).click();
    await this.page.getByRole("link", { name: "Pricing" }).click();
  }

  async selectPlan({ intent }: { intent: string }) {
    const plan = planData.find(
      (p) =>
        p.monthlyPriceLookupKey === intent || p.annualPriceLookupKey === intent,
    );
    if (!plan) throw new Error(`Plan not found for intent ${intent}`);

    const isAnnual = intent === plan.annualPriceLookupKey;
    const switchElement = this.page.getByLabel("Annual pricing");
    const isCurrentlyAnnual =
      (await switchElement.getAttribute("aria-checked")) === "true";
    if (isAnnual !== isCurrentlyAnnual) {
      await switchElement.dispatchEvent("click");
    }

    await this.page.getByTestId(plan.name).click();
  }

  async fillPaymentForm({ email }: { email: string }) {
    await this.page
      .getByTestId("card-accordion-item-button")
      .dispatchEvent("click");

    await this.page.getByRole("textbox", { name: "Card number" }).click();
    await this.page
      .getByRole("textbox", { name: "Card number" })
      .fill("4242 4242 4242 4242");
    await this.page.getByRole("textbox", { name: "Expiration" }).click();
    await this.page
      .getByRole("textbox", { name: "Expiration" })
      .fill("12 / 34");
    await this.page.getByRole("textbox", { name: "CVC" }).click();
    await this.page.getByRole("textbox", { name: "CVC" }).fill("123");
    await this.page.getByRole("textbox", { name: "Cardholder name" }).click();
    await this.page
      .getByRole("textbox", { name: "Cardholder name" })
      .fill(email);
    await this.page.getByRole("textbox", { name: "ZIP" }).click();
    await this.page.getByRole("textbox", { name: "ZIP" }).fill("12345");
    await this.page
      .getByRole("checkbox", { name: "Save my information for" })
      .uncheck();
  }

  async submitPayment() {
    await this.page.getByTestId("hosted-payment-submit-button").click();
    await this.page.waitForURL(`${this.baseURL}**`);
  }

  async verifySubscription({
    planName,
    status,
  }: {
    planName: string;
    status: string;
  }) {
    await this.page.getByTestId("sidebar-billing").click();
    await this.page.waitForURL(/billing/);

    await expect(async () => {
      await this.page.reload();
      await expect(this.page.getByTestId("active-plan")).toContainText(
        planName,
        {
          ignoreCase: true,
          timeout: 100,
        },
      );
      await expect(this.page.getByTestId("active-status")).toContainText(
        status,
        {
          ignoreCase: true,
          timeout: 100,
        },
      );
    }).toPass({ timeout: 60_000 });
  }
}
