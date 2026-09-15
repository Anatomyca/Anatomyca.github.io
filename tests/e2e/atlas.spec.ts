import { expect, test, type Page } from '@playwright/test';

/**
 * Geometry streams in per system, so "ready" means the boot overlay has gone
 * and the canvas is live — not that every system has arrived.
 */
async function waitForAtlas(page: Page) {
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(
    () => !document.body.textContent?.includes('Building the body'),
    null,
    { timeout: 120_000 },
  );
}

async function open(page: Page, path = '/') {
  await page.goto(path);
  await waitForAtlas(page);
}

test('renders the atlas without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page);
  expect(errors).toEqual([]);
});

test('finds the heart, which is a concept with no mesh of its own', async ({ page }) => {
  await open(page);
  await page.getByRole('searchbox').fill('heart');
  await page.getByRole('option').first().click();
  await expect(page.locator('#detail h2')).toHaveText('Heart');
  // The heart is 83 element meshes gathered under one FMA concept.
  await expect(page.locator('#detail header p')).toContainText('83');
});

test('shows provenance and an accuracy grade for what it opens', async ({ page }) => {
  await open(page);
  await page.getByRole('searchbox').fill('liver');
  await page.getByRole('option').first().click();
  await expect(page.locator('#detail')).toContainText(/Accuracy [ABC]/);
  await expect(page.locator('#detail')).toContainText('BodyParts3D');
});

test('switches to Sinhala and translates a name that has one', async ({ page }) => {
  await open(page);
  await page.getByRole('searchbox').fill('heart');
  await page.getByRole('option').first().click();
  await page.getByRole('button', { name: 'සි' }).click();
  await expect(page.locator('#detail h2')).toHaveText('හෘදය');
  await expect(page.locator('html')).toHaveAttribute('lang', 'si');
});

test('finds a structure typed in Tamil script', async ({ page }) => {
  await open(page);
  await page.getByRole('searchbox').fill('இதயம்');
  await expect(page.getByRole('option').first()).toBeVisible();
});

test('puts the open structure in a shareable link', async ({ page }) => {
  await open(page);
  await page.getByRole('searchbox').fill('spleen');
  await page.getByRole('option').first().click();
  expect(page.url()).toMatch(/#\/s\/FMA\d+/);
});

test('opens on the right structure from a pasted link', async ({ page }) => {
  // FMA7088 is the heart.
  await open(page, '/#/s/FMA7088?lang=ta');
  await expect(page.locator('#detail h2')).toHaveText('இதயம்');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ta');
});

test('lists every body system in the rail', async ({ page }) => {
  await open(page);
  // Fifteen systems, each a separate download the reader chooses to make.
  await expect(page.locator('nav[aria-label] button')).toHaveCount(15);
});

test('never scrolls sideways, at any viewport', async ({ page }) => {
  await open(page);
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflows).toBe(false);
});
