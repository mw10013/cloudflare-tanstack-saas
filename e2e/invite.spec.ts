import type { Page } from "@playwright/test";
import { invariant } from "@epic-web/invariant";
import { expect, test } from "@playwright/test";

const users: {
  email: string;
  invitees: { email: string; action?: "accept" | "reject" }[];
}[] = [
  {
    email: "invite@e2e.com",
    invitees: [
      { email: "invite1@e2e.com", action: "accept" },
      { email: "invite2@e2e.com", action: "accept" },
      { email: "invite3@e2e.com", action: "accept" },
    ],
  },
  {
    email: "invite1@e2e.com",
    invitees: [
      { email: "invite@e2e.com" },
      { email: "invite2@e2e.com" },
      { email: "invite3@e2e.com" },
    ],
  },
  {
    email: "invite2@e2e.com",
    invitees: [
      { email: "invite@e2e.com", action: "reject" },
      { email: "invite1@e2e.com", action: "reject" },
      { email: "invite3@e2e.com", action: "reject" },
    ],
  },
  {
    email: "invite3@e2e.com",
    invitees: [
      { email: "invite@e2e.com", action: "accept" },
      { email: "invite1@e2e.com", action: "reject" },
      { email: "invite2@e2e.com" },
    ],
  },
];

test.describe("invite", () => {
  test.describe.configure({ mode: "serial" });

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

  const inviteUsers = async ({ emails }: { emails: string[] }) => {
    await page.getByTestId("sidebar-invitations").click();
    await page.waitForURL(/invitations/);
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
  }: {
    expectedEmails: string[];
  }) => {
    await expect(page.getByTestId("invitations-list")).toBeVisible();
    for (const email of expectedEmails) {
      await expect(
        page.getByTestId("invitations-list").getByText(email),
      ).toBeVisible();
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
      await page
        .getByRole("button", { name: new RegExp(`accept.*${email}`, "i") })
        .click();
    }
    for (const email of expectedEmails) {
      await expect(page.getByText(`Inviter: ${email}`)).not.toBeVisible();
    }
  };

  const rejectInvitations = async ({
    expectedEmails,
  }: {
    expectedEmails: string[];
  }) => {
    for (const email of expectedEmails) {
      await page
        .getByRole("button", { name: new RegExp(`reject.*${email}`, "i") })
        .click();
    }
    for (const email of expectedEmails) {
      await expect(page.getByText(`Inviter: ${email}`)).not.toBeVisible();
    }
  };

  return {
    login,
    inviteUsers,
    verifyInvitations,
    acceptInvitations,
    rejectInvitations,
  };
};
