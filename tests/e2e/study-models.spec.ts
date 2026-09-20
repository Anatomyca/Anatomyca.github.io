import { expect, test, type Page } from '@playwright/test';

/**
 * The study models: individual models a reader opens instead of the body.
 *
 * They do not share a grade. The Open3Dmodel ones were checked structure by
 * structure by anatomists; the community ones are artists' work nobody has
 * checked. Several of these tests exist to keep the second from ever being
 * presented as the first.
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

/** The system list is a rail on wide screens, a dock sheet on phones. */
async function showSystems(page: Page) {
  const rail = page.getByRole('button', { name: /Skeleton\s*296|අස්ථි පද්ධතිය/ }).first();
  if (await rail.isVisible().catch(() => false)) return;
  await page.getByRole('button', { name: /^(Systems|පද්ධති|தொகுதி(கள்)?)$/ }).first().click();
}

/**
 * Detail and credits land in the side pane on wide screens and in a sheet on
 * phones — and the pane stays in the DOM while hidden, so match on what is
 * visible rather than on document order.
 */
const panelOf = (page: Page) =>
  page.locator('#detail:visible, [role=dialog]:visible').first();

/**
 * After a model is chosen, its parts are in the rail on wide screens but in
 * the dock's own sheet on phones — where the model picker stays open over
 * them, so the part is not reachable until that sheet is raised.
 */
async function showParts(page: Page, part: string) {
  const target = page.getByRole('button', { name: part }).first();
  if (await target.isVisible().catch(() => false)) return;
  await page.getByRole('button', { name: /^(Systems|පද්ධති|தொகுதி(கள்)?)$/ }).first().click();
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

  const detail = panelOf(page);
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
  await showSystems(page);
  await expect(page.getByRole('button', { name: /Skeleton\s*296|අස්ථි පද්ධතිය/ }).first())
    .toBeVisible();
});

test('shows the credits the licences require, in the interface', async ({ page }) => {
  // CC BY and CC BY-SA require attribution to be conveyed to the people the
  // work reaches. A file in the repository does not reach them; this does.
  await open(page);
  const aboutButton = page.getByRole('button', { name: /^(About|පිළිබඳව|பற்றி|Credits|ස්තුති|நன்றி)$/ });
  await aboutButton.first().click();

  const panel = panelOf(page);
  await expect(panel).toContainText(
    'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International',
  );
  await expect(panel).toContainText('Open3Dmodel');
  await expect(panel).toContainText('Leiden');
  await expect(panel).toContainText('CC-BY-SA-4.0');
  // And the disclaimer, which a medical student needs to have seen.
  await expect(panel).toContainText(/not a diagnostic/i);
});

test('credits each reviewed model where the student is reading it', async ({ page }) => {
  // The pack notice alone does not tell a student who checked the model in
  // front of them, and a Grade A badge is a claim about human review.
  await open(page);
  await page.getByRole('button', { name: /^(About|පිළිබඳව|பற்றி|Credits|ස්තුති|நன்றி)$/ }).first().click();

  const panel = panelOf(page);
  await expect(panel).toContainText(/Reviewed models|සමාලෝචනය කළ ආකෘති|மதிப்பாய்வு செய்யப்பட்ட மாதிரிகள்/);
  await expect(panel).toContainText(/(Grade|ශ්‍රේණිය|தரம்)\s*A/);
  await expect(panel).toContainText(/Reviewed by|සමාලෝචනය කළේ|மதிப்பாய்வு செய்தவர்/);
  await expect(panel).toContainText('144');
});

test('never reports a community model as anatomist-reviewed', async ({ page }) => {
  // The detail panel used to hardcode Grade A and Open3Dmodel for every study
  // model, so an artist's lung claimed a review no one had done. That is the
  // one claim this atlas must never make.
  await open(page);
  await showPicker(page);
  await MODEL(/Lungs/)(page).click();
  await page.waitForTimeout(3500);
  await showParts(page, 'Lung, part 1');
  await page.getByRole('button', { name: 'Lung, part 1' }).first().click();

  const detail = panelOf(page);
  await expect(detail).toContainText(/(Accuracy|නිරවද්‍යතාව|துல்லியம்)\s*C/);
  await expect(detail).toContainText('Sketchfab');
  await expect(detail).not.toContainText('Open3Dmodel');
});
