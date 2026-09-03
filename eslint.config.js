// @ts-check
import { defineConfig } from "eslint/config";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Flat ESLint config. Type-aware linting is on so rules that reason about the
 * union and conditional types this library is made of actually fire.
 */
export default defineConfig(
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.js"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Arrays read as `Array<T>` / `ReadonlyArray<T>`, never `T[]`.
      "@typescript-eslint/array-type": ["error", { default: "generic" }],
      // Phantom type parameters are the mechanism here, not an accident: the
      // error channel of `Ok<T, E>` and the brand of `Integer` each appear in
      // one position by design.
      "@typescript-eslint/no-unnecessary-type-parameters": "off",
      // `??` collapses null and undefined, but telling those two apart is the
      // entire reason Option and Maybe are separate types — so a `!== null`
      // ternary is deliberate, never something to rewrite as `??`.
      "@typescript-eslint/prefer-nullish-coalescing": ["error", { ignoreTernaryTests: true }],
      // A number in a template literal is fine.
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      // The whole point of the library is a T that may be absent; comparing
      // against null/undefined and branding are load-bearing, not smells.
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      // Test lambdas are often `async` to exercise an async code path even when
      // their body has nothing to await.
      "@typescript-eslint/require-await": "off",
    },
  },
);
