import JSZip from 'jszip';
import { expect, test } from '@playwright/test';

const auditSession = {
  name: 'Trương Dương',
  employeeCode: '20286233',
  department: 'FMCG',
  departmentId: 'fmcg',
  signedInAt: '2026-01-01T00:00:00.000Z',
};

async function createWorkbook(rows: Array<[string, string]>, fileName: string) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="BT01" sheetId="1" r:id="rId1"/></sheets>
</workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`);
  const dataRows = rows.map(([barcode, quantity], index) => `
    <row r="${index + 2}">
      <c r="A${index + 2}" t="inlineStr"><is><t>${barcode}</t></is></c>
      <c r="B${index + 2}"><v>${quantity}</v></c>
    </row>`).join('');
  zip.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="inlineStr"><is><t>BARCODE</t></is></c>
      <c r="B1" t="inlineStr"><is><t>QUANTITY</t></is></c>
    </row>
    ${dataRows}
  </sheetData>
</worksheet>`);
  return {
    name: fileName,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  };
}

test('Stocktake Import presentation preserves import, dirty edit, conflict review, TXT export and history workflows', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((session) => {
    localStorage.setItem('retailos.session.v2', JSON.stringify(session));
  }, auditSession);

  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.retailos-interface')).toBeVisible();
  await page.getByRole('button', { name: /^module$/i }).first().click();
  await page.getByRole('button', { name: /mở thư viện kiểm kê/i }).first().click();
  await page.getByRole('button', { name: /^xuất file/i }).first().click();

  const pageSurface = page.locator('.stocktake-import-page-shell');
  const panel = page.locator('.stocktake-import-panel');
  await expect(pageSurface).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Xuất file' })).toHaveCount(0);
  await expect(panel).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Xuất file' })).toBeVisible();

  const firstWorkbook = await createWorkbook([
    ['8936000000001', '1.250'],
    ['8936000000001', '2.500'],
  ], 'BT01-first.xlsx');
  const fileInput = page.locator('.stocktake-import-file-input');
  await fileInput.setInputFiles(firstWorkbook);

  await expect(page.getByText('BT01', { exact: true }).first()).toBeVisible();
  await expect(page.locator('.stocktake-import-edit-table tbody tr')).toHaveCount(2);

  await page.getByRole('button', { name: 'Chỉnh sửa' }).click();
  await page.getByLabel('Kết quả thực tế dòng 2').fill('1.750');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByText('Đã lưu trên thiết bị')).toBeVisible();

  await page.getByRole('button', { name: 'Xem TXT' }).click();
  const output = page.getByRole('textbox', { name: 'Nội dung TXT BT01' });
  await expect(output).toBeVisible();
  await expect(output).toHaveValue(/ARTICLE,8936000000001,1\.750/);
  const txtDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Quay lại bảng' }).click();
  await page.getByRole('button', { name: 'Tải TXT' }).click();
  expect((await txtDownload).suggestedFilename()).toBe('BT01.txt');

  const secondWorkbook = await createWorkbook([['8936000000002', '3.125']], 'BT01-second.xlsx');
  await fileInput.setInputFiles(secondWorkbook);
  await expect(page.getByRole('alertdialog', { name: 'Kiểm tra file bổ sung' })).toBeVisible();
  await page.getByRole('button', { name: 'Gộp vùng trùng' }).click();
  await expect(page.locator('.stocktake-import-edit-table tbody tr')).toHaveCount(3);

  await page.getByRole('button', { name: 'Lịch sử' }).click();
  await expect(page.getByText('Lịch sử xử lý trên thiết bị')).toBeVisible();
  await expect(page.locator('.stocktake-import-history-list article')).toHaveCount(1);
  await page.getByRole('button', { name: 'Mở', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Xuất file' })).toBeVisible();
  await expect(page.locator('.stocktake-import-edit-table tbody tr')).toHaveCount(3);

  const mobileBounds = await panel.boundingBox();
  expect(mobileBounds).not.toBeNull();
  expect(mobileBounds!.width).toBeLessThanOrEqual(390);

  await page.setViewportSize({ width: 1440, height: 900 });
  const desktopBounds = await panel.boundingBox();
  expect(desktopBounds).not.toBeNull();
  expect(desktopBounds!.width).toBeLessThanOrEqual(1412);
  expect(desktopBounds!.x).toBeGreaterThanOrEqual(0);
  expect(desktopBounds!.x + desktopBounds!.width).toBeLessThanOrEqual(1441);
});


test('Stocktake Import Page exit guard preserves dirty edits and pending conflict review', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript((session) => {
    localStorage.setItem('retailos.session.v2', JSON.stringify(session));
  }, auditSession);

  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.retailos-interface')).toBeVisible();
  await page.getByRole('button', { name: /^module$/i }).first().click();
  await page.getByRole('button', { name: /mở thư viện kiểm kê/i }).first().click();
  await page.getByRole('button', { name: /^xuất file/i }).first().click();
  const pageSurface = page.locator('.stocktake-import-page-shell');
  await expect(pageSurface).toBeVisible();

  const firstWorkbook = await createWorkbook([['8936000000001', '1.250']], 'BT01-guard-first.xlsx');
  const fileInput = page.locator('.stocktake-import-file-input');
  await fileInput.setInputFiles(firstWorkbook);
  await expect(page.locator('.stocktake-import-edit-table tbody tr')).toHaveCount(1);

  await page.getByRole('button', { name: 'Chỉnh sửa' }).click();
  await page.getByLabel('Kết quả thực tế dòng 2').fill('2.750');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Về trang chủ' }).click();
  await expect(pageSurface).toBeVisible();
  await expect(page.getByLabel('Kết quả thực tế dòng 2')).toHaveValue('2.750');

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Về trang chủ' }).click();
  await expect(page.getByRole('button', { name: 'Đăng xuất' })).toBeVisible();
  await expect(pageSurface).toBeHidden();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^module$/i }).first().click();
  await page.getByRole('button', { name: /mở thư viện kiểm kê/i }).first().click();
  await page.getByRole('button', { name: /^xuất file/i }).first().click();
  await expect(pageSurface).toBeVisible();
  const pendingBase = await createWorkbook([['8936000000002', '1.000']], 'BT02-pending-base.xlsx');
  await fileInput.setInputFiles(pendingBase);
  await expect(page.locator('.stocktake-import-edit-table tbody tr')).toHaveCount(1);
  const pendingConflict = await createWorkbook([['8936000000003', '2.000']], 'BT02-pending-conflict.xlsx');
  await fileInput.setInputFiles(pendingConflict);
  await expect(page.getByRole('alertdialog', { name: 'Kiểm tra file bổ sung' })).toBeVisible();
  await page.getByRole('button', { name: 'Trang chủ' }).first().click();
  await expect(pageSurface).toBeVisible();
  await expect(page.getByRole('alertdialog', { name: 'Kiểm tra file bổ sung' })).toBeVisible();
  await page.getByRole('button', { name: 'Hủy bổ sung' }).click();
  await page.getByRole('button', { name: 'Trang chủ' }).first().click();
  await expect(page.getByRole('button', { name: 'Đăng xuất' })).toBeVisible();
});
