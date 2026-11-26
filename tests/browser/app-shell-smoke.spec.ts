import { expect, test, type Page } from '@playwright/test';

const session = {
  name: 'Trương Dương',
  department: 'FMCG',
  departmentId: 'fmcg',
  signedInAt: '2026-01-01T00:00:00.000Z',
};

async function openHome(page: Page, extraStorage: Record<string, string> = {}) {
  await page.addInitScript((value) => {
    localStorage.setItem('retailos.session.v2', JSON.stringify(value.session));
    for (const [key, storedValue] of Object.entries(value.extraStorage)) {
      localStorage.setItem(key, storedValue);
    }
  }, { session, extraStorage });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.retailos-interface')).toBeVisible();
  await expect(page.locator('.retailos-experience')).toBeVisible();
  const viewport = page.viewportSize();
  if (viewport && viewport.width <= 700) {
    await expect(page.locator('.retailos-experience__mobile-footer')).toBeVisible();
    await page.locator('.retailos-experience__mobile-footer').getByRole('button', { name: 'Chức năng' }).click();
  } else {
    await expect(page.locator('.retailos-experience__rail')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Thư viện nghiệp vụ' })).toBeVisible();
    await page.getByRole('button', { name: 'Thư viện nghiệp vụ' }).click();
  }
  await expect(page.locator('#modules')).toBeInViewport();
  await expect(page.getByRole('heading', { name: 'Truy cập nghiệp vụ' })).toBeVisible();
  await expect(page.locator('.retailos-home__module')).toHaveCount(9);
  await expect(page.getByRole('button', { name: 'Thông báo' })).toBeVisible();
  await page.getByRole('button', { name: 'Thông báo' }).click();
  await expect(page.locator('#activity')).toBeInViewport();
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


test('Home module cards distinguish ready workflows from integrating modules', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHome(page);
  await expect(page.locator('.retailos-home__module-state.is-ready')).toHaveCount(2);
  await expect(page.locator('.retailos-home__module-state:not(.is-ready)')).toHaveCount(7);
  await page.getByRole('button', { name: /Tồn kho/ }).click();
  await expect(page.locator('.toast-message')).toContainText('giao diện nghiệp vụ đang được tích hợp');
});


test('greenfield module library searches and opens real registry groups', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHome(page);
  const library = page.locator('.retailos-library');
  await expect(library.getByRole('heading', { name: 'Thư viện nghiệp vụ' })).toBeVisible();
  await expect(library.locator('.retailos-library__card')).toHaveCount(5);
  await library.getByRole('textbox', { name: 'Tìm trong thư viện nghiệp vụ' }).fill('kiểm kê');
  await expect(library.locator('.retailos-library__card')).toHaveCount(1);
  await library.getByRole('button', { name: /Mở thư viện Kiểm kê/ }).click();
  const detail = page.getByRole('dialog', { name: 'Kiểm kê' });
  await expect(detail).toBeVisible();
  await expect(detail.locator('.retailos-library-detail__overview')).toContainText('2');
  await expect(detail.getByRole('button', { name: 'Kiểm kê. Đã triển khai' })).toBeVisible();
  await expect(detail.getByRole('button', { name: 'Xuất file. Đã triển khai' })).toBeVisible();
  await expect(detail.locator('.retailos-library-detail__footer')).toContainText('snapshot');

  await detail.getByRole('button', { name: 'Đóng thư viện' }).click();
  await expect(detail).toBeHidden();
  await expect(library.getByRole('button', { name: /Mở thư viện Kiểm kê/ })).toBeFocused();
});


test('Activity Center reports live signals without fabricating an event history', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHome(page);
  const activity = page.locator('#activity');
  await expect(activity.getByRole('heading', { name: 'Trung tâm hoạt động' })).toBeVisible();
  await expect(activity.getByText('LỊCH SỬ HOẠT ĐỘNG')).toBeVisible();
  await expect(activity.getByText('Chưa có nhật ký hoạt động tổng quát')).toBeVisible();
  await expect(activity.getByText(/chưa kết nối nguồn event log tập trung/i)).toBeVisible();
});


test('Settings Experience preserves Update Center and Scanner settings handoffs', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHome(page);
  await page.getByRole('button', { name: 'Cài đặt' }).click();

  const settings = page.getByRole('dialog', { name: 'Cài đặt' });
  await expect(settings).toBeVisible();
  await expect(settings.getByText('Kiểm soát trải nghiệm vận hành')).toBeVisible();
  await expect(settings.getByRole('button', { name: /Trung tâm cập nhật/ })).toBeVisible();

  await settings.getByRole('button', { name: /Trung tâm cập nhật/ }).click();
  const updateCenter = page.getByRole('dialog', { name: 'Trung tâm cập nhật' });
  await expect(updateCenter).toBeVisible();
  await updateCenter.getByRole('button', { name: 'Quay lại cài đặt' }).click();
  await expect(settings).toBeVisible();

  await settings.getByRole('button', { name: /Cài đặt máy quét/ }).click();
  await expect(page.getByRole('dialog', { name: 'Cài đặt máy quét' })).toBeVisible();
  await page.getByRole('button', { name: 'Quay lại cài đặt' }).click();
  await expect(page.getByRole('dialog', { name: 'Cài đặt' })).toBeVisible();
});


test('Experience shell exposes one main landmark and restores settings trigger focus', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHome(page);
  await expect(page.locator('main')).toHaveCount(1);

  const settingsTrigger = page.getByRole('button', { name: 'Cài đặt hệ thống' });
  await settingsTrigger.click();
  await expect(page.getByRole('dialog', { name: 'Cài đặt' })).toBeVisible();
  await page.getByRole('button', { name: 'Đóng cài đặt' }).click();
  await expect(settingsTrigger).toBeFocused();
});

test('Activity Center update signal opens Update Center directly', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const entry = {
    buildId: 'integration-test-build',
    version: '0.3.7',
    currentVersion: '0.3.6',
    title: 'Bản cập nhật tích hợp',
    summary: 'Kiểm tra đường dẫn từ Activity Center.',
    status: 'available',
    updatedAt: '2026-11-26T00:00:00.000Z',
    inCenter: true,
  };
  await openHome(page, { 'retailos.pwa.update-center.v1': JSON.stringify(entry) });

  const activity = page.locator('#activity');
  await expect(activity.getByRole('button', { name: /Bản cập nhật tích hợp/ })).toBeVisible();
  await activity.getByRole('button', { name: /Bản cập nhật tích hợp/ }).click();
  await expect(page.getByRole('dialog', { name: 'Trung tâm cập nhật' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Cài đặt' })).toHaveCount(0);
});
