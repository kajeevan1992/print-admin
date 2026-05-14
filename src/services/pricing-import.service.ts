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
};

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

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || payload?.error?.message || 'CSV pricing import failed.');
    }

    return payload.data || payload;
  },
};
