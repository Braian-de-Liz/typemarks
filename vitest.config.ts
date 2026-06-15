import { defineConfig } from "vitest/config";
import typiaVitePlugin from "@typia/unplugin/vite";

export default defineConfig({
  plugins: [typiaVitePlugin()],
  test: {
    globals: true,
    environment: "node",
    testTimeout: 60000,
    hookTimeout: 60000,
    include: ["tests/**/*.test.ts"],
    pool: "forks"
  },
});