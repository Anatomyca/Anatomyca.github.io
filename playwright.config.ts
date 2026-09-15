import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * Some sandboxes ship a pinned Chromium that does not match the version this
 * Playwright would download. Use it when it is there; otherwise fall back to
 * Playwright's own browser, which is what CI installs.
 */
const PINNED_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const launchOptions = existsSync(PINNED_CHROMIUM)
  ? { executablePath: PINNED_CHROMIUM, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }
  : {};

/**
 * The reference tool tested only emulated viewports and said so. That is the
 * gap this suite starts to close: the viewport list below is the one from
 * the delivery plan, covering the small Android and iPhone SE end that the
 * project actually targets, plus phone landscape, which is where a bottom
 * sheet would otherwise swallow the model.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    launchOptions,
  },
  webServer: {
    command: 'npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
  projects: [
    { name: 'phone-small', use: { viewport: { width: 320, height: 568 } } },
    { name: 'phone', use: { ...devices['Pixel 5'] } },
    { name: 'phone-landscape', use: { viewport: { width: 844, height: 390 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
  ],
});
