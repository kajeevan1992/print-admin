export type CsvPricingImportInput = {
  file: File;
  productSlug: string;
  productName: string;
  categoryId?: string;
  markupPercent?: number;
};

export type CsvPricingImportResult = {
  product?: unknown;
  rowCount?: number;
  importedChunkRows?: number;
  optionGroupCount?: number;
  priceFromMinor?: number | null;
  productSlug?: string;
  productName?: string;
  detectedColumns?: Record<string, string | undefined>;
  chunksUploaded?: number;
};

const CHUNK_ROW_LIMIT = 750;
const CHUNK_CHAR_LIMIT = 1_600_000;

function errorMessageFromPayload(payload: any, fallback: string) {
  if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error;
  if (typeof payload?.error?.message === 'string' && payload.error.message.trim()) return payload.error.message;
  if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message;
  return fallback;
}

function splitCsvRecords(text: string) {
  const records: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += char + next;
      i += 1;
      continue;
    }
    if (char === '"') quoted = !quoted;
    if ((char === '\n' || char === '\r') && !quoted) {
      if (current.trim()) records.push(current.replace(/^\uFEFF/, ''));
      current = '';
      if (char === '\r' && next === '\n') i += 1;
      continue;
    }
    current += char;
  }
  if (current.trim()) records.push(current.replace(/^\uFEFF/, ''));
  return records;
}

function makeChunks(records: string[]) {
  const header = records[0];
  const rows = records.slice(1).filter((row) => row.trim());
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentChars = header.length + 1;
  for (const row of rows) {
    const nextSize = currentChars + row.length + 1;
    if (current.length && (current.length >= CHUNK_ROW_LIMIT || nextSize >= CHUNK_CHAR_LIMIT)) {
      chunks.push(current);
      current = [];
      currentChars = header.length + 1;
    }
    current.push(row);
    currentChars += row.length + 1;
  }
  if (current.length) chunks.push(current);
  return { header, rows, chunks };
}

async function postImportChunk(params: {
  csvText: string;
  productSlug: string;
  productName: string;
  categoryId?: string;
  markupPercent?: number;
  fileName: string;
  importMode: 'replace' | 'append';
  importSessionId: string;
  chunkIndex: number;
  totalChunks: number;
}) {
  const response = await fetch('/api/internal/catalog/pricing-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const text = await response.text();
  let payload: any = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = {}; }
  if (!response.ok || payload.ok === false) {
    const detail = errorMessageFromPayload(payload, text || `HTTP ${response.status}`);
    throw new Error(detail || 'CSV pricing import failed.');
  }
  return payload.data || payload;
}

export const pricingImportService = {
  async importCsvPricing(input: CsvPricingImportInput): Promise<CsvPricingImportResult> {
    const csvText = await input.file.text();
    const records = splitCsvRecords(csvText);
    if (records.length < 2) throw new Error('CSV must include a header row and at least one price row.');
    const { header, rows, chunks } = makeChunks(records);
    if (!chunks.length || !rows.length) throw new Error('CSV did not contain any importable price rows.');

    const importSessionId = `csv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    let lastResult: CsvPricingImportResult = {};

    for (let index = 0; index < chunks.length; index += 1) {
      const chunkRows = chunks[index];
      const chunkCsvText = [header, ...chunkRows].join('\n');
      lastResult = await postImportChunk({
        csvText: chunkCsvText,
        productSlug: input.productSlug,
        productName: input.productName,
        categoryId: input.categoryId,
        markupPercent: input.markupPercent,
        fileName: input.file.name,
        importMode: index === 0 ? 'replace' : 'append',
        importSessionId,
        chunkIndex: index,
        totalChunks: chunks.length,
      });
    }

    return {
      ...lastResult,
      chunksUploaded: chunks.length,
      rowCount: lastResult.rowCount || rows.length,
    };
  },
};
