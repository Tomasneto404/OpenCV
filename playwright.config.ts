import { defineConfig, devices } from '@playwright/test';

const externalURL = process.env.E2E_BASE_URL;
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: externalURL || 'http://localhost:5173',
    locale: 'pt-PT',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: externalURL ? undefined : [
    { command: 'npm run dev:server', url: 'http://127.0.0.1:3001/health', reuseExistingServer: !process.env.CI, timeout: 60_000 },
    { command: 'npm run dev:client', url: 'http://localhost:5173', reuseExistingServer: !process.env.CI, timeout: 60_000 },
  ],
});
