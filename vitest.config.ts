import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid({ hot: false })],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    // Prevent Vitest from picking up test files inside git worktrees,
    // which live under .claude/worktrees/ and carry their own config.
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.claude/**",
    ],
  },
});
