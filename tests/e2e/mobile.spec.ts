import { expect, test, type Page } from '@playwright/test';

/**
 * Phone behaviour.
 *
 * These exist because the layout once hid the system rail below the tablet
 * breakpoint, which left a reader on a phone unable to switch systems at
 * all — the single most important control in the atlas — and because Sinhala
 * and Tamil labels run long enough to push the page into sideways scrolling.
 */

async function open(page: Page, lang = 'en') {
  await page.goto(`/#/?lang=${lang}`);
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(
    () => !document.body.textContent?.includes('Building the body'),
    null,
    { timeout: 120_000 },
  );
}

const SYSTEMS_TAB = /Systems|පද්ධති|தொகுதி/;

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('reaches every body system from the bottom bar', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: SYSTEMS_TAB }).first().click();
    const rail = page.locator('[role=dialog] nav[aria-label]');
    await expect(rail.getByRole('button')).toHaveCount(15);
  });

  test('switches a system on from the phone', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: SYSTEMS_TAB }).first().click();
    const muscles = page.locator('[role=dialog]').getByRole('button', { name: /Muscles/ });
    await expect(muscles).toHaveAttribute('aria-pressed', 'false');
    await muscles.click();
    await expect(muscles).toHaveAttribute('aria-pressed', 'true');
  });

  test('gives the body the screen until a panel is asked for', async ({ page }) => {
    await open(page);
    // No sheet open: the canvas should have most of the height, not share it
    // with a permanently docked detail panel.
    const share = await page.evaluate(() => {
      const c = document.querySelector('canvas')!.getBoundingClientRect();
      return c.height / innerHeight;
    });
    expect(share).toBeGreaterThan(0.6);
  });

  for (const lang of ['en', 'si', 'ta'] as const) {
    test(`never scrolls sideways in ${lang}`, async ({ page }) => {
      await open(page, lang);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });

    test(`keeps the search field usable in ${lang}`, async ({ page }) => {
      await open(page, lang);
      // It once collapsed to 57px in Tamil, which is unusable.
      const width = await page.evaluate(
        () => document.querySelector('input[type=search]')!.getBoundingClientRect().width,
      );
      expect(width).toBeGreaterThan(200);
    });
  }
});

test.describe('small phone', () => {
  test.use({ viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true });

  test('fits a 320px screen in Tamil without sideways scrolling', async ({ page }) => {
    await open(page, 'ta');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('keeps every touch target reachable', async ({ page }) => {
    await open(page, 'ta');
    const tooSmall = await page.evaluate(() =>
      [...document.querySelectorAll('nav button')]
        .filter((b) => (b as HTMLElement).offsetParent !== null)
        .filter((b) => b.getBoundingClientRect().height < 36).length);
    expect(tooSmall).toBe(0);
  });
});
