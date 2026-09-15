import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The React Compiler is not enabled in this project, so this rule only
      // complains about hand-written useCallback/useMemo dependency lists.
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Spec and prototype files kept for reference only (not compiled):
    "docs/**",
    // Plain service worker, not part of the TypeScript app:
    "public/sw.js",
  ]),
]);

export default eslintConfig;
