import { expect, test } from '@playwright/test';

const auditSession = {
  name: 'Trương Dương',
  employeeCode: '20286233',
  department: 'FMCG',
  departmentId: 'fmcg',
  signedInAt: '2026-01-01T00:00:00.000Z',
};

async function openStocktakeFromHome(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /^thư viện$/i }).first().click();
  const library = page.getByRole('button', { name: /mở thư viện kiểm kê/i }).first();
  await expect(library).toBeVisible();
  await library.click({ force: true });
  const launch = page.getByRole('button', { name: /^kiểm kê/i }).first();
  await expect(launch).toBeVisible();
  // The launcher captures HomeReturnContext at dispatch time. Read the actual
  // scroll position immediately before that action, not before Home navigation.
  const homeScrollY = await page.evaluate(() => window.scrollY);
  await launch.click();
  await expect(page.locator('.stocktake-page-shell')).toBeVisible();
  const navigation = page.getByRole('navigation', { name: 'Điều hướng kiểm kê' });
  await expect(navigation).toBeVisible();
  return { navigation, homeScrollY };
}

async function openImportFromHome(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /^thư viện$/i }).first().click();
  const library = page.getByRole('button', { name: /mở thư viện kiểm kê/i }).first();
  await expect(library).toBeVisible();
  await library.click({ force: true });
  const launch = page.getByRole('button', { name: /^xuất file/i }).first();
  await expect(launch).toBeVisible();
  const homeScrollY = await page.evaluate(() => window.scrollY);
  await launch.click();
  await expect(page.locator('.stocktake-import-page-shell')).toBeVisible();
  const navigation = page.getByRole('navigation', { name: 'Điều hướng xuất file kiểm kê' });
  await expect(navigation).toBeVisible();
  return { navigation, homeScrollY };
}

async function expectHomeRestored(page: import('@playwright/test').Page, expectedScrollY: number) {
  await expect(page.locator('.stocktake-page-shell, .stocktake-import-page-shell')).toHaveCount(0);
  await expect(page.locator('.home-main')).toBeVisible();
  await expect(page.getByRole('button', { name: /^thư viện$/i }).first()).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Tìm công cụ' })).toHaveValue('Kiểm kê');
  await expect.poll(async () => Math.abs(await page.evaluate(() => window.scrollY) - expectedScrollY)).toBeLessThanOrEqual(3);
}

test('JRN-03D-C integrates Home, Stocktake, Import, Shell owner handoff and persisted Stocktake recovery', async ({ page }) => {
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(
    request.url() + ' :: ' + (request.failure()?.errorText || 'failed'),
  ));

  // Short desktop height creates a real document scroll range so the test can
  // exercise HomeReturnContext restoration instead of assuming a 900px viewport scrolls.
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.addInitScript((session) => {
    localStorage.setItem('retailos.session.v2', JSON.stringify(session));
  }, auditSession);
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.retailos-interface')).toBeVisible();

  // Capture a non-default Home section and search state before the first Page push.
  await page.getByRole('button', { name: /^thư viện$/i }).first().click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  const homeSearch = page.getByRole('textbox', { name: 'Tìm công cụ' });
  await expect(homeSearch).toBeVisible();
  await homeSearch.fill('Kiểm kê');

  // Home -> Stocktake. Create feature-owned data, leave safely, then remount and recover it.
  const firstStocktake = await openStocktakeFromHome(page);
  await page.locator('#stocktake-zone').fill('AT77');
  await page.getByRole('button', { name: 'Bắt đầu vùng' }).click();
  await expect(page.getByRole('heading', { name: 'Quét hàng hóa' })).toBeVisible();
  await page.locator('#stocktake-barcode').fill('8936000000777');
  await page.locator('#stocktake-quantity').fill('2');
  await page.getByRole('button', { name: 'Lưu số lượng' }).click();
  await expect(page.locator('.stocktake-recent-entry')).toContainText('8936000000777');

  await firstStocktake.navigation.getByRole('button', { name: 'Trang chủ' }).click();
  await expectHomeRestored(page, firstStocktake.homeScrollY);
  await expect(page.getByRole('navigation', { name: 'Điều hướng kiểm kê' })).toHaveCount(0);

  // Re-enter Stocktake: the Page remount must recover the zone and row from its own store.
  const secondStocktake = await openStocktakeFromHome(page);
  await expect(page.getByRole('button', { name: /^AT77\b/ })).toBeVisible();
  await page.getByRole('button', { name: /^AT77\b/ }).click();
  await expect(page.getByRole('heading', { name: 'Quét hàng hóa' })).toBeVisible();
  await expect(page.locator('.stocktake-recent-entry')).toContainText('8936000000777');
  await expect(secondStocktake.navigation).toBeVisible();

  // Stocktake -> Home -> Import. The Shell must replace, not retain, Page-owned navigation.
  await secondStocktake.navigation.getByRole('button', { name: 'Trang chủ' }).click();
  await expectHomeRestored(page, secondStocktake.homeScrollY);
  const importPage = await openImportFromHome(page);
  await expect(page.getByRole('navigation', { name: 'Điều hướng kiểm kê' })).toHaveCount(0);
  await expect(importPage.navigation.getByRole('button', { name: 'Xuất file' })).toBeVisible();
  await expect(importPage.navigation.getByRole('button', { name: 'Trang chủ' })).toBeVisible();

  // Import -> Home: the final owner cleanup must restore Home navigation without stale callbacks.
  await importPage.navigation.getByRole('button', { name: 'Trang chủ' }).click();
  await expectHomeRestored(page, importPage.homeScrollY);
  await expect(page.getByRole('navigation', { name: 'Điều hướng xuất file kiểm kê' })).toHaveCount(0);
  await expect(page.locator('.desktop-shell-navigation')).toBeVisible();

  expect(pageErrors, 'cross-Page flow must not throw browser errors').toEqual([]);
  expect(failedRequests, 'cross-Page flow must not fail resource requests').toEqual([]);
});

test('Desktop Home Library anchor keeps Home scroll behavior; feature Pages retain Library flyout; Dock spans viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.addInitScript((session) => {
    localStorage.setItem('retailos.session.v2', JSON.stringify(session));
  }, auditSession);
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.home-main')).toBeVisible();

  const dock = page.getByRole('navigation', { name: 'Điều hướng chính' });
  await expect(dock).toBeVisible();
  const bounds = await dock.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBe(0);
  expect(bounds!.y).toBe(0);
  expect(bounds!.height).toBeGreaterThanOrEqual(799);

  const moduleButton = dock.getByRole('button', { name: 'Thư viện' });
  await expect(moduleButton).toBeVisible();
  await expect(dock.getByRole('button', { name: 'Mở thư viện nghiệp vụ' })).toHaveCount(0);
  await moduleButton.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  await expect(page.locator('#modules')).toBeVisible();
});
