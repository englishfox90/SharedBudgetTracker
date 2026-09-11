import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end smoke tests. They expect a running app (default http://localhost:3000)
 * backed by a database seeded with the demo user (`npm run db:seed`).
 * Override with E2E_BASE_URL, E2E_EMAIL and E2E_PASSWORD.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 0,
  // Tests confirm and delete a transaction, so they must not run against the same data in parallel
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    // iPhone profile runs in Chromium so the suite only needs one browser installed
    { name: 'iphone', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
