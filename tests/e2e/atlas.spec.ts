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

/** Wide screens show the detail pane; phones raise it from the bottom bar. */
async function showDetail(page: Page) {
  if (await page.locator('#detail').isVisible().catch(() => false)) return;
  await page.getByRole('button', { name: /Detail|විස්තර|விவரம்/ }).first().click();
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
  await showDetail(page);
  await expect(page.locator('#detail h2, [role=dialog] h2').last()).toHaveText('Heart');
  // The heart is 83 element meshes gathered under one FMA concept.
  await expect(page.locator('#detail, [role=dialog]').last()).toContainText('83');
});

test('shows provenance and an accuracy grade for what it opens', async ({ page }) => {
  await open(page);
  await page.getByRole('searchbox').fill('liver');
  await page.getByRole('option').first().click();
  await showDetail(page);
  const panel = page.locator('#detail, [role=dialog]').last();
  await expect(panel).toContainText(/Accuracy [ABC]/);
  await expect(panel).toContainText('BodyParts3D');
});

test('switches to Sinhala and translates a name that has one', async ({ page }) => {
  await open(page);
  await page.getByRole('searchbox').fill('heart');
  await page.getByRole('option').first().click();
  await page.getByRole('button', { name: 'සි' }).click();
  await showDetail(page);
  await expect(page.locator('#detail h2, [role=dialog] h2').last()).toHaveText('හෘදය');
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
  // Concepts carry an FMA id; whole-organ concepts derived from left/right
  // halves carry a PAIR- id. Either is a stable, shareable address.
  await expect.poll(() => page.url()).toMatch(/#\/s\/(FMA\d+|PAIR-[a-z-]+|FJ\d+)/);
});

test('opens on the right structure from a pasted link', async ({ page }) => {
  // FMA7088 is the heart.
  await open(page, '/#/s/FMA7088?lang=ta');
  await showDetail(page);
  await expect(page.locator('#detail h2, [role=dialog] h2').last()).toHaveText('இதயம்');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ta');
});

test('downloads a system when a selection needs it', async ({ page }) => {
  // The nervous system is not in the default set. Before this was fixed,
  // selecting the brain showed a detail panel for an organ that had never
  // been downloaded and so was not on screen at all.
  const chunks: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/chunks/')) chunks.push(r.url().split('/').pop()!);
  });
  await open(page);
  expect(chunks.some((c) => c.includes('nervous'))).toBe(false);

  await page.getByRole('searchbox').fill('brain');
  await page.getByRole('option').first().click();
  await expect(page.locator('#detail h2')).toHaveText('Brain');
  await expect.poll(
    () => chunks.some((c) => c.includes('nervous')),
    { timeout: 60_000 },
  ).toBe(true);
});

test('turns on the rail entry for a system a selection pulled in', async ({ page }) => {
  await open(page);
  await page.getByRole('searchbox').fill('brain');
  await page.getByRole('option').first().click();
  await expect(page.locator('#detail h2, [role=dialog]').first()).toContainText('Brain');

  const railVisible = await page.locator('aside nav[aria-label]').isVisible().catch(() => false);
  if (!railVisible) {
    await page.getByRole('button', { name: /Systems|පද්ධති|தொகுதி/ }).first().click();
  }
  await expect(
    page.getByRole('button', { name: /Nervous system/ }).first(),
  ).toHaveAttribute('aria-pressed', 'true', { timeout: 60_000 });
});

test('files an organ under the system a reader would expect', async ({ page }) => {
  // The liver's segments are classified venous upstream, so a naive rule
  // labels the liver "Veins".
  await open(page);
  await page.getByRole('searchbox').fill('liver');
  await page.getByRole('option').first().click();
  await showDetail(page);
  await expect(page.locator('#detail, [role=dialog]').last()).toContainText('Digestion');
});

test('lists every body system, at every width', async ({ page }) => {
  await open(page);
  // Fifteen systems, each a separate download the reader chooses to make.
  // On a phone the list lives in a sheet raised from the bottom bar; on a
  // wide screen it is always on show. Both must reach all fifteen.
  const rail = page.locator('aside nav[aria-label], [role=dialog] nav[aria-label]');
  if (await rail.first().isVisible().catch(() => false)) {
    await expect(rail.first().getByRole('button')).toHaveCount(15);
    return;
  }
  await page.getByRole('button', { name: /Systems|පද්ධති|தொகுதி/ }).first().click();
  await expect(page.locator('[role=dialog] nav[aria-label]').getByRole('button')).toHaveCount(15);
});

test('never scrolls sideways, at any viewport', async ({ page }) => {
  await open(page);
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflows).toBe(false);
});
