import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import { config } from 'dotenv';

config({
  path: '.env.local',
});

/* Use process.env.PORT by default and fallback to port 3000 */
const PORT = process.env.PORT || 3000;

/**
 * Set webServer.url and use.baseURL with the location
 * of the WebServer respecting the correct set port
 */
const baseURL = `http://localhost:${PORT}`;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure global timeout for each test */
  timeout: 30 * 1000, // 30 seconds
  expect: {
    timeout: 30 * 1000,
  },

  /* Configure projects */
  projects: [
    {
      name: 'setup:auth',
      testMatch: /auth.setup.ts/,
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm dev',
    url: baseURL,
    timeout: 120 * 1000,
    reuseExistingServer: true,
  },
});
