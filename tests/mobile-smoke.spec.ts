import { test, expect, Page } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL || 'demo@example.com';
const PASSWORD = process.env.E2E_PASSWORD || 'demo123';
const TABS = ['Dashboard', 'Forecast', 'Insights|Recommendation', 'Transactions', 'Budget', 'Setup'];

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForSelector('text=Daily breakdown', { timeout: 30_000 });
}

/** Any element wider than the viewport that is not inside a horizontal scroller. */
async function overflowingElements(page: Page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const scrollers = new Set<Element>();
    document.querySelectorAll('*').forEach((el) => {
      const style = getComputedStyle(el);
      if (['auto', 'scroll'].includes(style.overflowX)) scrollers.add(el);
    });
    const insideScroller = (el: Element) => {
      let node: Element | null = el.parentElement;
      while (node) {
        if (scrollers.has(node)) return true;
        node = node.parentElement;
      }
      return false;
    };
    return Array.from(document.body.querySelectorAll('*'))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.right > vw + 1 && !insideScroller(el);
      })
      .slice(0, 10)
      .map((el) => `${el.tagName.toLowerCase()}.${(el as HTMLElement).className || ''}`);
  });
}

test('every tab fits the screen width', async ({ page }) => {
  await login(page);

  for (const tab of TABS) {
    await page.getByRole('tab', { name: new RegExp(`^(${tab})$`) }).click();
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `${tab}: page scrollWidth`).toBeLessThanOrEqual(
      await page.evaluate(() => window.innerWidth)
    );
    expect(await overflowingElements(page), `${tab}: elements wider than the viewport`).toEqual([]);
  }
});

test('form controls never trigger mobile zoom', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'iOS zoom only applies to touch devices');
  await login(page);
  await page.getByRole('tab', { name: 'Setup' }).click();
  await page.waitForSelector('#account-startingBalance');
  const smallInputs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input:not([type=checkbox]):not([type=file]), select, textarea'))
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
      .map((el) => (el as HTMLElement).outerHTML.slice(0, 80))
  );
  expect(smallInputs).toEqual([]);
});

test('one-tap confirm records the forecast amount', async ({ page }) => {
  await login(page);
  const quick = page.getByRole('button', { name: /^Confirm .* for \$/ }).first();
  await quick.click();
  const actual = page.getByRole('button', { name: /^Edit (?!and confirm)/ }).first();
  await expect(actual).toBeVisible({ timeout: 15_000 });
  await actual.click();
  await page.getByRole('button', { name: 'Delete this transaction' }).click();
  await page.getByRole('button', { name: 'Yes, Delete' }).click();
  await expect(page.getByRole('heading', { name: 'Edit Actual Transaction' })).toBeHidden({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /^Edit (?!and confirm)/ })).toHaveCount(0);
});

test('confirming a forecast transaction works and can be undone', async ({ page, isMobile }) => {
  await login(page);

  // Tapping the row body opens the dialog; the check button beside it confirms in one tap
  const chip = page.getByRole('button', { name: /^Edit and confirm/ }).first();
  await chip.click();
  await expect(page.getByRole('heading', { name: 'Confirm transaction' })).toBeVisible();

  // On touch devices nothing should be auto-focused (no keyboard or date picker popping up)
  const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
  if (isMobile) {
    expect(focusedTag).not.toBe('INPUT');
  } else {
    expect(focusedTag).toBe('INPUT');
  }

  // Dialog must fit within the viewport (wait for the open animation to finish first)
  await page.locator('.dialog-content').evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  const box = await page.locator('.dialog-content').boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);

  await page.getByRole('button', { name: 'Confirm transaction' }).click();
  const actual = page.getByRole('button', { name: /^Edit (?!and confirm)/ }).first();
  await expect(actual).toBeVisible({ timeout: 15_000 });

  // Undo through the edit dialog so the test leaves the data as it found it
  await actual.click();
  await expect(page.getByRole('heading', { name: 'Edit Actual Transaction' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete this transaction' }).click();
  await page.getByRole('button', { name: 'Yes, Delete' }).click();
  await expect(page.getByRole('heading', { name: 'Edit Actual Transaction' })).toBeHidden({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /^Edit (?!and confirm)/ })).toHaveCount(0);
});
