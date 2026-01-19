import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { extractSessionCookie, resetDb } from "../test-utils";

async function signInMagicLink({ email }: { email: string }) {
  await env.KV.delete("demo:magicLink");

  const response = await SELF.fetch(
    "http://example.com/api/auth/sign-in/magic-link",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, callbackURL: "/magic-link" }),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Expected ok response, got ${String(response.status)}: ${text}`,
    );
  }

  const magicLink = (await env.KV.get("demo:magicLink")) ?? undefined;
  if (!magicLink) throw new Error("Expected demo:magicLink KV key");

  return {
    magicLink: magicLink.replace(
      process.env.BETTER_AUTH_URL,
      "http://example.com",
    ),
  };
}

describe("auth (integration)", () => {
  it("sends magic link and writes it to KV", async () => {
    await resetDb();

    const { magicLink } = await signInMagicLink({ email: "u1@example.com" });

    expect(magicLink).toContain("/api/auth/magic-link/verify");
    expect(magicLink).toContain("token=");
  });

  it("verifies magic link and creates a session", async () => {
    await resetDb();

    const { magicLink } = await signInMagicLink({ email: "u2@example.com" });

    const verifyResponse = await SELF.fetch(magicLink, {
      redirect: "manual",
      headers: { Host: "example.com" },
    });

    expect([301, 302, 303, 307, 308]).toContain(verifyResponse.status);

    const sessionCookie = extractSessionCookie(verifyResponse);

    const magicLinkRouteResponse = await SELF.fetch(
      "http://example.com/magic-link",
      {
        redirect: "manual",
        headers: { Cookie: sessionCookie },
      },
    );

    expect([301, 302, 303, 307, 308]).toContain(magicLinkRouteResponse.status);
    expect(magicLinkRouteResponse.headers.get("Location")).toBe("/app");
  });

  it("redirects /magic-link based on user role", async () => {
    await resetDb();

    const { magicLink } = await signInMagicLink({ email: "u3@example.com" });

    const verifyResponse = await SELF.fetch(magicLink, {
      redirect: "manual",
      headers: { Host: "example.com" },
    });

    const sessionCookie = extractSessionCookie(verifyResponse);

    const magicLinkRouteResponse = await SELF.fetch(
      "http://example.com/magic-link",
      {
        redirect: "manual",
        headers: { Cookie: sessionCookie },
      },
    );

    expect(magicLinkRouteResponse.status).toBeGreaterThanOrEqual(300);
    expect(magicLinkRouteResponse.status).toBeLessThan(400);
    expect(magicLinkRouteResponse.headers.get("Location")).toBe("/app");
  });

  it("signs out (endpoint reachable)", async () => {
    await resetDb();

    const { magicLink } = await signInMagicLink({ email: "u4@example.com" });

    const verifyResponse = await SELF.fetch(magicLink, {
      redirect: "manual",
      headers: { Host: "example.com" },
    });

    const sessionCookie = extractSessionCookie(verifyResponse);

    const signOutResponse = await SELF.fetch(
      "http://example.com/api/auth/sign-out",
      {
        method: "POST",
        redirect: "manual",
        headers: { Cookie: sessionCookie, Host: "example.com" },
      },
    );

    expect(signOutResponse.status).toBeGreaterThanOrEqual(200);
    expect(signOutResponse.status).toBeLessThan(500);
  });
});
