declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {
    TEST_MIGRATIONS: D1Migration[];
    D1: D1Database;
    KV: KVNamespace;
  }

  export const env: ProvidedEnv;

  export function applyD1Migrations(
    database: D1Database,
    migrations: D1Migration[],
  ): Promise<void>;

  export function runInDurableObject<T>(
    stub: unknown,
    callback: (instance: unknown, state: unknown) => Promise<T>,
  ): Promise<T>;

  export function listDurableObjectIds(namespace: unknown): Promise<unknown[]>;

  export const SELF: Fetcher;
}
