import { test, expect, chromium } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';

const repoRoot = path.join(__dirname, '..', '..');
const extensionPath = path.join(repoRoot, 'dist');
const popupWidths = [320, 360, 375];

function getBuiltExtensionVersion(): string {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(extensionPath, 'manifest.json'), 'utf8')
  ) as { version: string };
  return manifest.version;
}

test.describe('Clousight extension (dist)', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(path.join(extensionPath, 'manifest.json'))) {
      throw new Error('dist/ not found — run `npm run build:extension` before the e2e tests.');
    }
  });

  test('loads as an unpacked extension and renders the options + popup pages', async () => {
    const extensionVersion = getBuiltExtensionVersion();
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
      await options.goto(`chrome-extension://${extensionId}/options.html#/settings`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000
      });
      await expect(options.locator('#app')).not.toBeEmpty();
      await expect(options.getByText(/Appearance|外观/)).toBeVisible();
      await expect(options.getByRole('radio', { name: /Light|浅色/ })).toBeVisible();
      await expect(options.getByRole('radio', { name: /Dark|深色/ })).toBeVisible();
      await expect(options.getByRole('radio', { name: /System|跟随系统/ })).toBeVisible();
      await expect(options.getByText(extensionVersion, { exact: false })).toBeVisible();
      await expect(options.locator('html')).not.toHaveClass(/dark/);
      await expect(options.locator('body')).not.toContainText(/\bmock\b|模拟数据/i);

      // Popup mounts and shows the brand.
      const popup = await context.newPage();
      await popup.goto(`chrome-extension://${extensionId}/popup.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000
      });
      await expect(popup.locator('#app')).not.toBeEmpty();
      await expect(
        popup.locator('[data-brand-text]').getByText(/Clousight|云计算指北/)
      ).toBeVisible();
      await expect(
        popup.getByText(/Data from providers’ official status sources|数据来自云厂商官方状态源/)
      ).toBeVisible();
      await expect(popup.locator('body')).not.toContainText(/\bmock\b|模拟数据/i);
      await expect(popup.getByText(`v${extensionVersion}`, { exact: true })).toBeVisible();
      await expect(popup.locator('html')).not.toHaveClass(/dark/);

      for (const width of popupWidths) {
        await popup.setViewportSize({ width, height: 720 });
        const { scrollWidth, clientWidth } = await popup.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        }));
        expect(
          scrollWidth,
          `popup should not overflow horizontally at ${width}px`
        ).toBeLessThanOrEqual(clientWidth);
      }
    } finally {
      await context.close();
    }
  });
});
