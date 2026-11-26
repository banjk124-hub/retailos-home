import { expect, test, type Page } from '@playwright/test';

const session = {
  name: 'Trương Dương',
  department: 'FMCG',
  departmentId: 'fmcg',
  signedInAt: '2026-01-01T00:00:00.000Z',
};

async function openHome(page: Page) {
  await page.addInitScript((value) => {
    localStorage.setItem('retailos.session.v2', JSON.stringify(value));
  }, session);
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.retailos-interface')).toBeVisible();
  await expect(page.locator('.retailos-experience')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Điều hướng RetailOS' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Thư viện nghiệp vụ' })).toBeVisible();
  await page.getByRole('button', { name: 'Thư viện nghiệp vụ' }).click();
  await expect(page.locator('#modules')).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Thông báo' })).toBeVisible();
}

test('authenticated Home opens without runtime errors or horizontal overflow', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await openHome(page);
    const width = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    expect(width.document).toBeLessThanOrEqual(width.viewport + 1);
    expect(width.body).toBeLessThanOrEqual(width.viewport + 1);
    await page.evaluate(() => localStorage.removeItem('retailos.session.v2'));
  }

  expect(errors).toEqual([]);
});
