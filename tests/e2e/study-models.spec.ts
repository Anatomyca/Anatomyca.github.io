import { expect, test, type Page } from '@playwright/test';

/**
 * The anatomist-reviewed study models.
 *
 * These are the Grade A half of the atlas: unlike the whole body, every
 * structure in them has been checked by a subject-expert anatomist, which is
 * what makes them usable for revision rather than orientation.
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

/** The picker is a side pane on wide screens, a sheet on phones. */
async function showPicker(page: Page) {
  const pane = page.locator('aside').first();
  if (await pane.isVisible().catch(() => false)) return;
  await page.getByRole('button', { name: /Models|ආකෘති|மாதிரி/ }).first().click();
}

const MODEL = (name: RegExp) =>
  (page: Page) => page.getByRole('button', { name }).first();

test('offers the whole body and the reviewed models, each with its grade', async ({ page }) => {
  await open(page);
  await showPicker(page);
  // The grade is the reason to choose between them, so it is on every card.
  await expect(MODEL(/Whole body/)(page)).toContainText('Accuracy B');
  await expect(MODEL(/Skeleton.*Accuracy A/s)(page)).toBeVisible();
});

test('loads the reviewed skeleton and lists every named bone', async ({ page }) => {
  await open(page);
  await showPicker(page);
  await MODEL(/Skeleton.*Accuracy A/s)(page).click();
  // 144 individually named bones, which is the point of the model.
  await expect
    .poll(async () => page.locator('aside nav button, [role=dialog] nav button').count(),
      { timeout: 90_000 })
    .toBeGreaterThan(100);
});

test('reports Grade A for a structure inside a reviewed model', async ({ page }) => {
  await open(page);
  await showPicker(page);
  await MODEL(/Skeleton.*Accuracy A/s)(page).click();
  await page.getByRole('searchbox').fill('atlas');
  await expect(page.getByRole('option').first()).toBeVisible({ timeout: 90_000 });
  await page.getByRole('option').first().click();

  const detail = page.locator('#detail, [role=dialog]').last();
  await expect(detail).toContainText('Atlas (C1)');
  await expect(detail).toContainText('Accuracy A');
});

test('search follows the active model rather than the body', async ({ page }) => {
  await open(page);
  await showPicker(page);
  await MODEL(/Skull, exploded/)(page).click();
  await page.waitForTimeout(3000);
  // The skull holds no pancreas, and offering one would be a dead end.
  await page.getByRole('searchbox').fill('pancreas');
  await expect(page.getByText(/Nothing by that name/)).toBeVisible();
  await page.getByRole('searchbox').fill('mandible');
  await expect(page.getByRole('option').first()).toBeVisible();
});

test('returns to the whole body', async ({ page }) => {
  await open(page);
  await showPicker(page);
  await MODEL(/Vertebrae compared/)(page).click();
  await page.waitForTimeout(2500);
  await MODEL(/Whole body/)(page).click();
  await page.waitForTimeout(2500);
  // Systems come back, because they belong to the body and not to a model.
  await expect(page.getByRole('button', { name: /Skeleton\s*296|අස්ථි පද්ධතිය/ }).first())
    .toBeVisible();
});
