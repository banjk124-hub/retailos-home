import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

for (const viewport of viewports) {
  test(`Login is usable on ${viewport.name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('./');

    const login = page.locator('main.retail-login');
    const employeeCode = page.getByLabel('Mã nhân viên');
    const submit = page.getByRole('button', { name: /Vào không gian làm việc/ });

    await expect(login).toBeVisible();
    await expect(employeeCode).toBeVisible();
    await expect(submit).toBeVisible();

    const width = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    expect(width.document).toBeLessThanOrEqual(width.viewport + 1);
    expect(width.body).toBeLessThanOrEqual(width.viewport + 1);

    await page.keyboard.press('Tab');
    await expect(employeeCode).toBeFocused();
    await employeeCode.fill('0');
    await page.keyboard.press('Tab');
    await expect(submit).toBeFocused();
    expect(errors).toEqual([]);
  });
}

test('Login respects reduced-motion preference', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');

  const field = page.locator('.retail-login__field');
  const submit = page.locator('.retail-login__submit');
  await expect(field).toBeVisible();
  await expect(submit).toBeVisible();

  const durations = await page.evaluate(() =>
    ['.retail-login__field', '.retail-login__submit'].flatMap((selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) return [];
      return getComputedStyle(element).transitionDuration.split(',').map((value) => {
        const duration = value.trim();
        return duration.endsWith('ms') ? Number.parseFloat(duration) : Number.parseFloat(duration) * 1000;
      });
    }),
  );

  expect(matchMedia).toBeDefined();
  expect(Math.max(...durations)).toBeLessThanOrEqual(0.01);
});
