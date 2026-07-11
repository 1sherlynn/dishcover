import { defineConfig, configDefaults } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    // Background-agent worktrees are full repo copies — don't sweep their tests.
    exclude: [...configDefaults.exclude, "**/.claude/**"],
  },
});
