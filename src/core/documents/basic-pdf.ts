export type BasicPdfLine = { text: string; size?: number; bold?: boolean; gapAfter?: number };

function ascii(value: unknown) {
  return String(value ?? '')
    .replace(/£/g, 'GBP ')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function escapePdf(value: string) { return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
function wrap(text: string, max = 88) {
  const words = ascii(text).split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > max && current) { lines.push(current); current = word; }
    else current = candidate;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

export function createBasicPdf(input: { title: string; lines: BasicPdfLine[]; footer?: string }) {
  const expanded: BasicPdfLine[] = [];
  for (const line of input.lines) {
    const max = line.size && line.size >= 16 ? 60 : 88;
    const rows = wrap(line.text, max);
    rows.forEach((text, index) => expanded.push({ ...line, text, gapAfter: index === rows.length - 1 ? line.gapAfter : 0 }));
  }
  const pageCapacity = 48;
  const pages: BasicPdfLine[][] = [];
  for (let index = 0; index < expanded.length; index += pageCapacity) pages.push(expanded.slice(index, index + pageCapacity));
  if (!pages.length) pages.push([{ text: input.title, size: 18, bold: true }]);

  const objects: string[] = ['', '', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'];
  const pageObjectNumbers: number[] = [];
  for (const [pageIndex, pageLines] of pages.entries()) {
    const commands: string[] = ['BT', '50 790 Td'];
    for (const line of pageLines) {
      const size = Math.max(7, Math.min(24, Number(line.size || 10)));
      commands.push(`/${line.bold ? 'F2' : 'F1'} ${size} Tf`);
      commands.push(`(${escapePdf(ascii(line.text))}) Tj`);
      commands.push(`0 -${Math.max(12, Math.round(size * 1.45) + Number(line.gapAfter || 0))} Td`);
    }
    const footer = ascii(input.footer || `${input.title} - page ${pageIndex + 1} of ${pages.length}`);
    commands.push('ET', 'BT', '/F1 8 Tf', '50 30 Td', `(${escapePdf(footer)}) Tj`, 'ET');
    const stream = commands.join('\n');
    const contentNumber = objects.length;
    objects.push(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`);
    const pageNumber = objects.length;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNumber} 0 R >>`);
    pageObjectNumbers.push(pageNumber);
  }
  objects[2] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(' ')}] /Count ${pageObjectNumbers.length} >>`;
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';

  let output = '%PDF-1.4\n%PDFDOC\n';
  const offsets = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = Buffer.byteLength(output, 'utf8');
    output += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(output, 'utf8');
  output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) output += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output, 'utf8');
}
