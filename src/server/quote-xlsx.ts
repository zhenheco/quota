import ExcelJS from 'exceljs';
import type { Company, Quote, QuoteItem } from './types';

const GOLD = 'FFB97E19';
const TEXT_GRAY = 'FF5D5B5A';
const LIGHT_GOLD = 'FFF6E7D1';
const WHITE = 'FFFFFFFF';
const MONEY_FORMAT = '#,##0';

export interface QuoteXlsxBrand {
  logo?: ArrayBuffer;
  stamp?: ArrayBuffer;
  bank?: ArrayBuffer;
}

export interface QuoteXlsxInput {
  quote: Quote;
  items: QuoteItem[];
  company: Company;
  brand: QuoteXlsxBrand;
}

type ImageExtension = 'png' | 'jpeg';

export async function generateQuoteXlsx(input: QuoteXlsxInput): Promise<Uint8Array> {
  validateInput(input);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = input.company.name;
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('報價單', {
    pageSetup: {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: {
        left: 0.35,
        right: 0.35,
        top: 0.45,
        bottom: 0.45,
        header: 0.2,
        footer: 0.2,
      },
    },
    views: [{ showGridLines: false }],
  });

  configureColumns(worksheet);
  buildHeader(worksheet, input);
  const tableStartRow = buildItemsTable(worksheet, input.items);
  const totalsStartRow = tableStartRow + input.items.length + 1;
  buildTotals(worksheet, input.quote, totalsStartRow);
  const footerStartRow = totalsStartRow + 5;
  buildFooter(worksheet, input, footerStartRow);
  addBrandImages(workbook, worksheet, input.brand, footerStartRow);

  const buffer = await workbook.xlsx.writeBuffer();

  return toUint8Array(buffer as ArrayBuffer | ArrayBufferView);
}

function validateInput(input: QuoteXlsxInput): void {
  if (input.items.length === 0) {
    throw new Error('Quote XLSX requires at least one item.');
  }

  if (input.quote.quote_no.trim() === '') {
    throw new Error('Quote XLSX requires quote_no.');
  }

  if (input.company.name.trim() === '') {
    throw new Error('Quote XLSX requires company.name.');
  }
}

function configureColumns(worksheet: ExcelJS.Worksheet): void {
  worksheet.columns = [
    { key: 'index', width: 8 },
    { key: 'name', width: 20 },
    { key: 'description', width: 30 },
    { key: 'qty', width: 10 },
    { key: 'unit', width: 10 },
    { key: 'unitPrice', width: 14 },
    { key: 'amount', width: 15 },
  ];

  for (let rowNumber = 1; rowNumber <= 45; rowNumber += 1) {
    worksheet.getRow(rowNumber).height = 22;
  }
}

function buildHeader(worksheet: ExcelJS.Worksheet, input: QuoteXlsxInput): void {
  worksheet.mergeCells('D1:E1');
  worksheet.mergeCells('F1:G1');
  worksheet.mergeCells('F2:G2');
  worksheet.mergeCells('D3:G3');

  setCell(worksheet, 'D1', input.company.name, {
    font: { size: 18, bold: true, color: { argb: TEXT_GRAY } },
    alignment: { vertical: 'middle' },
  });
  setCell(worksheet, 'D2', input.company.address ?? '', baseTextStyle());
  setCell(worksheet, 'D3', input.company.phone ? `電話 ${input.company.phone}` : '', baseTextStyle());
  setCell(worksheet, 'F1', '報價單', {
    font: { size: 24, bold: true, color: { argb: GOLD } },
    alignment: { horizontal: 'right', vertical: 'middle' },
  });
  setCell(worksheet, 'F2', 'QUOTATION', {
    font: { size: 12, bold: true, color: { argb: TEXT_GRAY } },
    alignment: { horizontal: 'right', vertical: 'middle' },
  });

  worksheet.getRow(1).height = 34;
  worksheet.getRow(2).height = 24;
  worksheet.getRow(3).height = 24;

  addDivider(worksheet, 4);

  setLabelValue(worksheet, 6, 1, '客戶名稱', input.quote.client_name ?? '');
  setLabelValue(worksheet, 7, 1, '聯絡人', input.quote.client_contact ?? '');
  setLabelValue(worksheet, 8, 1, '電話', input.quote.client_phone ?? '');
  setLabelValue(worksheet, 6, 5, '報價單號', input.quote.quote_no);
  setLabelValue(worksheet, 7, 5, '報價日期', formatDate(input.quote.quote_date));
  setLabelValue(worksheet, 8, 5, '有效期限', formatDate(input.quote.valid_until));

  worksheet.mergeCells('B10:G10');
  setCell(worksheet, 'A10', '主旨', labelStyle());
  setCell(worksheet, 'B10', input.quote.subject ?? '', {
    font: { size: 14, bold: true, color: { argb: TEXT_GRAY } },
    alignment: { vertical: 'middle', wrapText: true },
  });
  worksheet.getRow(10).height = 28;
}

function buildItemsTable(worksheet: ExcelJS.Worksheet, items: QuoteItem[]): number {
  const headerRowNumber = 12;
  const headerRow = worksheet.getRow(headerRowNumber);
  const headers = ['項次', '品名', '說明', '數量', '單位', '單價', '金額'];

  headerRow.values = headers;
  headerRow.height = 26;

  for (let column = 1; column <= headers.length; column += 1) {
    const cell = headerRow.getCell(column);
    cell.fill = solidFill(GOLD);
    cell.font = { bold: true, color: { argb: WHITE } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = tableBorder();
  }

  items.forEach((item, index) => {
    const row = worksheet.getRow(headerRowNumber + index + 1);
    row.height = 34;
    row.getCell(1).value = index + 1;
    row.getCell(2).value = item.name;
    row.getCell(3).value = item.description ?? '';
    row.getCell(4).value = item.qty;
    row.getCell(5).value = item.unit ?? '';
    row.getCell(6).value = item.unit_price;
    row.getCell(7).value = item.amount;

    for (let column = 1; column <= headers.length; column += 1) {
      const cell = row.getCell(column);
      cell.font = { color: { argb: TEXT_GRAY } };
      cell.alignment = {
        horizontal: column >= 4 ? 'right' : column === 1 ? 'center' : 'left',
        vertical: 'middle',
        wrapText: true,
      };
      cell.border = tableBorder();
    }

    row.getCell(6).numFmt = MONEY_FORMAT;
    row.getCell(7).numFmt = MONEY_FORMAT;
  });

  return headerRowNumber;
}

function buildTotals(worksheet: ExcelJS.Worksheet, quote: Quote, startRow: number): void {
  setTotalRow(worksheet, startRow, '小計', quote.subtotal, false);
  setTotalRow(worksheet, startRow + 1, '稅率', quote.tax_rate, false, '0%');
  setTotalRow(worksheet, startRow + 2, '稅金', quote.tax_amount, false);
  setTotalRow(worksheet, startRow + 3, '總計', quote.total, true);
}

function setTotalRow(
  worksheet: ExcelJS.Worksheet,
  rowNumber: number,
  label: string,
  value: number,
  emphasized: boolean,
  numFmt = MONEY_FORMAT
): void {
  worksheet.mergeCells(rowNumber, 1, rowNumber, 5);
  const labelCell = worksheet.getRow(rowNumber).getCell(6);
  const valueCell = worksheet.getRow(rowNumber).getCell(7);

  labelCell.value = label;
  valueCell.value = value;
  valueCell.numFmt = numFmt;

  for (const cell of [labelCell, valueCell]) {
    cell.font = { bold: emphasized, color: { argb: emphasized ? GOLD : TEXT_GRAY } };
    if (emphasized) {
      cell.fill = solidFill(LIGHT_GOLD);
    }
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: GOLD } },
      bottom: emphasized ? { style: 'medium', color: { argb: GOLD } } : undefined,
    };
  }
}

function buildFooter(worksheet: ExcelJS.Worksheet, input: QuoteXlsxInput, startRow: number): void {
  worksheet.mergeCells(startRow, 1, startRow, 7);
  setCell(worksheet, `A${startRow}`, '備註', labelStyle());
  worksheet.mergeCells(startRow + 1, 1, startRow + 2, 7);
  setCell(worksheet, `A${startRow + 1}`, input.quote.notes ?? input.company.default_notes ?? '', {
    ...baseTextStyle(),
    alignment: { wrapText: true, vertical: 'top' },
  });

  const bankRow = startRow + 4;
  worksheet.mergeCells(bankRow, 1, bankRow, 4);
  setCell(worksheet, `A${bankRow}`, '匯款資訊', labelStyle());
  worksheet.mergeCells(bankRow + 1, 1, bankRow + 5, 4);
  setCell(worksheet, `A${bankRow + 1}`, input.company.bank_info ?? '', {
    ...baseTextStyle(),
    alignment: { wrapText: true, vertical: 'top' },
  });
}

function addBrandImages(
  workbook: ExcelJS.Workbook,
  worksheet: ExcelJS.Worksheet,
  brand: QuoteXlsxBrand,
  footerStartRow: number
): void {
  addImage(workbook, worksheet, brand.logo, 'png', {
    tl: { col: 0.2, row: 0.2 },
    ext: { width: 92, height: 92 },
  });
  addImage(workbook, worksheet, brand.stamp, 'png', {
    tl: { col: 4.2, row: footerStartRow + 3.4 },
    ext: { width: 92, height: 90 },
  });
  addImage(workbook, worksheet, brand.bank, 'jpeg', {
    tl: { col: 5.4, row: footerStartRow + 3.2 },
    ext: { width: 190, height: 114 },
  });
}

function addImage(
  workbook: ExcelJS.Workbook,
  worksheet: ExcelJS.Worksheet,
  bytes: ArrayBuffer | undefined,
  extension: ImageExtension,
  position: ExcelJS.ImagePosition
): void {
  if (bytes === undefined) {
    return;
  }

  const imageId = workbook.addImage({
    buffer: bytes as ExcelJS.Image['buffer'],
    extension,
  });

  worksheet.addImage(imageId, position);
}

function setLabelValue(worksheet: ExcelJS.Worksheet, rowNumber: number, labelColumn: number, label: string, value: string): void {
  const row = worksheet.getRow(rowNumber);
  const labelCell = row.getCell(labelColumn);
  const valueCell = row.getCell(labelColumn + 1);

  labelCell.value = label;
  valueCell.value = value;
  labelCell.style = labelStyle();
  valueCell.style = baseTextStyle();
}

function addDivider(worksheet: ExcelJS.Worksheet, rowNumber: number): void {
  for (let column = 1; column <= 7; column += 1) {
    worksheet.getRow(rowNumber).getCell(column).border = {
      bottom: { style: 'medium', color: { argb: GOLD } },
    };
  }
}

function setCell(worksheet: ExcelJS.Worksheet, address: string, value: string | number, style: Partial<ExcelJS.Style>): void {
  const cell = worksheet.getCell(address);
  cell.value = value;
  cell.style = style;
}

function baseTextStyle(): Partial<ExcelJS.Style> {
  return {
    font: { color: { argb: TEXT_GRAY } },
    alignment: { vertical: 'middle' },
  };
}

function labelStyle(): Partial<ExcelJS.Style> {
  return {
    font: { bold: true, color: { argb: GOLD } },
    alignment: { vertical: 'middle' },
  };
}

function solidFill(color: string): ExcelJS.Fill {
  return {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: color },
  };
}

function tableBorder(): Partial<ExcelJS.Borders> {
  return {
    top: { style: 'thin', color: { argb: GOLD } },
    left: { style: 'thin', color: { argb: GOLD } },
    bottom: { style: 'thin', color: { argb: GOLD } },
    right: { style: 'thin', color: { argb: GOLD } },
  };
}

function formatDate(value: string | null): string {
  if (value === null || value.trim() === '') {
    return '';
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return value;
}

function toUint8Array(buffer: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (buffer instanceof ArrayBuffer) {
    return new Uint8Array(buffer);
  }

  const sliced = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  return new Uint8Array(sliced);
}
