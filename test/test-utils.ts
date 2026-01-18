import { env } from "cloudflare:test";

export async function resetDb(resetFn?: (db: D1Database) => Promise<void>) {
  await env.D1.batch([
    ...["Session", "Member", "Invitation", "Verification", "Organization"].map(
      (table) => env.D1.prepare(`delete from ${table}`),
    ),
    env.D1.prepare(`delete from Account where id <> 'admin'`),
    env.D1.prepare(`delete from User where id <> 'admin'`),
  ]);
  if (resetFn) await resetFn(env.D1);
}

export function extractSessionCookie(response: Response): string {
  const setCookieHeader = response.headers.get("Set-Cookie");
  if (!setCookieHeader) throw new Error("Expected Set-Cookie header");
  const match = setCookieHeader.match(/better-auth\.session_token=([^;]+)/);
  if (!match) throw new Error(`Missing session cookie: ${setCookieHeader}`);
  return `better-auth.session_token=${match[1]}`;
}

export function parseSetCookie(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader.split(";").map((cookie) => {
      const [key, value] = cookie.trim().split("=");
      return [key, value];
    }),
  );
}

export function getSetCookie(response: Response): string {
  const cookieHeader = response.headers.get("Set-Cookie");
  if (!cookieHeader) throw new Error("Expected Set-Cookie header");
  return cookieHeader;
}
