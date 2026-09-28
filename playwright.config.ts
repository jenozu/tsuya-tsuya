import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 35_000,
  expect: { timeout: 12_000 },
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1',
    url: 'http://127.0.0.1:3000/cart',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_UNDER_CONSTRUCTION: 'false', NEXT_TELEMETRY_DISABLED: '1',
      // Browser tests run against a deliberately isolated dev instance.
      // Never inherit a developer's production database or admin credentials.
      DATABASE_URL: '',
      ADMIN_PASSWORD: 'tsu-e2e-synthetic-admin-password',
      ADMIN_SESSION_SECRET: 'tsu-e2e-synthetic-session-signing-key-not-for-production',
      R2_ACCOUNT_ID: '', R2_ACCESS_KEY_ID: '', R2_SECRET_ACCESS_KEY: '',
      STRIPE_SECRET_KEY: '', RESEND_API_KEY: '',
    },
  },
})
