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
const auditSession = { name: 'RetailOS UI Audit', department: 'FMCG', departmentId: 'fmcg', signedInAt: '2026-01-01T00:00:00.000Z' };

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
    const cssRules: Array<{ selector: string; stylesheet: string; condition: string; matched: number }> = [];
    const walk = (list: CSSRuleList, stylesheet: string, condition: string) => {
      for (const rule of [...list]) {
        if (rule instanceof CSSStyleRule) {
          let matched = 0;
          try { matched = document.querySelectorAll(rule.selectorText).length; } catch { /* invalid selector */ }
          cssRules.push({ selector: rule.selectorText, stylesheet, condition, matched });
        } else if ('cssRules' in rule) {
          const group = rule as CSSGroupingRule & { conditionText?: string };
          walk(group.cssRules, stylesheet, [condition, group.conditionText || group.constructor.name].filter(Boolean).join(' > '));
        }
      }
    };
    for (const sheet of [...document.styleSheets]) {
      const owner = sheet.ownerNode as HTMLElement | null;
      const name = sheet.href || owner?.getAttribute('href') || owner?.getAttribute('data-vite-dev-id') || 'inline';
      try { walk(sheet.cssRules, name, ''); }
      catch { cssRules.push({ selector: '[stylesheet-unreadable]', stylesheet: name, condition: '', matched: -1 }); }
    }
    const width = document.documentElement.clientWidth;
    return {
      capturedAt: new Date().toISOString(), url: location.href, title: document.title,
      viewport: { width, height: document.documentElement.clientHeight, dpr: devicePixelRatio },
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - width },
      fonts: { root: getComputedStyle(document.documentElement).fontFamily, body: getComputedStyle(document.body).fontFamily },
      counts: { elements: nodes.length, stylesheets: document.styleSheets.length, cssRules: cssRules.length, unmatchedRules: cssRules.filter((r) => r.matched === 0).length },
      duplicateIds: [...document.querySelectorAll('[id]')].map((e) => e.id).filter((id, i, all) => all.indexOf(id) !== i),
      cssRules, computedStyles,
    };
  });
  const dir = info.outputPath('runtime-evidence');
  await mkdir(dir, { recursive: true });
  const name = label.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
  await page.screenshot({ path: path.join(dir, name + '.png'), fullPage: true, animations: 'disabled' });
  await writeFile(path.join(dir, name + '.json'), JSON.stringify(data, null, 2));
  return data;
}

test('RetailOS runtime evidence capture', async ({ page }, info) => {
  const errors: string[] = [];
  const failedRequests: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', (r) => failedRequests.push(r.url() + ' :: ' + (r.failure()?.errorText || 'failed')));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./', { waitUntil: 'networkidle' });
  await expect(page.locator('main.login-experience')).toBeVisible();
  await capture(page, info, 'login-1440x900');

  await page.goto('about:blank');
  await seedSession(page);
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.retailos-interface')).toBeVisible();
  await page.waitForTimeout(500);
  await capture(page, info, 'home-1440x900');

  const viewportResults: Array<{ viewport: string; horizontalOverflow: number; documentHeight: number }> = [];
  for (const v of viewports) {
    await page.setViewportSize({ width: v.width, height: v.height });
    const data = await capture(page, info, 'home-' + v.name);
    viewportResults.push({ viewport: v.name, horizontalOverflow: data.document.horizontalOverflow, documentHeight: data.document.height });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const settings = page.getByRole('button', { name: /cài đặt/i }).first();
  if (await settings.isVisible().catch(() => false)) {
    await settings.click();
    await page.waitForTimeout(500);
    await capture(page, info, 'settings-390x844');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(350);
  }

  const moduleNav = page.getByRole('button', { name: /^module$/i }).first();
  if (await moduleNav.isVisible().catch(() => false)) await moduleNav.click();
  const library = page.getByRole('button', { name: /mở thư viện kiểm kê/i }).first();
  if (await library.isVisible().catch(() => false)) {
    await library.click();
    await page.waitForTimeout(250);
    await capture(page, info, 'library-390x844');
    const stocktake = page.getByRole('button', { name: /^kiểm kê/i }).first();
    if (await stocktake.isVisible().catch(() => false)) {
      await stocktake.click();
      await page.waitForTimeout(700);
      await capture(page, info, 'stocktake-390x844');
    }
  }

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(350);
  const importNav = page.getByRole('button', { name: /^module$/i }).first();
  if (await importNav.isVisible().catch(() => false)) await importNav.click();
  const importLibrary = page.getByRole('button', { name: /mở thư viện kiểm kê/i }).first();
  if (await importLibrary.isVisible().catch(() => false)) {
    await importLibrary.click();
    const exportModule = page.getByRole('button', { name: /^xuất file/i }).first();
    if (await exportModule.isVisible().catch(() => false)) {
      await exportModule.click();
      await page.waitForTimeout(700);
      await capture(page, info, 'import-390x844');
    }
  }

  await writeFile(info.outputPath('runtime-evidence/health-summary.json'), JSON.stringify({
    capturedAt: new Date().toISOString(), errors, failedRequests, viewportResults,
    note: 'Feature screenshots are emitted only when existing user-facing navigation controls are reachable.',
  }, null, 2));
  expect(errors, 'browser and console errors').toEqual([]);
  expect(viewportResults.every((v) => v.horizontalOverflow <= 1), 'Home horizontal overflow').toBe(true);
});
