import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: [
      "apps/customer-site/src/**/*.{ts,tsx}",
      "apps/admin-app/src/**/*.{ts,tsx}",
      "packages/**/*.{ts,tsx}"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off",
      "prefer-const": "off",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    files: [
      "apps/customer-site/src/components/language-switcher.tsx",
      "apps/customer-site/src/dictionaries/**/*.{ts,tsx}"
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "jspdf", message: "jsPDF imports are restricted to PDF utility modules." },
            { name: "jspdf-autotable", message: "jsPDF imports are restricted to PDF utility modules." }
          ]
        }
      ]
    }
  },
  globalIgnores([
    "**/node_modules/**",
    "**/.next/**",
    "**/out/**",
    "**/dist/**",
    "gas-scripts/**",
    "stripe-cli/**",
  ]),
]);
