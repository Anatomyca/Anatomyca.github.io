import { expect, test, type Page } from '@playwright/test';

/**
 * Moving the camera.
 *
 * Zoom, the standard views and the keyboard existed only as dead code in the
 * scene before this: setView and resetView were implemented and nothing ever
 * called them. These tests are what keeps them reachable.
 */

async function open(page: Page) {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(
    () => !document.body.textContent?.includes('Building the body'),
    null,
    { timeout: 120_000 },
  );
}

/** The canvas pixels, for asking whether the camera actually moved. */
const view = (page: Page) => page.locator('canvas').screenshot();

test('zooms in and out from the always-visible keys', async ({ page }) => {
  await open(page);
  const before = await view(page);
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.waitForTimeout(1200);
  expect(Buffer.compare(before, await view(page))).not.toBe(0);

  await page.getByRole('button', { name: 'Zoom out' }).click();
  await page.waitForTimeout(1200);
  await expect(page.getByRole('button', { name: 'Zoom out' })).toBeVisible();
});

test('keeps zoom and fit reachable without opening a sheet', async ({ page }) => {
  // On a phone these are the moves a reader makes constantly; burying them
  // in the dock would cost two taps every time.
  await open(page);
  for (const label of ['Zoom in', 'Zoom out', 'Fit to view']) {
    await expect(page.getByRole('button', { name: label })).toBeVisible();
  }
});

test('offers the six standard views, and each one moves the camera', async ({ page }) => {
  await open(page);
  const tools = page.getByRole('button', { name: /^Tools$/ });
  if (await tools.isVisible().catch(() => false)) await tools.click();

  for (const name of ['Back', 'Left', 'Top', 'Bottom']) {
    const before = await view(page);
    await page.getByRole('button', { name, exact: true }).click();
    await page.waitForTimeout(1300);
    expect(Buffer.compare(before, await view(page)), `${name} view`).not.toBe(0);
  }
});

test('moves the camera from the keyboard alone', async ({ page }) => {
  // Without this a keyboard user cannot turn the body at all.
  await open(page);
  await page.locator('canvas').click({ position: { x: 10, y: 10 } });
  await page.waitForTimeout(1500);

  const before = await view(page);
  await page.keyboard.press('2');
  await page.waitForTimeout(1300);
  expect(Buffer.compare(before, await view(page))).not.toBe(0);

  const turned = await view(page);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(900);
  expect(Buffer.compare(turned, await view(page))).not.toBe(0);
});

test('does not hijack keys from someone typing in the search box', async ({ page }) => {
  await open(page);
  const search = page.getByRole('searchbox');
  await search.fill('1');
  await search.type('60');
  await expect(search).toHaveValue('160');
});
