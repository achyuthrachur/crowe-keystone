import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 2,
  timeout: 60000,
  reporter: 'line',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3002',
    trace: 'on-first-retry',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROME_PATH,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 14'] },
    },
  ],
  // webServer config: use CI=true to skip auto-start when running locally
  // with a pre-running dev server. Run: npm run dev first, then npx playwright test
  ...(process.env.CI ? {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:3002',
      reuseExistingServer: false,
      timeout: 120000,
    },
  } : {}),
});
