import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const auditSession = {
  name: 'Trương Dương',
  department: 'FMCG',
  departmentId: 'fmcg',
  signedInAt: '2026-01-01T00:00:00.000Z',
};

async function seedSession(page: Page) {
  await page.addInitScript((session) => {
    localStorage.setItem('retailos.session.v2', JSON.stringify(session));
  }, auditSession);
}

async function emulateMobilePlatform(page: Page, screenWidth: number, screenHeight: number) {
  await page.addInitScript(({ screenWidth, screenHeight }) => {
    const originalMatchMedia = window.matchMedia.bind(window);
    const forcedMatches: Record<string, boolean> = {
      '(pointer: fine)': false,
      '(hover: hover)': false,
      '(pointer: coarse)': true,
    };
    window.matchMedia = ((query: string) => {
      const media = originalMatchMedia(query);
      if (!(query in forcedMatches)) return media;
      return new Proxy(media, {
        get(target, property) {
          if (property === 'matches') return forcedMatches[query];
          const value = Reflect.get(target, property, target);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      }) as MediaQueryList;
    }) as typeof window.matchMedia;
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      get: () => 5,
    });
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      get: () => 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
    });
    Object.defineProperty(window.screen, 'width', { configurable: true, get: () => screenWidth });
    Object.defineProperty(window.screen, 'height', { configurable: true, get: () => screenHeight });
  }, { screenWidth, screenHeight });
}

async function openHome(page: Page, reducedMotion = false) {
  await page.setViewportSize({ width: 390, height: 844 });
  await emulateMobilePlatform(page, 390, 844);
  if (reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedSession(page);
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.retailos-interface')).toBeVisible();
  await expect(page.locator('[data-retailos-platform="mobile"]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Đăng xuất' })).toBeVisible();
}

async function keyboardFocus(page: Page, target: Locator, label: string) {
  await target.scrollIntoViewIfNeeded();
  await target.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(target, label + ' receives keyboard focus').toBeFocused();

  const evidence = await target.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute('role'),
      ariaLabel: element.getAttribute('aria-label'),
      className: typeof element.className === 'string' ? element.className : '',
      focusVisible: element.matches(':focus-visible'),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineOffset: style.outlineOffset,
      outlineColor: style.outlineColor,
      boxShadow: style.boxShadow,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    };
  });

  expect(evidence.focusVisible, label + ' must be in :focus-visible state').toBe(true);
  const hasVisibleIndicator =
    evidence.outlineStyle !== 'none' &&
    Number.parseFloat(evidence.outlineWidth) > 0;
  expect(
    hasVisibleIndicator || evidence.boxShadow !== 'none',
    label + ' must retain a visible focus indicator',
  ).toBe(true);
  return evidence;
}

async function openSettings(page: Page) {
  await page.getByRole('button', { name: /cài đặt/i }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Cài đặt' });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function openStocktake(page: Page) {
  await page.getByRole('button', { name: /^module$/i }).first().click();
  const library = page.getByRole('button', { name: /mở thư viện kiểm kê/i }).first();
  await expect(library).toBeVisible();
  await library.click({ force: true });
  await page.getByRole('button', { name: /^kiểm kê/i }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Kiểm kê' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Kiểm kê' })).toBeVisible();
  return dialog;
}

async function openStocktakeImport(page: Page) {
  await page.getByRole('button', { name: /^module$/i }).first().click();
  const library = page.getByRole('button', { name: /mở thư viện kiểm kê/i }).first();
  await expect(library).toBeVisible();
  await library.click({ force: true });
  await page.getByRole('button', { name: /^xuất file/i }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Xuất file' });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function sampleGlobalStyles(page: Page) {
  const styles = await page.evaluate(() => {
    const html = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const button = getComputedStyle(document.querySelector('button')!);
    return {
      html: { scrollBehavior: html.scrollBehavior, minWidth: html.minWidth },
      body: {
        minHeight: body.minHeight,
        fontSize: body.fontSize,
        lineHeight: body.lineHeight,
        backgroundColor: body.backgroundColor,
        color: body.color,
        fontFamily: body.fontFamily,
        webkitTapHighlightColor: body.webkitTapHighlightColor,
      },
      button: {
        fontFamily: button.fontFamily,
        fontSize: button.fontSize,
        lineHeight: button.lineHeight,
      },
      buttonIdentity: (() => {
        const element = document.querySelector('button')!;
        return {
          tag: element.tagName.toLowerCase(),
          className: typeof element.className === 'string' ? element.className : '',
          ariaLabel: element.getAttribute('aria-label'),
          parentClassName: typeof element.parentElement?.className === 'string' ? element.parentElement.className : '',
        };
      })(),
      topbarLogout: (() => {
        const element = document.querySelector('.topbar-logout');
        if (!element) return null;
        const style = getComputedStyle(element);
        return {
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          minWidth: style.minWidth,
          minHeight: style.minHeight,
        };
      })(),
    };
  });
  const stylesheetHrefs = await page.evaluate(() =>
    [...document.styleSheets].map((sheet) => sheet.href).filter((href): href is string => Boolean(href)),
  );
  return { ...styles, stylesheetHrefs };
}

function styleDifferences(before: any, after: any) {
  const differences: Array<{ target: string; property: string; before: string; after: string }> = [];
  for (const target of ['html', 'body', 'button']) {
    for (const property of Object.keys(before[target])) {
      if (before[target][property] !== after[target][property]) {
        differences.push({
          target,
          property,
          before: before[target][property],
          after: after[target][property],
        });
      }
    }
  }
  return differences;
}

function maxDurationSeconds(value: string) {
  return Math.max(...value.split(',').map((part) => {
    const normalized = part.trim();
    return normalized.endsWith('ms')
      ? Number.parseFloat(normalized) / 1000
      : Number.parseFloat(normalized);
  }));
}

async function reducedMotionEvidence(target: Locator, label: string) {
  const result = await target.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      transitionDuration: style.transitionDuration,
      animationDuration: style.animationDuration,
      animationName: style.animationName,
    };
  });
  expect(maxDurationSeconds(result.transitionDuration), label + ' transition duration under reduced motion').toBeLessThanOrEqual(0.00002);
  expect(maxDurationSeconds(result.animationDuration), label + ' animation duration under reduced motion').toBeLessThanOrEqual(0.00002);
  return result;
}

test('AUDIT-03C P0 diagnostic: same-document Home lazy CSS leakage after logout', async ({ context, page }, testInfo) => {
  const baselinePage = await context.newPage();
  await baselinePage.setViewportSize({ width: 390, height: 844 });
  await emulateMobilePlatform(baselinePage, 390, 844);
  await baselinePage.goto('./', { waitUntil: 'networkidle' });
  await expect(baselinePage.locator('main.login-experience')).toBeVisible();
  const baseline = await sampleGlobalStyles(baselinePage);

  await openHome(page);
  await expect(page.locator('.app-shell')).toBeVisible();
  const homeLoaded = await sampleGlobalStyles(page);

  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page.locator('main.login-experience')).toBeVisible({ timeout: 10_000 });
  const afterLogout = await sampleGlobalStyles(page);

  const homeLoadDifferences = styleDifferences(baseline, homeLoaded);
  const postLogoutDifferences = styleDifferences(baseline, afterLogout);
  const baselineStylesheets = new Set(baseline.stylesheetHrefs);
  const evidence = {
    capturedAt: new Date().toISOString(),
    sequence: ['fresh-login-baseline', 'same-document-home-lazy-load', 'logout-to-login-without-reload'],
    baseline,
    homeLoaded,
    afterLogout,
    homeLoadDifferences,
    postLogoutDifferences,
    stylesheetsAddedByHome: homeLoaded.stylesheetHrefs.filter((href) => !baselineStylesheets.has(href)),
    stylesheetsRemainingAfterLogout: afterLogout.stylesheetHrefs.filter((href) => !baselineStylesheets.has(href)),
    postLogoutParity: postLogoutDifferences.length === 0 &&
      afterLogout.stylesheetHrefs.filter((href) => !baselineStylesheets.has(href)).length === 0,
    acceptance: 'Record any remaining global style or lazy stylesheet difference after returning to Login; this diagnostic does not authorize CSS migration.',
  };
  const outputDir = testInfo.outputPath('css-foundation-evidence');
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputDir + '/same-document-home-leakage.json', JSON.stringify(evidence, null, 2));
  await baselinePage.close();

  expect(Array.isArray(evidence.postLogoutDifferences), 'The same-document parity result must be captured').toBe(true);
  expect(Array.isArray(evidence.stylesheetsRemainingAfterLogout), 'Remaining lazy stylesheet evidence must be captured').toBe(true);
});

test('AUDIT-03C keyboard focus contract: Home, Settings, Stocktake and Stocktake Import', async ({ page }) => {
  await openHome(page);
  await keyboardFocus(page, page.getByRole('button', { name: 'Đăng xuất' }), 'Home logout action');

  const settings = await openSettings(page);
  await keyboardFocus(page, settings.locator('button:visible').first(), 'Settings dialog first action');
  await page.keyboard.press('Escape');
  await expect(settings).toBeHidden();

  const stocktake = await openStocktake(page);
  await keyboardFocus(page, stocktake.locator('button:visible').first(), 'Stocktake dialog first action');
  await stocktake.getByRole('button', { name: 'Đóng kiểm kê' }).click();
  await expect(stocktake).toBeHidden();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Đăng xuất' })).toBeVisible();

  const stocktakeImport = await openStocktakeImport(page);
  await keyboardFocus(page, stocktakeImport.locator('button:visible').first(), 'Stocktake Import dialog first action');
});

test('AUDIT-03C reduced-motion contract: shared and feature surfaces', async ({ page }) => {
  await openHome(page, true);
  await expect.poll(() => page.locator('html').getAttribute('data-motion-preference')).toBe('reduced');
  await expect.poll(() => page.locator('html').getAttribute('data-power-mode')).toBe('conserve');

  await reducedMotionEvidence(page.getByRole('button', { name: 'Đăng xuất' }), 'Home logout action');

  const settings = await openSettings(page);
  await reducedMotionEvidence(settings.locator('button:visible').first(), 'Settings dialog first action');
  await page.keyboard.press('Escape');
  await expect(settings).toBeHidden();

  const stocktake = await openStocktake(page);
  await reducedMotionEvidence(stocktake.locator('button:visible').first(), 'Stocktake dialog first action');
  await stocktake.getByRole('button', { name: 'Đóng kiểm kê' }).click();
  await expect(stocktake).toBeHidden();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Đăng xuất' })).toBeVisible();
  await expect.poll(() => page.locator('html').getAttribute('data-motion-preference')).toBe('reduced');

  const stocktakeImport = await openStocktakeImport(page);
  await reducedMotionEvidence(stocktakeImport.locator('button:visible').first(), 'Stocktake Import dialog first action');
});

test('AUDIT-03C power-conserve preserves focus visibility and geometry; captures pseudo-elements', async ({ page }, testInfo) => {
  // Remove time-dependent transitions from both samples; compare power modes at rest.
  // Motion behavior itself is independently covered by the reduced-motion contract.
  await openHome(page, true);
  const logout = page.getByRole('button', { name: 'Đăng xuất' });
  const focusEvidence = await keyboardFocus(page, logout, 'Home logout action');

  const pseudoElements = await page.evaluate(() => {
    return [
      { selector: '.app-shell', pseudo: '::before' },
      { selector: '.spotlight-art', pseudo: '::after' },
    ].map(({ selector, pseudo }) => {
      const element = document.querySelector(selector);
      if (!element) return { selector, pseudo, present: false };
      const style = getComputedStyle(element, pseudo);
      return {
        selector, pseudo, present: true, content: style.content, display: style.display,
        position: style.position, opacity: style.opacity, backgroundImage: style.backgroundImage,
        pointerEvents: style.pointerEvents, zIndex: style.zIndex,
      };
    });
  });
  expect(pseudoElements.every((item) => item.present && item.content !== 'none')).toBe(true);

  await page.evaluate(() => { document.documentElement.dataset.powerMode = 'normal'; });
  const normal = await logout.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth,
      outlineOffset: style.outlineOffset, outlineColor: style.outlineColor,
      boxShadow: style.boxShadow, rect: { width: rect.width, height: rect.height },
    };
  });
  await page.evaluate(() => { document.documentElement.dataset.powerMode = 'conserve'; });
  const conserve = await logout.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth,
      outlineOffset: style.outlineOffset, outlineColor: style.outlineColor,
      boxShadow: style.boxShadow, rect: { width: rect.width, height: rect.height },
    };
  });

  expect(conserve.outlineStyle).toBe(normal.outlineStyle);
  expect(conserve.outlineWidth).toBe(normal.outlineWidth);
  expect(conserve.outlineOffset).toBe(normal.outlineOffset);
  expect(conserve.outlineColor).toBe(normal.outlineColor);
  expect(conserve.boxShadow).toBe(normal.boxShadow);
  expect(conserve.rect).toEqual(normal.rect);

  const evidence = { capturedAt: new Date().toISOString(), focusEvidence, pseudoElements, normal, conserve };
  const outputDir = testInfo.outputPath('css-foundation-evidence');
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputDir + '/power-mode-focus-pseudo.json', JSON.stringify(evidence, null, 2));
});

test('AUDIT-03C Chromium CDP matched-rule evidence for P0 focus properties', async ({ page }, testInfo) => {
  await openHome(page);
  const target = page.locator('.topbar-logout');
  await expect(target).toBeVisible();
  await keyboardFocus(page, target, 'Home logout action for CDP matched-rule capture');

  const client = await page.context().newCDPSession(page);
  await client.send('DOM.enable');
  await client.send('CSS.enable');
  const { root } = await client.send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.topbar-logout' });
  expect(nodeId).toBeGreaterThan(0);

  const matched = await client.send('CSS.getMatchedStylesForNode', { nodeId });
  const computed = await client.send('CSS.getComputedStyleForNode', { nodeId });
  const properties = new Set([
    'outline', 'outline-width', 'outline-style', 'outline-offset',
    'box-shadow', 'background-color', 'transition-duration', 'font-size', 'line-height',
  ]);
  const matchedRules = (matched.matchedCSSRules ?? []).map((entry: any) => ({
    selector: entry.rule.selectorList?.text ?? '',
    matchingSelectors: entry.matchingSelectors ?? [],
    origin: entry.rule.origin,
    layer: entry.rule.layer?.name ?? null,
    styleSheetId: entry.rule.style?.styleSheetId ?? null,
    declarations: (entry.rule.style?.cssProperties ?? [])
      .filter((declaration: any) => properties.has(declaration.name))
      .map((declaration: any) => ({
        property: declaration.name, value: declaration.value,
        important: declaration.important ?? false,
      })),
  })).filter((entry: any) => entry.declarations.length > 0);

  const computedProperties = (computed.computedStyle ?? [])
    .filter((entry: any) => properties.has(entry.name))
    .map((entry: any) => ({ property: entry.name, value: entry.value }));

  const evidence = {
    capturedAt: new Date().toISOString(),
    target: '.topbar-logout',
    method: 'Chrome DevTools Protocol CSS.getMatchedStylesForNode + CSS.getComputedStyleForNode',
    computedProperties,
    matchedRules,
    limitation: 'CDP provides browser-resolved computed values and matching declarations. This preserves source candidates for review; it does not independently calculate winners for shorthand, cascade-layer or variable-resolution cases.',
  };
  const outputDir = testInfo.outputPath('css-foundation-evidence');
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputDir + '/cdp-matched-focus-rules.json', JSON.stringify(evidence, null, 2));

  expect(computedProperties.some((entry: any) => entry.property === 'outline-width')).toBe(true);
  expect(matchedRules.length).toBeGreaterThan(0);
  await client.detach();
});
