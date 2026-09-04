import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

const DB_ACCESS_MESSAGE =
  "apps/web nunca fala com o banco. Toda leitura e escrita passa pela API (regra inviolável 2).";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/next-env.d.ts"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@watchlist/db", message: DB_ACCESS_MESSAGE, allowTypeImports: false },
            { name: "pg", message: DB_ACCESS_MESSAGE, allowTypeImports: false },
            { name: "drizzle-orm", message: DB_ACCESS_MESSAGE, allowTypeImports: false },
            { name: "drizzle-kit", message: DB_ACCESS_MESSAGE, allowTypeImports: false }
          ],
          patterns: [
            {
              group: ["@watchlist/db/*", "drizzle-orm/*", "pg/*"],
              message: DB_ACCESS_MESSAGE,
              allowTypeImports: false
            }
          ]
        }
      ]
    }
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "setInterval", message: "Nada em polling. Trabalho periódico é job no cron (secao 9)." }
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ]
    }
  },
  prettier
);

