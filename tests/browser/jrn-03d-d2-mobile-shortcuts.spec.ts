import { expect, test } from '@playwright/test';

const auditSession = {
  name: 'Trương Dương',
  employeeCode: '20286233',
  department: 'FMCG',
  departmentId: 'fmcg',
  signedInAt: '2026-01-01T00:00:00.000Z',
};

async function openStocktakeFromHome(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /^module$/i }).first().click();
  await page.getByRole('button', { name: /mở thư viện kiểm kê/i }).first().click({ force: true });
  await page.getByRole('button', { name: /^kiểm kê/i }).first().click();
  await expect(page.locator('.stocktake-page-shell')).toBeVisible();
}

test('JRN-03D-D2 provides independent global shortcuts on Mobile Feature Pages and preserves Home navigation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((session) => {
    localStorage.setItem('retailos.session.v2', JSON.stringify(session));
  }, auditSession);
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.home-main')).toBeVisible();

  await openStocktakeFromHome(page);
  const shortcuts = page.getByRole('navigation', { name: 'Lối tắt chức năng' });
  await expect(shortcuts).toBeVisible();
  await expect(shortcuts.getByRole('button', { name: 'Về trang chủ' })).toBeVisible();
  await expect(shortcuts.getByRole('button', { name: 'Mở thư viện nghiệp vụ' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Điều hướng kiểm kê' })).toHaveCount(0);
  await expect(page.locator('.mobile-shell-navigation .liquid-dock')).toHaveCount(0);

  // Open the Shell-owned Module Library from a Feature Page and launch another module.
  await shortcuts.getByRole('button', { name: 'Mở thư viện nghiệp vụ' }).click();
  const library = page.getByRole('dialog', { name: 'Chọn nhóm chức năng' });
  await expect(library).toBeVisible();
  await library.getByRole('button', { name: /kiểm kê/i }).first().click();
  await library.getByRole('button', { name: /^xuất file/i }).click();
  await expect(page.locator('.stocktake-import-page-shell')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Lối tắt chức năng' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Điều hướng xuất file kiểm kê' })).toHaveCount(0);

  // Home shortcut must respect the Journey controller and restore Home's own dock.
  await page.getByRole('navigation', { name: 'Lối tắt chức năng' })
    .getByRole('button', { name: 'Về trang chủ' }).click();
  await expect(page.locator('.home-main')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible();
  await expect(page.locator('.feature-mobile-shortcuts')).toHaveCount(0);

  expect(errors, 'Mobile shortcut flow must not throw browser errors').toEqual([]);
});
