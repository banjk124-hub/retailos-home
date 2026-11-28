import { expect, test } from '@playwright/test';

const auditSession = {
  name: 'Trương Dương',
  employeeCode: '20286233',
  department: 'FMCG',
  departmentId: 'fmcg',
  signedInAt: '2026-01-01T00:00:00.000Z',
};

test('Stocktake presentation preserves zone, duplicate-entry, review, export and history workflows', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((session) => {
    localStorage.setItem('retailos.session.v2', JSON.stringify(session));
  }, auditSession);

  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.retailos-interface')).toBeVisible();

  const moduleNav = page.getByRole('button', { name: /^module$/i }).first();
  await expect(moduleNav).toBeVisible();
  await moduleNav.click();

  const library = page.getByRole('button', { name: /mở thư viện kiểm kê/i }).first();
  await expect(library).toBeVisible();
  await library.click();

  const stocktakeEntry = page.getByRole('button', { name: /^kiểm kê/i }).first();
  await expect(stocktakeEntry).toBeVisible();
  await stocktakeEntry.click();

  const panel = page.locator('.stocktake-panel');
  await expect(panel).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Điều hướng kiểm kê' })).toBeVisible();
  await expect(page.locator('.stocktake-backdrop')).toHaveCSS('position', 'relative');
  await expect(panel).not.toHaveAttribute('role', 'dialog');
  await expect(page.getByRole('heading', { name: 'Kiểm kê' })).toBeVisible();

  await page.locator('#stocktake-zone').fill('AT99');
  await page.getByRole('button', { name: /Bắt đầu vùng/ }).click();
  await expect(page.getByText('VÙNG ĐANG KIỂM KÊ')).toBeVisible();

  const barcodeInput = page.locator('#stocktake-barcode');
  const quantityInput = page.locator('#stocktake-quantity');
  const addEntry = async () => {
    await barcodeInput.fill('TEST-DUPLICATE-01');
    await quantityInput.fill('1');
    await page.getByRole('button', { name: 'Lưu số lượng' }).click();
    await expect(barcodeInput).toHaveValue('');
  };

  await addEntry();
  await addEntry();
  await expect(page.locator('.stocktake-recent-entry')).toHaveCount(2);

  await page.getByRole('button', { name: /Kiểm tra và xuất vùng/ }).click();
  await expect(page.getByRole('heading', { name: 'Kiểm tra dữ liệu' })).toBeVisible();
  await expect(page.locator('.stocktake-review-row')).toHaveCount(2);
  await expect(page.getByText('Barcode trùng nhau được giữ nguyên thành các dòng riêng.')).toBeVisible();

  const dialogAccepted = new Promise<void>((resolve) => {
    page.once('dialog', async (dialog) => {
      await dialog.accept();
      resolve();
    });
  });
  const downloadReady = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xác nhận xuất file' }).click();
  await dialogAccepted;
  const download = await downloadReady;
  expect(download.suggestedFilename()).toMatch(/^AT99/);

  await expect(page.getByRole('heading', { name: 'Kiểm kê' })).toBeVisible();
  await expect(page.getByText('Đã xuất', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /File đã xuất/ }).click();
  await expect(page.getByRole('heading', { name: 'File đã xuất' })).toBeVisible();
  await expect(page.getByText(/AT99.*\.txt/)).toBeVisible();

  await page.getByRole('button', { name: 'Quay lại' }).click();
  await page.getByRole('button', { name: 'Lịch sử thao tác' }).click();
  await expect(page.getByRole('heading', { name: 'Lịch sử kiểm kê' })).toBeVisible();
  await expect(page.getByText('Xuất file vùng')).toBeVisible();

  const layout = await panel.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    clientHeight: node.clientHeight,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);

  await page.setViewportSize({ width: 1440, height: 900 });
  const desktopBounds = await panel.boundingBox();
  expect(desktopBounds).not.toBeNull();
  expect(desktopBounds!.width).toBeLessThanOrEqual(922);
  expect(desktopBounds!.x).toBeGreaterThanOrEqual(0);
  expect(desktopBounds!.x + desktopBounds!.width).toBeLessThanOrEqual(1441);
});


test('Stocktake Page exit guard protects unfinished input and restores Home return context', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((session) => {
    localStorage.setItem('retailos.session.v2', JSON.stringify(session));
  }, auditSession);

  await page.goto('./', { waitUntil: 'domcontentloaded' });
  const moduleNav = page.getByRole('button', { name: /^module$/i }).first();
  await moduleNav.click();

  const search = page.getByRole('textbox', { name: 'Tìm công cụ' });
  await search.fill('Kiểm kê');
  await page.getByRole('button', { name: /mở thư viện kiểm kê/i }).first().click();
  await page.getByRole('button', { name: /^kiểm kê/i }).first().click();

  await expect(page.getByRole('navigation', { name: 'Điều hướng kiểm kê' })).toBeVisible();
  await page.locator('#stocktake-zone').fill('AT01');
  const homeDock = page.getByRole('button', { name: 'Trang chủ' }).first();

  const dismissed = new Promise<void>((resolve) => {
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      await dialog.dismiss();
      resolve();
    });
  });
  await homeDock.click();
  await dismissed;
  await expect(page.locator('.stocktake-page-shell')).toBeVisible();
  await expect(page.locator('#stocktake-zone')).toHaveValue('AT01');

  const accepted = new Promise<void>((resolve) => {
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
      resolve();
    });
  });
  await homeDock.click();
  await accepted;

  await expect(page.locator('.stocktake-page-shell')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Tìm công cụ' })).toHaveValue('Kiểm kê');
  await expect(page.locator('.mobile-shell-navigation')).toBeVisible();
});
