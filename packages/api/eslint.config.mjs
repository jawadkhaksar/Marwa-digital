import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist/**", "dist-vercel/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // Route handlers/helpers intentionally accept loosely-typed JSON
      // bodies (Prisma JSON columns, req.body pre-Zod-validation) — `any`
      // shows up honestly in a few of those spots rather than being masked
      // behind an `unknown` cast that adds no real safety.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  }
);
