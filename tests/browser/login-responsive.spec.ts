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

    const login = page.locator('main.retail-login');
    const story = page.locator('.retail-login__story');
    const access = page.locator('.retail-login__access');
    const form = page.locator('form.retail-login__form');
    const employeeCode = page.getByLabel('Mã nhân viên');
    const submit = page.getByRole('button', { name: /Vào không gian làm việc/ });

    await expect(login).toBeVisible();
    await expect(story).toBeVisible();
    await expect(access).toBeVisible();
    await expect(form).toBeVisible();
    await expect(employeeCode).toBeVisible();
    await expect(submit).toBeVisible();

    const layout = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: document.documentElement.clientHeight,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      inputFontSize: getComputedStyle(document.querySelector<HTMLInputElement>('#retail-employee-code')!).fontSize,
      labelFontSize: getComputedStyle(document.querySelector('.retail-login__form > label')!).fontSize,
      storyWidth: document.querySelector('.retail-login__story')!.getBoundingClientRect().width,
      accessWidth: document.querySelector('.retail-login__access')!.getBoundingClientRect().width,
    }));
    expect(layout.documentWidth, 'document must not overflow horizontally').toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.bodyWidth, 'body must not overflow horizontally').toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.inputFontSize).toBe('15px');
    expect(layout.labelFontSize).toBe('12px');
    expect(layout.storyWidth).toBeGreaterThan(0);
    expect(layout.accessWidth).toBeGreaterThan(0);
    if (viewport.name === 'short-landscape') {
      await expect(employeeCode).toBeInViewport();
      await expect(submit).toBeInViewport();
    }
    expect(pageErrors, 'application must not throw uncaught page errors').toEqual([]);

    await page.screenshot({
      path: testInfo.outputPath(`login-${viewport.name}.png`),
      fullPage: true,
      animations: 'disabled',
    });

    await page.keyboard.press('Tab');
    await expect(employeeCode).toBeFocused();
    const focusStyle = await page.locator('.retail-login__field').evaluate((element) => ({
      borderColor: getComputedStyle(element).borderColor,
      boxShadow: getComputedStyle(element).boxShadow,
    }));
    expect(focusStyle.borderColor).not.toBe('rgb(222, 212, 205)');
    expect(focusStyle.boxShadow).not.toBe('none');

    await employeeCode.fill('0');
    await page.keyboard.press('Tab');
    await expect(submit).toBeFocused();
    await expect(submit).toBeEnabled();
  });
}

test('Login respects reduced-motion and power-conserve presentation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./', { waitUntil: 'networkidle' });

  const reducedMotion = await page.evaluate(() => {
    const field = document.querySelector('.retail-login__field')!;
    const submit = document.querySelector('.retail-login__submit')!;
    const durations = [field, submit].flatMap((element) =>
      getComputedStyle(element).transitionDuration.split(',').map((value) => {
        const duration = value.trim();
        return duration.endsWith('ms')
          ? Number.parseFloat(duration) / 1000
          : Number.parseFloat(duration);
      }),
    );
    return {
      preferenceActive: matchMedia('(prefers-reduced-motion: reduce)').matches,
      fieldAnimation: getComputedStyle(field).animationName,
      maxTransitionSeconds: Math.max(...durations),
    };
  });

  expect(reducedMotion.preferenceActive).toBe(true);
  expect(reducedMotion.maxTransitionSeconds).toBeLessThanOrEqual(0.00001);
  expect(reducedMotion.fieldAnimation).toBe('none');

  const powerConserve = await page.evaluate(() => {
    document.documentElement.dataset.powerMode = 'conserve';
    const story = document.querySelector('.retail-login__story')!;
    const field = document.querySelector('.retail-login__field')!;
    return {
      storyBackdrop: getComputedStyle(story).backdropFilter,
      fieldBackdrop: getComputedStyle(field).backdropFilter,
      storyBackground: getComputedStyle(story).backgroundImage,
    };
  });

  expect(powerConserve.storyBackdrop).toBe('none');
  expect(powerConserve.fieldBackdrop).toBe('none');
  expect(powerConserve.storyBackground).not.toBe('none');
});
