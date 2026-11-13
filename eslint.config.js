import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "dist-ssr/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    ignores: ["src/view/**"],
    rules: {
      // #24: rendering belongs to the view, including Konva subpath imports.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["konva", "konva/**"],
              message: "Import Konva only inside src/view/ (see #24).",
            },
          ],
        },
      ],
    },
  },
);
