import { defineConfig, devices } from "@playwright/test";
import { testEnvironment } from "./tests/support/environment";
delete process.env.NO_COLOR;
export default defineConfig({
  testDir: "./tests/production",
  outputDir: "./test-results/production",
  workers: 1,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3100" },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100/today",
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      ...testEnvironment,
      APP_ENV: "production",
      APP_BASE_URL: "http://127.0.0.1:3100",
      APP_TIMEZONE: "Asia/Jakarta",
    },
  },
});
