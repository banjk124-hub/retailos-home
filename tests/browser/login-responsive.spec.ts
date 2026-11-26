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
    // Mobile form controls stay at 16px to prevent iOS Safari focus-zoom; desktop/tablet retain 15px.\n    expect(layout.inputFontSize).toBe(viewport.width <= 700 ? '16px' : '15px');
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
    const field = page.locator('.retail-login__field');
    // Wait for the CSS transition to reach its focused value before inspecting the style.
    await expect(field).toHaveCSS('border-color', 'rgb(155, 74, 83)');
    await expect(field).not.toHaveCSS('box-shadow', 'none');

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

test('Login normal-size text meets WCAG AA contrast in light and dark surfaces', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./', { waitUntil: 'networkidle' });
  await page.getByLabel('Mã nhân viên').fill('20286233');
  await expect(page.locator('.retail-login__employee small')).toBeVisible();

  const results = await page.evaluate(() => {
    const parse = (value: string) => {
      const channels = value.match(/[\\d.]+/g)?.map(Number) ?? [];
      return channels.slice(0, 3);
    };
    const luminance = (rgb: number[]) => {
      const linear = rgb.map((channel) => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };
    const hex = (value: string) => value.match(/[\\da-f]{2}/gi)!.map((part) => parseInt(part, 16));
    const ratio = (foreground: string, background: string) => {
      const bg = hex(background);
      const values = foreground.match(/[\\d.]+/g)?.map(Number) ?? [];
      const alpha = values.length > 3 ? values[3] : 1;
      const fg = values.slice(0, 3).map((channel, index) => channel * alpha + bg[index] * (1 - alpha));
      const [light, dark] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
      return Number(((light + 0.05) / (dark + 0.05)).toFixed(2));
    };
    const samples: Array<{ name: string; selector: string; pseudo?: string; background: string }> = [
      { name: 'access description', selector: '.retail-login__access-heading p', background: '#f2ece6' },
      { name: 'access overline', selector: '.retail-login__access .retail-login__overline', background: '#f2ece6' },
      { name: 'employee hint', selector: '.retail-login__hint', background: '#f2ece6' },
      { name: 'employee department', selector: '.retail-login__employee small', background: '#fffefa' },
      { name: 'security note', selector: '.retail-login__security', background: '#f2ece6' },
      { name: 'footer metadata', selector: '.retail-login__footer', background: '#f2ece6' },
      { name: 'input placeholder', selector: '#retail-employee-code', pseudo: '::placeholder', background: '#fffefa' },
      { name: 'story edition', selector: '.retail-login__edition', background: '#741f30' },
      { name: 'story signal', selector: '.retail-login__signal small', background: '#741f30' },
      { name: 'story description', selector: '.retail-login__story-copy p', background: '#741f30' },
    ];
    return samples.map((sample) => {
      const element = document.querySelector(sample.selector)!;
      const color = getComputedStyle(element, sample.pseudo).color;
      return { name: sample.name, contrast: ratio(color, sample.background) };
    });
  });

  expect(results.filter((item) => item.contrast < 4.5)).toEqual([]);
});
