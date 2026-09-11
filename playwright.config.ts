import { defineConfig, devices } from "@playwright/test";

delete process.env.NO_COLOR;

const testEnvironment = {
  APP_BASE_URL: "http://127.0.0.1:3000",
  APP_ENV: "development",
  APP_TIMEZONE: "Asia/Jakarta",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "phase-0-anon-key",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_SERVICE_ROLE_KEY: "phase-0-service-role-key",
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1",
    env: { ...process.env, ...testEnvironment },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: "http://127.0.0.1:3000",
  },
});
