import { env } from "cloudflare:test";

export async function resetDb(resetFn?: (db: D1Database) => Promise<void>) {
  await env.D1.batch([
    ...["Session", "Member", "Invitation", "Verification", "Organization"].map(
      (table) => env.D1.prepare(`delete from ${table}`),
    ),
    env.D1.prepare(`delete from Account where accountId <> 1`),
    env.D1.prepare(`delete from User where userId <> 1`),
  ]);
  if (resetFn) await resetFn(env.D1);
}
