import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { computeTotals } from '../src/server/calc';
import { generateQuoteXlsx } from '../src/server/quote-xlsx';
import type { Company, Quote, QuoteItem } from '../src/server/types';

type XlsxLoadBuffer = Parameters<ExcelJS.Workbook['xlsx']['load']>[0];

const onePixelPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
const onePixelJpegBase64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9k=';

function decodeBase64(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function makeCompany(): Company {
  return {
    id: 1,
    name: '範例客戶',
    address: '台北市中山區南京東路一段 1 號',
    phone: '02-1234-5678',
    bank_info: '玉山銀行 808 / 1234-567-890123 / 範例客戶有限公司',
    default_tax_rate: 0.05,
    default_notes: '匯款後請提供末五碼。',
    logo_key: 'brand/logo.png',
    stamp_key: 'brand/stamp.png',
    bank_image_key: 'brand/bank.jpg',
  };
}

function makeItems(count: number): QuoteItem[] {
  const baseItems = [
    { name: '策略規劃', description: '品牌與行銷策略', qty: 1, unit: '式', unit_price: 48000 },
    { name: '廣告素材', description: '社群圖文與投放素材', qty: 2, unit: '組', unit_price: 12500 },
  ];

  const rawItems = Array.from({ length: count }, (_, index) => {
    return (
      baseItems[index] ?? {
        name: `延伸服務 ${index + 1}`,
        description: `第 ${index + 1} 項服務說明`,
        qty: index + 1,
        unit: '項',
        unit_price: 1000 + index * 100,
      }
    );
  });

  return rawItems.map((item, index) => ({
    ...item,
    id: index + 1,
    quote_id: 1,
    sort_order: index + 1,
    amount: Math.round(item.qty * item.unit_price),
  }));
}

function makeQuote(items: QuoteItem[]): Quote {
  const totals = computeTotals(items, 0.05);

  return {
    id: 1,
    quote_no: '20260614-01',
    client_id: 1,
    client_name: '安可整合行銷',
    client_contact: '王小姐',
    client_phone: '0912-345-678',
    subject: '行銷',
    quote_date: '2026-06-14',
    valid_until: '2026-06-30',
    tax_rate: 0.05,
    subtotal: totals.subtotal,
    tax_amount: totals.taxAmount,
    total: totals.total,
    notes: '本報價含稅，實際執行細節依雙方確認為準。',
    status: 'draft',
    xlsx_key: null,
    pdf_key: null,
    created_via: 'web',
    created_at: '2026-06-14T00:00:00.000Z',
    updated_at: '2026-06-14T00:00:00.000Z',
    items,
  };
}

function makeBrand(): { logo: ArrayBuffer; stamp: ArrayBuffer; bank: ArrayBuffer } {
  return {
    logo: decodeBase64(onePixelPngBase64),
    stamp: decodeBase64(onePixelPngBase64),
    bank: decodeBase64(onePixelJpegBase64),
  };
}

async function loadQuoteWorksheet(items: QuoteItem[]): Promise<ExcelJS.Worksheet> {
  const bytes = await generateQuoteXlsx({
    quote: makeQuote(items),
    items,
    company: makeCompany(),
    brand: makeBrand(),
  });

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as unknown as XlsxLoadBuffer);

  const worksheet = workbook.getWorksheet('報價單');
  expect(worksheet).toBeDefined();

  return worksheet as ExcelJS.Worksheet;
}

function hasCellValue(worksheet: ExcelJS.Worksheet, expected: string): boolean {
  let found = false;

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (cell.value === expected) {
        found = true;
      }
    });
  });

  return found;
}

function findRowNumberByValue(worksheet: ExcelJS.Worksheet, expected: string): number {
  let rowNumber = 0;

  worksheet.eachRow((row, currentRowNumber) => {
    row.eachCell((cell) => {
      if (cell.value === expected) {
        rowNumber = currentRowNumber;
      }
    });
  });

  return rowNumber;
}

function getItemRows(worksheet: ExcelJS.Worksheet): ExcelJS.Row[] {
  const headerRowNumber = findRowNumberByValue(worksheet, '項次');
  expect(headerRowNumber).toBeGreaterThan(0);

  const rows: ExcelJS.Row[] = [];
  let currentRowNumber = headerRowNumber + 1;

  while (typeof worksheet.getRow(currentRowNumber).getCell(1).value === 'number') {
    rows.push(worksheet.getRow(currentRowNumber));
    currentRowNumber += 1;
  }

  return rows;
}

function expectTotalValue(worksheet: ExcelJS.Worksheet, label: string, expected: number): void {
  const rowNumber = findRowNumberByValue(worksheet, label);

  expect(rowNumber).toBeGreaterThan(0);
  expect(worksheet.getRow(rowNumber).getCell(7).value).toBe(expected);
}

describe('generateQuoteXlsx', () => {
  it('builds a quote workbook with header data, dynamic items, totals, number formats, and brand images', async () => {
    const items = makeItems(2);
    const totals = computeTotals(items, 0.05);
    const worksheet = await loadQuoteWorksheet(items);
    const itemRows = getItemRows(worksheet);

    expect(hasCellValue(worksheet, '20260614-01')).toBe(true);
    expect(hasCellValue(worksheet, '行銷')).toBe(true);
    expect(hasCellValue(worksheet, '安可整合行銷')).toBe(true);
    expect(itemRows).toHaveLength(2);
    expect(itemRows[0].getCell(2).value).toBe('策略規劃');
    expect(itemRows[0].getCell(7).value).toBe(48000);
    expect(itemRows[1].getCell(7).value).toBe(25000);
    expectTotalValue(worksheet, '小計', totals.subtotal);
    expectTotalValue(worksheet, '稅金', totals.taxAmount);
    expectTotalValue(worksheet, '總計', totals.total);
    expect(worksheet.getImages()).toHaveLength(3);
    expect(itemRows[0].getCell(7).numFmt).toContain('#,##0');
  });

  it('uses one item row when the quote has one item', async () => {
    const worksheet = await loadQuoteWorksheet(makeItems(1));

    expect(getItemRows(worksheet)).toHaveLength(1);
  });

  it('places totals and footer after all item rows when the quote has twelve items', async () => {
    const worksheet = await loadQuoteWorksheet(makeItems(12));
    const itemRows = getItemRows(worksheet);
    const lastItemRowNumber = itemRows[itemRows.length - 1].number;
    const subtotalRowNumber = findRowNumberByValue(worksheet, '小計');
    const footerRowNumber = findRowNumberByValue(worksheet, '備註');
    const bankInfoRowNumber = findRowNumberByValue(worksheet, '匯款資訊');

    expect(itemRows).toHaveLength(12);
    expect(subtotalRowNumber).toBe(lastItemRowNumber + 1);
    expect(footerRowNumber).toBe(subtotalRowNumber + 5);
    expect(bankInfoRowNumber).toBeGreaterThan(footerRowNumber);
  });

  it('skips null brand images without throwing and produces a workbook without images', async () => {
    const items = makeItems(1);
    const bytes = await generateQuoteXlsx({
      quote: makeQuote(items),
      items,
      company: makeCompany(),
      brand: {
        logo: null,
        stamp: null,
        bank: null,
      },
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes as unknown as XlsxLoadBuffer);

    const worksheet = workbook.getWorksheet('報價單');
    expect(worksheet).toBeDefined();
    expect((worksheet as ExcelJS.Worksheet).getImages()).toHaveLength(0);
  });

  it('rejects quotes without items with a clear error', async () => {
    await expect(
      generateQuoteXlsx({
        quote: makeQuote([]),
        items: [],
        company: makeCompany(),
        brand: {},
      })
    ).rejects.toThrow('Quote XLSX requires at least one item.');
  });
});
