import eslint from "@eslint/js";
import pluginQuery from "@tanstack/eslint-plugin-query";
import pluginRouter from "@tanstack/eslint-plugin-router";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores([
    "build/",
    ".wrangler/",
    "worker-configuration.d.ts",
    "refs/",
    "src/components/ui/carousel.tsx",
    "src/components/ui/chart.tsx",
    "src/components/ui/field.tsx",
    "src/components/ui/form.tsx",
    "src/components/ui/input-otp.tsx",
    "src/components/ui/progress.tsx",
    "src/components/ui/sidebar.tsx",
    "src/components/ui/toggle-group.tsx",
    "src/hooks/use-mobile.ts",
  ]),

  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  ...pluginRouter.configs["flat/recommended"],
  ...pluginQuery.configs["flat/recommended"],
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.js"],
        },
      },
    },
  },
  {
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/prefer-string-starts-ends-with": [
        "error",
        { allowSingleElementEquality: "always" },
      ],
      "@typescript-eslint/prefer-regexp-exec": "off",
    },
  },
  {
    files: ["src/**/*.tsx", "src/**/*.ts"],
    ...reactPlugin.configs.flat.recommended,
    ...reactPlugin.configs.flat["jsx-runtime"],
    languageOptions: {
      ...reactPlugin.configs.flat.recommended.languageOptions,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
);
