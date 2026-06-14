import { Buffer } from 'node:buffer';
import ExcelJS from 'exceljs';

export async function buildSpikeXlsx(pngBytes: Uint8Array): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Spike');

  worksheet.getCell('A1').value = 'Quota XLSX Spike';
  worksheet.getCell('A2').value = 'ExcelJS on Cloudflare Workers';

  const imageId = workbook.addImage({
    buffer: Buffer.from(pngBytes),
    extension: 'png',
  });

  worksheet.addImage(imageId, {
    tl: { col: 1, row: 1 },
    ext: { width: 32, height: 32 },
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
}
