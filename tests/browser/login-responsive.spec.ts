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
      viewportHeight: document.documentElement.clientHeight,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      loginPanelBottom: document.querySelector('.login-experience__panel')?.getBoundingClientRect().bottom ?? 0,
      dockTop: document.querySelector('.login-dock')?.getBoundingClientRect().top ?? 0,
      rootFontSize: getComputedStyle(document.documentElement).fontSize,
      employeeInputFontSize: getComputedStyle(document.querySelector('.login-form__input-wrap input')!).fontSize,
      employeeLabelFontSize: getComputedStyle(document.querySelector('.login-form__field > label')!).fontSize,
    }));
    expect(layout.documentWidth, 'document must not overflow horizontally').toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.bodyWidth, 'body must not overflow horizontally').toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.rootFontSize).toBe('16px');
    expect(layout.employeeInputFontSize).toBe('16px');
    expect(layout.employeeLabelFontSize).toBe('12px');
    if (viewport.name === 'short-landscape') {
      expect(layout.documentHeight, 'compact landscape Login must fit without vertical page overflow').toBeLessThanOrEqual(layout.viewportHeight + 1);
      expect(layout.loginPanelBottom + 8, 'Login panel must remain separated from the in-flow utility dock').toBeLessThanOrEqual(layout.dockTop);
    }
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
    await expect.poll(async () => page.locator('.login-form__focus-ripple').evaluate((element) => getComputedStyle(element).opacity)).toBe('1');

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

test('Login respects reduced-motion and power-conserve presentation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./', { waitUntil: 'networkidle' });

  const reducedMotion = await page.evaluate(() => {
    const panel = document.querySelector('.login-experience__panel')!;
    const glass = document.querySelector('.login-form__input-wrap')!;
    const durations = getComputedStyle(glass).transitionDuration.split(',').map((value) => {
      const duration = value.trim();
      return duration.endsWith('ms')
        ? Number.parseFloat(duration) / 1000
        : Number.parseFloat(duration);
    });
    return {
      preferenceActive: matchMedia('(prefers-reduced-motion: reduce)').matches,
      panelAnimation: getComputedStyle(panel).animationName,
      panelTransitionSeconds: Math.max(...durations),
    };
  });

  expect(reducedMotion.preferenceActive).toBe(true);
  expect(reducedMotion.panelAnimation).toBe('none');
  expect(reducedMotion.panelTransitionSeconds).toBeLessThanOrEqual(0.00001);

  const powerConserve = await page.evaluate(() => {
    document.documentElement.dataset.powerMode = 'conserve';
    const panel = document.querySelector('.login-experience__panel')!;
    const control = document.querySelector('.login-form__input-wrap')!;
    return {
      panelBackdrop: getComputedStyle(panel).backdropFilter,
      controlBackdrop: getComputedStyle(control).backdropFilter,
    };
  });

  expect(powerConserve.panelBackdrop).toBe('none');
  expect(powerConserve.controlBackdrop).toBe('none');
});
