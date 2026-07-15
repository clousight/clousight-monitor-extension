import { test, expect, chromium } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';

const repoRoot = path.join(__dirname, '..', '..');
const extensionPath = path.join(repoRoot, 'dist');

test.describe('Clousight extension (dist)', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(path.join(extensionPath, 'manifest.json'))) {
      throw new Error('dist/ not found — run `npm run build:extension` before the e2e tests.');
    }
  });

  test('loads as an unpacked extension and renders the options + popup pages', async () => {
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clousight-pw-'));
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
      headless: !!process.env.CI
    });

    try {
      const serviceWorker = await context.waitForEvent('serviceworker');
      const extensionId = new URL(serviceWorker.url()).host;

      // Options page mounts the SPA.
      const options = await context.newPage();
      await options.goto(`chrome-extension://${extensionId}/options.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000
      });
      await expect(options.locator('#app')).not.toBeEmpty();

      // Popup mounts and shows the brand.
      const popup = await context.newPage();
      await popup.goto(`chrome-extension://${extensionId}/popup.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000
      });
      await expect(popup.locator('#app')).not.toBeEmpty();
    } finally {
      await context.close();
    }
  });
});
