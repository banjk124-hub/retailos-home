import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 900, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'compact-mobile', width: 360, height: 740 },
  { name: 'short-landscape', width: 844, height: 390 },
];

for (const viewport of viewports) {
  test(`Login renders and remains usable at ${viewport.name}`, async ({ page }, testInfo) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('./', { waitUntil: 'networkidle' });

    const login = page.locator('main.login-experience');
    const form = page.locator('form.login-form');
    const employeeCode = page.getByLabel('Mã nhân viên');
    const submit = page.getByRole('button', { name: /Đăng nhập/ });

    await expect(login).toBeVisible();
    await expect(page.locator('.login-hero')).toBeVisible();
    await expect(form).toBeVisible();
    await expect(employeeCode).toBeVisible();
    await expect(submit).toBeVisible();

    const layout = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    expect(layout.documentWidth, 'document must not overflow horizontally').toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.bodyWidth, 'body must not overflow horizontally').toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(pageErrors, 'application must not throw uncaught page errors').toEqual([]);

    await page.screenshot({
      path: testInfo.outputPath(`login-${viewport.name}.png`),
      fullPage: true,
      animations: 'disabled',
    });

    await page.keyboard.press('Tab');
    await expect(employeeCode).toBeFocused();
    const glassFocus = await page.locator('.login-form__input-wrap').evaluate((element) => ({
      boxShadow: getComputedStyle(element).boxShadow,
      rippleOpacity: getComputedStyle(element.querySelector('.login-form__focus-ripple')!).opacity,
    }));
    expect(glassFocus.boxShadow).not.toBe('none');
    expect(glassFocus.rippleOpacity).toBe('1');

    await employeeCode.fill('0');
    await page.keyboard.press('Tab');
    await expect(submit).toBeFocused();
    const focusStyle = await submit.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        outlineWidth: style.outlineWidth,
        outlineStyle: style.outlineStyle,
        outlineOffset: style.outlineOffset,
        boxShadow: style.boxShadow,
      };
    });
    expect(focusStyle.outlineWidth).toBe('3px');
    expect(focusStyle.outlineStyle).toBe('solid');
    expect(focusStyle.outlineOffset).toBe('3px');
    expect(focusStyle.boxShadow).not.toBe('none');
  });
}
