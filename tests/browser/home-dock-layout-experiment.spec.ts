import { expect, test, type Page } from '@playwright/test';

const session = {
  name: 'RetailOS UI Audit',
  department: 'FMCG',
  departmentId: 'fmcg',
  signedInAt: '2026-01-01T00:00:00.000Z',
};

async function openHome(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.addInitScript((value) => {
    localStorage.setItem('retailos.session.v2', JSON.stringify(value));
  }, session);
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.retailos-interface')).toBeVisible();
  await page.waitForTimeout(350);
}

async function measure(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), right: Math.round(r.right),
        bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) };
    };
    const dock = rect('.liquid-dock');
    const card = rect('.library-engine__group');
    const footer = rect('.library-engine__group .library-engine__footer');
    const actionable = [...document.querySelectorAll(
      '.library-engine__group button, .library-engine__group a, .library-engine__group [role="button"]',
    )].filter((element) => {
      const style = getComputedStyle(element);
      const r = element.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    }).map((element) => {
      const r = element.getBoundingClientRect();
      const hitTop = Math.max(r.top, dock?.y ?? Infinity);
      const hitBottom = Math.min(r.bottom, dock?.bottom ?? -Infinity);
      return {
        label: (element.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 50),
        y: Math.round(r.y), bottom: Math.round(r.bottom),
        dockIntersection: dock ? Math.max(0, Math.round(hitBottom - hitTop)) : 0,
      };
    });
    return {
      viewport: { width: innerWidth, height: innerHeight },
      documentHeight: document.documentElement.scrollHeight,
      contentGap: getComputedStyle(document.querySelector('.content-wrap.home-content')!).gap,
      spotlightMargin: getComputedStyle(document.querySelector('.home-spotlight')!).marginBottom,
      dock, card, footer, actionable,
    };
  });
}

test('Home LiquidDock overlap — baseline and spacing-only candidates', async ({ page }) => {
  const viewports = [
    { width: 390, height: 844 },
    { width: 360, height: 740 },
    { width: 844, height: 390 },
  ];
  const results: Array<Record<string, unknown>> = [];

  for (const viewport of viewports) {
    await openHome(page, viewport.width, viewport.height);
    results.push({ scenario: 'baseline', ...await measure(page) });

    // Candidate A: preserve a compact 8px rhythm between Home content sections,
    // remove the additional hero margin that currently stacks on top of flex gap.
    await page.addStyleTag({ content: `
      @media (max-width: 700px) {
        .app-shell .content-wrap.home-content { gap: 8px !important; }
        .app-shell .home-spotlight { margin-bottom: 0 !important; }
      }
    ` });
    results.push({ scenario: 'candidate-a-gap-8-margin-0', ...await measure(page) });

    await page.screenshot({
      path: test.info().outputPath(`dock-candidate-a-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
      animations: 'disabled',
    });
    await page.goto('about:blank');
  }

  const output = JSON.stringify(results, null, 2);
  await test.info().attach('dock-layout-experiment.json', {
    body: output,
    contentType: 'application/json',
  });

  for (const result of results) {
    const viewport = result.viewport as { width: number; height: number };
    if (viewport.width >= 701) continue;
    const dock = result.dock as { y: number; bottom: number } | null;
    const footer = result.footer as { y: number; bottom: number } | null;
    expect(dock, 'LiquidDock should remain mounted').not.toBeNull();
    expect(footer, 'first module group footer should be measurable').not.toBeNull();
  }
});
