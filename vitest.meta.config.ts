import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve("src") } },
  test: {
    environment: "node",
    include: ["tests/integration/meta.test.ts"],
    testTimeout: 120000,
    hookTimeout: 30000,
  },
});
