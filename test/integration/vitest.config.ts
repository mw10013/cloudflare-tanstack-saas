import path from "node:path";
import {
  defineWorkersProject,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineWorkersProject(async () => {
  const migrationsPath = path.join(__dirname, "../../migrations");
  const migrations = await readD1Migrations(migrationsPath);

  return {
    plugins: [
      tsconfigPaths({
        projects: [path.resolve(__dirname, "../../tsconfig.json")],
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "../../src"),
      },
      conditions: ["workerd", "worker", "browser"],
    },
    ssr: {
      target: "webworker" as const,
      resolve: {
        conditions: ["workerd", "worker", "browser"],
      },
    },
    test: {
      include: ["test/integration/*.test.ts"],
      setupFiles: ["test/apply-migrations.ts"],
      poolOptions: {
        workers: {
          main: path.resolve(__dirname, "../../dist/server/index.js"),
          isolatedStorage: false,
          singleWorker: true,
          wrangler: {
            configPath: "../../wrangler.jsonc",
          },
          miniflare: {
            bindings: { TEST_MIGRATIONS: migrations },
          },
        },
      },
    },
  };
});
