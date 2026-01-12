declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {
    TEST_MIGRATIONS: D1Migration[];
  }
  export const env: ProvidedEnv;
  export function applyD1Migrations(
    database: D1Database,
    migrations: D1Migration[]
  ): Promise<void>;
}
