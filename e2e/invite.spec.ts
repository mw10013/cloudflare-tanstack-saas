import type { Page } from "@playwright/test";
import { invariant } from "@epic-web/invariant";
import { expect, test } from "@playwright/test";
import { uniquifyEmail } from "./utils";

test.describe("invite", () => {
  test.describe.configure({ mode: "serial" });

  const users: {
    email: string;
    invitees: { email: string; action?: "accept" | "reject" }[];
  }[] = [
    {
      email: uniquifyEmail("invite@e2e.com"),
      invitees: [
        { email: uniquifyEmail("invite1@e2e.com"), action: "accept" },
        { email: uniquifyEmail("invite2@e2e.com"), action: "accept" },
        { email: uniquifyEmail("invite3@e2e.com"), action: "accept" },
      ],
    },
    {
      email: uniquifyEmail("invite1@e2e.com"),
      invitees: [
        { email: uniquifyEmail("invite@e2e.com") },
        { email: uniquifyEmail("invite2@e2e.com") },
        { email: uniquifyEmail("invite3@e2e.com") },
      ],
    },
    {
      email: uniquifyEmail("invite2@e2e.com"),
      invitees: [
        { email: uniquifyEmail("invite@e2e.com"), action: "reject" },
        { email: uniquifyEmail("invite1@e2e.com"), action: "reject" },
        { email: uniquifyEmail("invite3@e2e.com"), action: "reject" },
      ],
    },
    {
      email: uniquifyEmail("invite3@e2e.com"),
      invitees: [
        { email: uniquifyEmail("invite@e2e.com"), action: "accept" },
        { email: uniquifyEmail("invite1@e2e.com"), action: "reject" },
        { email: uniquifyEmail("invite2@e2e.com") },
      ],
    },
  ];

  test.beforeAll(async ({ request }) => {
    for (const email of users.map((user) => user.email)) {
      await request.post(`/api/e2e/delete/user/${email}`);
    }
  });

  users.forEach((user) => {
    test(`invite from ${user.email}`, async ({ page, baseURL }) => {
      invariant(baseURL, "Missing baseURL");
      const pom = createInvitePom({ page, baseURL });

      await pom.login({ email: user.email });
      await pom.inviteUsers({ emails: user.invitees.map((i) => i.email) });
      await pom.verifyInvitations({
        expectedEmails: user.invitees.map((i) => i.email),
      });
    });
  });

  users.forEach((user) => {
    const inviters = users.filter((u) =>
      u.invitees.some((i) => i.email === user.email),
    );
    const toAccept = inviters.filter(
      (u) =>
        u.invitees.find((i) => i.email === user.email)?.action === "accept",
    );
    const toReject = inviters.filter(
      (u) =>
        u.invitees.find((i) => i.email === user.email)?.action === "reject",
    );
    test(`handle invites for ${user.email}`, async ({ page, baseURL }) => {
      invariant(baseURL, "Missing baseURL");
      const pom = createInvitePom({ page, baseURL });

      await pom.login({ email: user.email });
      if (toAccept.length > 0) {
        await pom.acceptInvitations({
          expectedEmails: toAccept.map((u) => u.email),
        });
      }
      if (toReject.length > 0) {
        await pom.rejectInvitations({
          expectedEmails: toReject.map((u) => u.email),
        });
      }
    });
  });

  users.forEach((user) => {
    const acceptedCount = user.invitees.filter(
      (i) => i.action === "accept",
    ).length;
    const expectedCount = 1 + acceptedCount;
    test(`verify member count for ${user.email}`, async ({ page, baseURL }) => {
      invariant(baseURL, "Missing baseURL");
      const pom = createInvitePom({ page, baseURL });

      await pom.login({ email: user.email });
      await expect(page.getByTestId("member-count")).toHaveText(
        String(expectedCount),
      );
    });
  });
});

test.describe("admin invite", () => {
  test.describe.configure({ mode: "serial" });

  const adminInviteScenario = {
    ownerEmail: uniquifyEmail("invite-admin-owner@e2e.com"),
    adminEmail: uniquifyEmail("invite-admin-admin@e2e.com"),
    memberEmail: uniquifyEmail("invite-admin-member@e2e.com"),
  };

  const getOrganizationName = (email: string) =>
    `${email.charAt(0).toUpperCase() + email.slice(1)}'s Organization`;

  test.beforeAll(async ({ request }) => {
    for (const email of Object.values(adminInviteScenario)) {
      await request.post(`/api/e2e/delete/user/${email}`);
    }
  });

  test("admin can invite members", async ({ page, baseURL }) => {
    invariant(baseURL, "Missing baseURL");
    const pom = createInvitePom({ page, baseURL });
    const ownerOrganizationName = getOrganizationName(
      adminInviteScenario.ownerEmail,
    );
    const adminOrganizationName = getOrganizationName(
      adminInviteScenario.adminEmail,
    );

    await pom.login({ email: adminInviteScenario.ownerEmail });
    await pom.inviteUsers({
      emails: [adminInviteScenario.adminEmail],
      role: "admin",
    });
    await pom.verifyInvitations({
      expectedEmails: [adminInviteScenario.adminEmail],
      expectedRole: "admin",
    });

    await pom.login({ email: adminInviteScenario.adminEmail });
    await pom.acceptInvitations({
      expectedEmails: [adminInviteScenario.ownerEmail],
    });
    await pom.switchOrganization({
      currentName: adminOrganizationName,
      targetName: ownerOrganizationName,
    });
    await pom.expectInviteFormVisible();
    await pom.inviteUsers({
      emails: [adminInviteScenario.memberEmail],
      role: "member",
    });
    await pom.verifyInvitations({
      expectedEmails: [adminInviteScenario.memberEmail],
      expectedRole: "member",
    });

    await pom.login({ email: adminInviteScenario.memberEmail });
    await pom.acceptInvitations({
      expectedEmails: [adminInviteScenario.ownerEmail],
    });
    await expect(page.getByTestId("member-count")).toHaveText("3");
  });
});

const createInvitePom = ({
  page,
  baseURL,
}: {
  readonly page: Page;
  readonly baseURL: string;
}) => {
  invariant(baseURL.endsWith("/"), "baseURL must have a trailing slash");

  const login = async ({ email }: { email: string }) => {
    await page.goto("/login");
    await page.getByRole("textbox", { name: "Email" }).click();
    await page.getByRole("textbox", { name: "Email" }).fill(email);
    await page.getByRole("button", { name: "Send magic link" }).click();
    await page.getByRole("link", { name: /magic-link/ }).click();
    await page.waitForURL(/\/app\//);
  };

  const inviteUsers = async ({
    emails,
    role,
  }: {
    emails: string[];
    role?: "member" | "admin";
  }) => {
    await page.getByTestId("sidebar-invitations").click();
    await page.waitForURL(/invitations/);
    if (role) {
      await page
        .getByRole("button", { name: new RegExp(`^${role}$`, "i") })
        .click();
    }
    await page
      .getByRole("textbox", { name: "Email Addresses" })
      .fill(emails.join(", "));
    await page.locator("main").getByRole("button", { name: "Invite" }).click();
    await expect(
      page.getByRole("textbox", { name: "Email Addresses" }),
    ).toHaveValue("");
  };

  const verifyInvitations = async ({
    expectedEmails,
    expectedRole,
  }: {
    expectedEmails: string[];
    expectedRole?: "member" | "admin";
  }) => {
    const invitationsList = page.getByTestId("invitations-list");
    await expect(invitationsList).toBeVisible();
    for (const email of expectedEmails) {
      const invitationRow = invitationsList
        .locator("[data-slot='item']")
        .filter({ hasText: email })
        .first();
      await expect(invitationRow).toBeVisible();
      if (expectedRole) {
        await expect(invitationRow).toContainText(expectedRole);
      }
    }
  };

  const acceptInvitations = async ({
    expectedEmails,
  }: {
    expectedEmails: string[];
  }) => {
    // Invitations are accepted on the main app page, not the invitations page
    // After login, we're already on /app/ which shows pending invitations
    for (const email of expectedEmails) {
      const invitationRow = page
        .locator("[data-slot='item']")
        .filter({ hasText: email })
        .first();
      await page
        .getByRole("button", { name: new RegExp(`accept.*${email}`, "i") })
        .click();
      await expect(invitationRow).not.toBeVisible();
    }
  };

  const rejectInvitations = async ({
    expectedEmails,
  }: {
    expectedEmails: string[];
  }) => {
    for (const email of expectedEmails) {
      const invitationRow = page
        .locator("[data-slot='item']")
        .filter({ hasText: email })
        .first();
      await page
        .getByRole("button", { name: new RegExp(`reject.*${email}`, "i") })
        .click();
      await expect(invitationRow).not.toBeVisible();
    }
  };

  const switchOrganization = async ({
    currentName,
    targetName,
  }: {
    currentName: string;
    targetName: string;
  }) => {
    await page.getByRole("button", { name: currentName }).click();
    await page.getByRole("menuitem", { name: targetName }).click();
    await page.waitForURL(/\/app\//);
  };

  const expectInviteFormVisible = async () => {
    await page.getByRole("heading", { name: "Invite New Members" }).waitFor();
  };

  return {
    login,
    inviteUsers,
    verifyInvitations,
    acceptInvitations,
    rejectInvitations,
    switchOrganization,
    expectInviteFormVisible,
  };
};
