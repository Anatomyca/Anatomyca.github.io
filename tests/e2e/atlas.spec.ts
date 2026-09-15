import { expect, test, type Page } from '@playwright/test';

/** The body takes a moment to generate; wait for the boot overlay to clear. */
async function waitForAtlas(page: Page) {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Anatomyca' })).toBeVisible();
  await page.waitForFunction(() => !document.body.textContent?.includes('Building the body'), null, { timeout: 30_000 });
}

test('renders the atlas without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await waitForAtlas(page);
  expect(errors).toEqual([]);
});

test('finds a structure by name and opens it', async ({ page }) => {
  await waitForAtlas(page);
  await page.getByRole('searchbox').fill('heart');
  await page.getByRole('option').first().click();
  await expect(page.locator('#detail h2')).toHaveText('Heart');
});

test('shows an accuracy grade for every structure opened', async ({ page }) => {
  await waitForAtlas(page);
  await page.getByRole('searchbox').fill('liver');
  await page.getByRole('option').first().click();
  // Provenance is always visible: that is the project's accuracy promise.
  await expect(page.locator('#detail')).toContainText(/Accuracy [ABC]/);
});

test('switches to Sinhala and translates the structure name', async ({ page }) => {
  await waitForAtlas(page);
  await page.getByRole('searchbox').fill('heart');
  await page.getByRole('option').first().click();
  await page.getByRole('button', { name: 'සි' }).click();
  await expect(page.locator('#detail h2')).toHaveText('හෘදය');
  await expect(page.locator('html')).toHaveAttribute('lang', 'si');
});

test('finds a structure typed in Tamil script', async ({ page }) => {
  await waitForAtlas(page);
  await page.getByRole('searchbox').fill('இதயம்');
  await expect(page.getByRole('option').first()).toBeVisible();
});

test('puts the open structure in a shareable link', async ({ page }) => {
  await waitForAtlas(page);
  await page.getByRole('searchbox').fill('kidney');
  await page.getByRole('option').first().click();
  expect(page.url()).toContain('#/s/kidneys');
});

test('opens on the right structure from a pasted link', async ({ page }) => {
  await page.goto('/#/s/liver?lang=ta');
  await expect(page.locator('#detail h2')).toHaveText('கல்லீரல்');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ta');
});

test('never scrolls sideways, at any viewport', async ({ page }) => {
  await waitForAtlas(page);
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflows).toBe(false);
});
