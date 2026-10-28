import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist-astro/**",
      ".astro/**",
      "astro-src/**",
      "_static_backup/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Kit libs use `any` in Telegram payloads; `useNeon` is a DB helper, not a React hook.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "react-hooks/rules-of-hooks": "off",
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
