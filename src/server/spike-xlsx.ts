import ExcelJS from 'exceljs';

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

export async function buildSpikeXlsx(pngBytes: Uint8Array): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Spike');

  worksheet.getCell('A1').value = 'Quota XLSX Spike';
  worksheet.getCell('A2').value = 'ExcelJS on Cloudflare Workers';

  const imageId = workbook.addImage({
    base64: `data:image/png;base64,${encodeBase64(pngBytes)}`,
    extension: 'png',
  });

  worksheet.addImage(imageId, {
    tl: { col: 1, row: 1 },
    ext: { width: 32, height: 32 },
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new Uint8Array(buffer as unknown as ArrayBufferLike);
}
