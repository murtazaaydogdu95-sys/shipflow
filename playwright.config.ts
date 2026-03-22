import { defineConfig, devices } from "@playwright/test";
import path from "path";
import dotenv from "dotenv";

// Load test env vars
dotenv.config({ path: path.resolve(__dirname, ".env.test"), override: true });

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 3,
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["html", { open: "on-failure" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    // Setup project: logs in once and saves auth state
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    // Main test project: uses saved auth state
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: path.resolve(__dirname, "e2e/.auth/user.json"),
      },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
  globalSetup: "./e2e/global-setup.ts",
  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: BASE_URL,
    // Locally: reuse if a test server is already running on port 3001
    // CI: always start fresh
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // NEXT_TEST_MODE uses a separate .next-test/ dir to avoid lock conflicts
      NEXT_TEST_MODE: "1",
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://codepylot:codepylot@localhost:5432/codepylot_test",
      AUTH_SECRET: process.env.AUTH_SECRET || "e2e-test-secret-at-least-32-chars-long-for-nextauth",
      AUTH_TRUST_HOST: "true",
      NEXT_PUBLIC_APP_URL: BASE_URL,
      OLLAMA_URL: process.env.OLLAMA_URL || "http://localhost:11434/v1",
      CRON_SECRET: process.env.CRON_SECRET || "test-cron-secret",
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "e2e-test-encryption-key-32chars!",
      NODE_ENV: "development",
    },
  },
});
