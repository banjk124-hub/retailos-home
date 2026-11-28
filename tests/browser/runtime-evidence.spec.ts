import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const viewports = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '390x844', width: 390, height: 844 },
  { name: '360x740', width: 360, height: 740 },
  { name: 'landscape-short', width: 844, height: 390 },
];
const auditSession = { name: 'Trương Dương', department: 'FMCG', departmentId: 'fmcg', signedInAt: '2026-01-01T00:00:00.000Z' };

async function emulatePlatform(page: Page, platform: 'desktop' | 'mobile' | 'tablet', screenWidth: number, screenHeight: number) {
  await page.addInitScript(({ platform, screenWidth, screenHeight }) => {
    const originalMatchMedia = window.matchMedia.bind(window);
    const forcedMatches: Record<string, boolean> = {
      '(pointer: fine)': platform === 'desktop',
      '(hover: hover)': platform === 'desktop',
      '(pointer: coarse)': platform !== 'desktop',
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
      get: () => platform === 'desktop' ? 0 : 5,
    });
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      get: () => platform === 'mobile'
        ? 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36'
        : platform === 'tablet'
          ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15'
          : 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    });
    Object.defineProperty(window.screen, 'width', { configurable: true, get: () => screenWidth });
    Object.defineProperty(window.screen, 'height', { configurable: true, get: () => screenHeight });
  }, { platform, screenWidth, screenHeight });
}

async function seedSession(page: Page) {
  await page.addInitScript((session) => localStorage.setItem('retailos.session.v2', JSON.stringify(session)), auditSession);
}

async function capture(page: Page, info: TestInfo, label: string) {
  const data = await page.evaluate(() => {
    const props = ['display','position','width','height','min-width','max-width','padding','margin','gap','font-family','font-size','font-weight','line-height','letter-spacing','color','background-color','border-color','border-radius','box-shadow','backdrop-filter','filter','opacity','transform','animation-name','animation-duration','transition-duration','overflow','z-index'];
    const nodes = [...document.querySelectorAll('body *')].slice(0, 5000);
    const computedStyles = nodes.map((node, index) => {
      const cs = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return { index, tag: node.tagName.toLowerCase(), id: node.id || null,
        className: typeof node.className === 'string' ? node.className.slice(0, 240) : '',
        text: (node.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100),
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
        visible: rect.width > 0 && rect.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden',
        style: Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)])) };
    });
    const cssRules: Array<{ selector: string; stylesheet: string; condition: string; matched: number; declarations: Array<{ property: string; value: string; important: boolean }>; order: number; specificity: [number, number, number] }> = [];
    let sourceOrder = 0;
    const specificityOf = (selector: string): [number, number, number] => {
      // Approximation for ordinary selectors. :where() contributes zero. Complex
      // :is/:not/:has arguments and cascade layers still require manual review.
      const normalized = selector.replace(/:where\([^)]*\)/g, '');
      const ids = (normalized.match(/#[\w-]+/g) || []).length;
      const classes = (normalized.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+(?:\([^)]*\))?/g) || []).length;
      const elements = (normalized.replace(/::[\w-]+/g, ' ').match(/(^|[\s>+~])(?:[a-zA-Z][\w-]*)/g) || []).length
        + (normalized.match(/::[\w-]+/g) || []).length;
      return [ids, classes, elements];
    };
    const walk = (list: CSSRuleList, stylesheet: string, condition: string) => {
      for (const rule of [...list]) {
        if (rule instanceof CSSStyleRule) {
          let matched = 0;
          try { matched = document.querySelectorAll(rule.selectorText).length; } catch { /* invalid selector */ }
          const declarations = [...rule.style].map((property) => ({
            property, value: rule.style.getPropertyValue(property).trim(),
            important: rule.style.getPropertyPriority(property) === 'important',
          }));
          cssRules.push({ selector: rule.selectorText, stylesheet, condition, matched,
            declarations, order: sourceOrder++, specificity: specificityOf(rule.selectorText) });
        } else if ('cssRules' in rule) {
          const group = rule as CSSGroupingRule & { conditionText?: string };
          const conditionText = group.conditionText || group.constructor.name;
          if (rule instanceof CSSMediaRule && !matchMedia(rule.conditionText).matches) continue;
          if (rule instanceof CSSSupportsRule && !CSS.supports(rule.conditionText)) continue;
          walk(group.cssRules, stylesheet, [condition, conditionText].filter(Boolean).join(' > '));
        }
      }
    };
    for (const sheet of [...document.styleSheets]) {
      const owner = sheet.ownerNode as HTMLElement | null;
      const name = sheet.href || owner?.getAttribute('href') || owner?.getAttribute('data-vite-dev-id') || 'inline';
      try { walk(sheet.cssRules, name, ''); }
      catch { cssRules.push({ selector: '[stylesheet-unreadable]', stylesheet: name, condition: '', matched: -1, declarations: [], order: sourceOrder++, specificity: [0,0,0] }); }
    }
    const cascadeProperties = ['display','position','width','height','padding','margin','gap','font-family','font-size','font-weight','line-height','color','background-color','border-color','border-radius','box-shadow','backdrop-filter','transform','overflow','z-index'];
    const cascadeTrace = computedStyles.filter((node) => node.visible).slice(0, 180).map((node) => {
      const element = nodes[node.index] as HTMLElement;
      const candidates: Record<string, Array<{ selector: string; stylesheet: string; condition: string; value: string; important: boolean; specificity: [number,number,number]; order: number }>> = {};
      for (const property of cascadeProperties) candidates[property] = [];
      for (const rule of cssRules) {
        if (rule.matched <= 0 || rule.selector.startsWith('[')) continue;
        let matches = false;
        try { matches = element.matches(rule.selector); } catch { /* selector unsupported by matches */ }
        if (!matches) continue;
        for (const declaration of rule.declarations) {
          if (candidates[declaration.property]) candidates[declaration.property].push({
            selector: rule.selector, stylesheet: rule.stylesheet, condition: rule.condition,
            value: declaration.value, important: declaration.important, specificity: rule.specificity, order: rule.order,
          });
        }
      }
      for (const property of cascadeProperties) {
        const inlineValue = element.style.getPropertyValue(property).trim();
        if (inlineValue) candidates[property].push({ selector: '[style]', stylesheet: 'inline', condition: '',
          value: inlineValue, important: element.style.getPropertyPriority(property) === 'important',
          specificity: [1,0,0], order: Number.MAX_SAFE_INTEGER });
        candidates[property].sort((a,b) => Number(a.important)-Number(b.important)
          || a.specificity[0]-b.specificity[0] || a.specificity[1]-b.specificity[1]
          || a.specificity[2]-b.specificity[2] || a.order-b.order);
      }
      return { nodeIndex: node.index, tag: node.tag, id: node.id, className: node.className,
        text: node.text, computed: Object.fromEntries(cascadeProperties.map((p) => [p, node.style[p]])),
        candidates };
    });
    const performanceEntries = performance.getEntriesByType('navigation').map((entry) => {
      const e = entry as PerformanceNavigationTiming;
      return { type: e.type, duration: e.duration, domContentLoaded: e.domContentLoadedEventEnd,
        loadEventEnd: e.loadEventEnd, transferSize: e.transferSize, encodedBodySize: e.encodedBodySize,
        decodedBodySize: e.decodedBodySize };
    });
    const resourceEntries = performance.getEntriesByType('resource').map((entry) => {
      const e = entry as PerformanceResourceTiming;
      return { name: e.name, initiatorType: e.initiatorType, duration: e.duration,
        transferSize: e.transferSize, encodedBodySize: e.encodedBodySize, decodedBodySize: e.decodedBodySize };
    });
    const paintEntries = performance.getEntriesByType('paint').map((e) => ({ name: e.name, startTime: e.startTime }));
    const longTaskEntries = performance.getEntriesByType('longtask').map((e) => ({ startTime: e.startTime, duration: e.duration }));
    const width = document.documentElement.clientWidth;
    return {
      capturedAt: new Date().toISOString(), url: location.href, title: document.title,
      viewport: { width, height: document.documentElement.clientHeight, dpr: devicePixelRatio },
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - width },
      fonts: { root: getComputedStyle(document.documentElement).fontFamily, body: getComputedStyle(document.body).fontFamily },
      counts: { elements: nodes.length, stylesheets: document.styleSheets.length, cssRules: cssRules.length, unmatchedRules: cssRules.filter((r) => r.matched === 0).length },
      duplicateIds: [...document.querySelectorAll('[id]')].map((e) => e.id).filter((id, i, all) => all.indexOf(id) !== i),
      cssRules, computedStyles, cascadeTrace, performance: { navigation: performanceEntries, resources: resourceEntries, paint: paintEntries, longTasks: longTaskEntries },
    };
  });
  expect(data.document.horizontalOverflow, label + ' horizontal overflow').toBeLessThanOrEqual(1);
  expect(data.duplicateIds, label + ' duplicate DOM IDs').toEqual([]);
  const dir = info.outputPath('runtime-evidence');
  await mkdir(dir, { recursive: true });
  const name = label.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
  // The library overlay uses a full-screen backdrop blur. A full-page capture
  // forces Chromium to rasterize that effect across the entire scrolled page;
  // capture the visible viewport for this overlay while the JSON evidence above
  // retains full-document geometry and computed styles.
  const screenshotFullPage = !label.startsWith('library-');
  await page.screenshot({ path: path.join(dir, name + '.png'), fullPage: screenshotFullPage, animations: 'disabled', timeout: 60_000 });
  await writeFile(path.join(dir, name + '.json'), JSON.stringify(data, null, 2));
  return data;
}

test('RetailOS runtime evidence capture', async ({ page }, info) => {
  // This serial audit captures 15+ viewport/surface screenshots and CSSOM snapshots.
  // The trailing numeric argument previously supplied below is not a Playwright timeout.
  test.setTimeout(90_000);
  const errors: string[] = [];
  const failedRequests: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', (r) => failedRequests.push(r.url() + ' :: ' + (r.failure()?.errorText || 'failed')));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./', { waitUntil: 'networkidle' });
  await expect(page.locator('main.login-experience')).toBeVisible();
  await capture(page, info, 'login-1440x900');

  await emulatePlatform(page, 'desktop', 1440, 900);
  await seedSession(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.retailos-interface')).toBeVisible();
  await page.waitForTimeout(500);
  await capture(page, info, 'home-1440x900');

  const viewportResults: Array<{ viewport: string; horizontalOverflow: number; documentHeight: number }> = [];
  for (const v of viewports) {
    await page.setViewportSize({ width: v.width, height: v.height });
    const data = await capture(page, info, 'home-' + v.name);
    viewportResults.push({ viewport: v.name, horizontalOverflow: data.document.horizontalOverflow, documentHeight: data.document.height });

    const desktopNavigation = page.locator('.desktop-shell-navigation');
    const mobileDock = page.locator('.mobile-shell-navigation .liquid-dock');
    await expect(page.locator('[data-retailos-platform="desktop"]'), `Desktop presentation identity at ${v.name}`).toHaveCount(1);
    await expect(desktopNavigation, `Desktop navigation remains selected at ${v.name}`).toBeVisible();
    await expect(mobileDock, `Mobile dock must not be selected by viewport width at ${v.name}`).toBeHidden();
    const layout = await page.evaluate(() => ({
      rail: document.querySelector('.desktop-shell-navigation')!.getBoundingClientRect().toJSON(),
      main: document.querySelector('.home-main')!.getBoundingClientRect().toJSON(),
    }));
    expect(layout.rail.right, `Desktop rail must not overlap Home content at ${v.name}`).toBeLessThanOrEqual(layout.main.left + 1);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole('button', { name: 'Quét mã' })).toHaveCount(0);
  await page.getByRole('button', { name: /cài đặt/i }).first().click();
  const desktopSettings = page.getByRole('dialog', { name: 'Cài đặt' });
  await expect(desktopSettings).toBeVisible();
  await expect(page.getByRole('button', { name: /Trung tâm cập nhật/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Cài đặt máy quét/ })).toHaveCount(0);
  await capture(page, info, 'settings-desktop-1440x900');
  await page.keyboard.press('Escape');
  await expect(desktopSettings).toBeHidden();

  await emulatePlatform(page, 'mobile', 390, 844);
  await seedSession(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-retailos-platform="mobile"]')).toHaveCount(1);
  await expect(page.locator('.mobile-shell-navigation .liquid-dock')).toBeVisible();
  await expect(page.locator('.desktop-shell-navigation')).toHaveCount(0);
  await page.waitForTimeout(350);
  await capture(page, info, 'home-mobile-390x844');

  const mobileQuickLookup = page.getByRole('button', { name: 'Tra cứu nhanh' });
  await expect(mobileQuickLookup).toBeVisible();
  await mobileQuickLookup.click();
  await expect(page.getByRole('button', { name: 'Quét mã' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tìm kiếm' })).toBeVisible();
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await expect(page.getByLabel('Tên sản phẩm hoặc mã barcode')).toBeVisible();
  await page.getByRole('button', { name: 'Đóng kết quả' }).click();

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(80);
  const footerBottom = await page.locator('.app-footer').evaluate((node) => node.getBoundingClientRect().bottom);
  const dockTop = (await page.locator('.mobile-shell-navigation .liquid-dock').boundingBox())?.y ?? 0;
  expect(footerBottom, 'mobile dock must not cover the final Home content').toBeLessThanOrEqual(dockTop - 4);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.setViewportSize({ width: 390, height: 844 });
  const settings = page.getByRole('button', { name: /cài đặt/i }).first();
  await expect(settings, 'Settings navigation must be reachable on mobile').toBeVisible();
  await settings.click();
  const settingsDialog = page.getByRole('dialog', { name: 'Cài đặt' });
  await expect(settingsDialog).toBeVisible();
  await capture(page, info, 'settings-390x844');
  const updateCenter = page.getByRole('button', { name: /Trung tâm cập nhật/ });
  await expect(updateCenter, 'Update Center entry must be reachable from Settings').toBeVisible();
  await updateCenter.click();
  await expect(page.getByRole('heading', { name: 'Trung tâm cập nhật' })).toBeVisible();
  await capture(page, info, 'update-center-390x844');
  await page.getByRole('button', { name: 'Quay lại cài đặt' }).click();
  await expect(settingsDialog).toBeVisible();
  const scannerSettings = page.getByRole('button', { name: /Cài đặt máy quét/ });
  await expect(scannerSettings, 'Scanner Preferences entry must be reachable from Settings').toBeVisible();
  await scannerSettings.click();
  await expect(page.getByRole('heading', { name: 'Cài đặt máy quét' })).toBeVisible();
  expect(await page.getByRole('switch').count()).toBeGreaterThan(0);
  await expect(page.getByRole('slider', { name: 'Âm lượng beep' })).toBeVisible();
  await capture(page, info, 'scanner-preferences-390x844');
  await page.keyboard.press('Escape');
  await expect(settingsDialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(settingsDialog).toBeHidden();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(350);
  const moduleNav = page.getByRole('button', { name: /^module$/i }).first();
  await expect(moduleNav, 'Module navigation must be reachable').toBeVisible();
  await moduleNav.click();
  const library = page.getByRole('button', { name: /mở thư viện kiểm kê/i }).first();
  await expect(library, 'Stocktake library must be reachable').toBeVisible();
  // The library tile has a continuous decorative transform. Force only this
  // already-visible, semantically verified control to avoid Playwright's
  // bounding-box stability gate timing out on the nonessential motion.
  await library.click({ force: true });
  await page.waitForTimeout(250);
  await capture(page, info, 'library-390x844');
  const stocktake = page.getByRole('button', { name: /^kiểm kê/i }).first();
  await expect(stocktake, 'Stocktake workflow entry must be reachable').toBeVisible();
  await stocktake.click();
  await expect(page.getByRole('heading', { name: 'Kiểm kê' })).toBeVisible();
  await capture(page, info, 'stocktake-390x844');
  await page.locator('#stocktake-zone').fill('AT01');
  await page.getByRole('button', { name: 'Bắt đầu vùng' }).click();
  await expect(page.getByRole('heading', { name: 'Quét hàng hóa' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mở máy quét' }), 'Mobile Stocktake retains its camera scanner capability').toBeVisible();
  await page.getByRole('button', { name: 'Quay lại' }).click();
  await expect(page.getByRole('heading', { name: 'Kiểm kê' })).toBeVisible();
  await page.getByRole('button', { name: 'Về trang chủ' }).click();
  await expect(page.getByRole('button', { name: 'Đăng xuất' })).toBeVisible();
  await page.waitForTimeout(350);
  const importNav = page.getByRole('button', { name: /^module$/i }).first();
  await expect(importNav).toBeVisible();
  await importNav.click();
  const importLibrary = page.getByRole('button', { name: /mở thư viện kiểm kê/i }).first();
  await expect(importLibrary).toBeVisible();
  await importLibrary.click({ force: true });
  const exportModule = page.getByRole('button', { name: /^xuất file/i }).first();
  await expect(exportModule, 'Stocktake Import workflow entry must be reachable').toBeVisible();
  await exportModule.click();
  await expect(page.locator('.stocktake-import-page-shell'), 'Stocktake Import must resolve through the authenticated Page Host').toBeVisible();
  await expect(page.getByRole('heading', { name: 'Xuất file' })).toBeVisible();
  await capture(page, info, 'import-390x844');
  await writeFile(info.outputPath('runtime-evidence/health-summary.json'), JSON.stringify({
    capturedAt: new Date().toISOString(), errors, failedRequests, viewportResults,
    note: 'All required feature surfaces are asserted reachable; a missing entry point fails the runtime evidence test.',
  }, null, 2));
  expect(errors, 'browser and console errors').toEqual([]);
  expect(failedRequests, 'runtime audit requests must not fail').toEqual([]);
  expect(viewportResults.every((v) => v.horizontalOverflow <= 1), 'Home horizontal overflow').toBe(true);
});


test('Tablet remains review-required and does not inherit camera scanner capability', async ({ page }, info) => {
  await emulatePlatform(page, 'tablet', 768, 1024);
  await seedSession(page);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-retailos-platform="tablet"]')).toHaveCount(1);
  await expect(page.locator('.shell-navigation--tablet-compat .shell-navigation__mobile .liquid-dock')).toBeVisible();
  await expect(page.locator('.desktop-shell-navigation')).toHaveCount(0);
  await expect(page.locator('.mobile-shell-navigation')).toHaveCount(0);

  await page.getByRole('button', { name: /cài đặt/i }).first().click();
  const settingsDialog = page.getByRole('dialog', { name: 'Cài đặt' });
  await expect(settingsDialog).toBeVisible();
  await expect(page.getByRole('button', { name: /Trung tâm cập nhật/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Cài đặt máy quét/ })).toHaveCount(0);
  await capture(page, info, 'tablet-settings-768x1024');
  await page.keyboard.press('Escape');
  await expect(settingsDialog).toBeHidden();

  const moduleNav = page.getByRole('button', { name: /^module$/i }).first();
  await moduleNav.click();
  const library = page.getByRole('button', { name: /mở thư viện kiểm kê/i }).first();
  await expect(library).toBeVisible();
  await library.click({ force: true });
  const stocktake = page.getByRole('button', { name: /^kiểm kê/i }).first();
  await stocktake.click();
  await expect(page.getByRole('heading', { name: 'Kiểm kê' })).toBeVisible();
  await page.locator('#stocktake-zone').fill('AT01');
  await page.getByRole('button', { name: 'Bắt đầu vùng' }).click();
  await expect(page.getByRole('heading', { name: 'Quét hàng hóa' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mở máy quét' }), 'Tablet Stocktake must not expose camera scanning').toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Nhập barcode thủ công' }), 'Manual Stocktake entry remains available').toBeVisible();
});

