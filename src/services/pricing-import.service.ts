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
  optionGroupCount?: number;
  priceFromMinor?: number | null;
  productSlug?: string;
  productName?: string;
  detectedColumns?: Record<string, string | undefined>;
};

function errorMessageFromPayload(payload: any, fallback: string) {
  if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error;
  if (typeof payload?.error?.message === 'string' && payload.error.message.trim()) return payload.error.message;
  if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message;
  return fallback;
}

export const pricingImportService = {
  async importCsvPricing(input: CsvPricingImportInput): Promise<CsvPricingImportResult> {
    const form = new FormData();
    form.set('file', input.file);
    form.set('productSlug', input.productSlug);
    form.set('productName', input.productName);
    if (input.categoryId) form.set('categoryId', input.categoryId);
    form.set('markupPercent', String(input.markupPercent ?? 0));

    const response = await fetch('/api/internal/catalog/pricing-import', {
      method: 'POST',
      body: form,
    });

    const text = await response.text();
    let payload: any = {};
    try { payload = text ? JSON.parse(text) : {}; } catch { payload = {}; }

    if (!response.ok || payload.ok === false) {
      const detail = errorMessageFromPayload(payload, text || `HTTP ${response.status}`);
      throw new Error(detail || 'CSV pricing import failed.');
    }

    return payload.data || payload;
  },
};
