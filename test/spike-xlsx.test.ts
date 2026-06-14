import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { buildSpikeXlsx } from '../src/server/spike-xlsx';

type XlsxLoadBuffer = Parameters<ExcelJS.Workbook['xlsx']['load']>[0];

const onePixelPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

describe('xlsx spike', () => {
  it('builds an xlsx workbook with a worksheet, cell data, and one embedded png', async () => {
    const pngBytes = decodeBase64(onePixelPngBase64);

    const xlsx = await buildSpikeXlsx(pngBytes);

    expect(xlsx.byteLength).toBeGreaterThan(0);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(xlsx as unknown as XlsxLoadBuffer);

    const worksheet = workbook.getWorksheet('Spike');

    expect(workbook.worksheets.length).toBeGreaterThanOrEqual(1);
    expect(worksheet?.getCell('A1').value).toBe('Quota XLSX Spike');
    expect(worksheet?.getImages()).toHaveLength(1);
  });
});
