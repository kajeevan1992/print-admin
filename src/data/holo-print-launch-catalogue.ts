import type { InternalCatalogWriteInput } from '@/core/catalog/internal-catalog.service';

type LaunchProduct = InternalCatalogWriteInput & { categorySlug: string };

function value(id: string, label: string, extraCostMinor = 0, quantity?: number) {
  return { id, label, extraCostMinor, quantity, isDefault: extraCostMinor === 0 };
}

function quantityGroup(values: Array<{ id: string; label: string; quantity: number; extraCostMinor?: number }>) {
  return {
    id: 'quantity', name: 'Quantity', key: 'quantity', pricingKey: 'quantity', source: 'quantity', displayType: 'quantity-grid', required: true, defaultValueId: values[0]?.id,
    values: values.map((item, index) => ({ ...item, isDefault: index === 0, pricingInputRole: 'quantity', pricingBasis: 'per-item' })),
  };
}

function choiceGroup(id: string, name: string, source: string, values: Array<{ id: string; label: string; extraCostMinor?: number; description?: string }>) {
  return {
    id, name, key: id, pricingKey: id, source, displayType: 'radio', required: true, defaultValueId: values[0]?.id,
    values: values.map((item, index) => ({ ...item, isDefault: index === 0, pricingInputRole: source, pricingBasis: 'fixed' })),
  };
}

function modeSettings(mode: 'fixed' | 'quote', minimumChargeMinor: number) {
  const quote = mode === 'quote';
  return {
    mode: quote ? 'quote' : 'formula',
    active: true,
    customerPriceVisibility: quote ? 'request-quote' : 'show-price',
    formula: { enabled: !quote, profileKey: 'holo-print-launch', formulaKey: 'launch-fixed-options', costingBasis: quote ? 'manual-quote' : 'sheet', minimumChargeMinor, marginPercent: 0, roundingMinor: 5, requireResolvedConfig: false, allowMatrixFallback: true },
    supplier: { enabled: false, vendorId: '', vendorName: '', supplierProductId: '', supplierSku: '', pricingEndpointKey: '', supplierLeadTimeDays: 3, markupPercent: 35, cloneSupplierOptions: false, useSupplierArtworkSpec: false, blockedOptionKeys: '', syncStatus: 'not-connected' },
    quote: { enabled: quote, quoteReason: quote ? 'Custom size/specification needs manual confirmation before payment.' : 'Fixed launch product can be paid online.', hideInstantPrice: quote, showRequestQuoteButton: true, allowArtworkUploadBeforeQuote: true, requireManualApproval: quote, minimumQuoteQuantity: 1, quoteSlaHours: 4, internalOwner: 'sales' },
    routing: { priority: quote ? 'quote-first' : 'formula-first', fallbackToQuote: true, fallbackMessage: 'We will confirm the final price before production if anything needs manual review.', blockCheckoutWhenUnpriced: quote, notes: 'Holo Print polished launch catalogue.' },
  };
}

function artworkRules(kind: 'standard' | 'booklet' | 'cutline' | 'manual') {
  return {
    allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'ai', 'eps'], minFiles: 1, maxFiles: kind === 'booklet' ? 4 : 2, bleedMm: 3, requirePdf: kind === 'booklet', allowUploadArtwork: true, allowDesignFromTemplate: false, uploadChoiceMode: 'upload-or-template', sizeMatchingMode: kind === 'manual' ? 'manual-review' : 'match-selected-size', separateFilesMode: kind === 'booklet' ? 'multi-page-pdf' : kind === 'standard' ? 'single-file' : 'front-back-files', minDpi: 300, maxFileSizeMb: 100, requireCutline: kind === 'cutline', cutlineLayerName: kind === 'cutline' ? 'CutContour' : '', allowedArtworkActions: ['upload', 'request-design-help'], customerInstructions: kind === 'manual' ? 'Upload any files or notes. We will check and confirm before payment.' : 'Upload print-ready artwork with 3mm bleed where possible. You can also request design help.',
  };
}

function product(id: string, slug: string, name: string, categorySlug: string, description: string, priceFromMinor: number, taxPreset: string, mode: 'fixed' | 'quote', optionGroups: any[], artworkKind: 'standard' | 'booklet' | 'cutline' | 'manual'): LaunchProduct {
  return {
    id, slug, name, title: name, description, categoryId: categorySlug, categorySlug, isActive: true, isGlobal: false, priceFromMinor, currency: 'GBP', productType: mode === 'quote' ? 'quote' : 'standard',
    metadataJson: {
      launchCatalogue: true,
      brand: 'HOLO Print',
      storefrontBadge: mode === 'quote' ? 'Quote first' : 'Pay online',
      paymentMode: mode === 'quote' ? 'quote-then-payment-link' : 'pay-now',
      taxSettings: { taxClass: taxPreset.includes('zero') ? 'zero' : 'standard', preset: taxPreset, forceVatOnDesignServices: true },
      optionGroups,
      productModeSettings: modeSettings(mode, priceFromMinor),
      templateRules: { templateKey: `${slug}-artwork`, templateName: `${name} artwork rules`, mergeMode: 'product-only', productionMethod: mode === 'quote' ? 'manual-review' : 'digital-print', artworkRules: artworkRules(artworkKind), adminRules: [] },
      productSystem: { launchReady: true, collectionAvailable: true, deliveryAvailable: true, artworkRequired: true, quoteRequired: mode === 'quote' },
    },
  };
}

export const holoPrintLaunchCategories: InternalCatalogWriteInput[] = [
  { id: 'cat-print-products', slug: 'print-products', name: 'Print Products', title: 'Print Products', description: 'Business cards, flyers, leaflets, menus and everyday print.', isActive: true },
  { id: 'cat-large-format-signage', slug: 'large-format-signage', name: 'Large Format & Signage', title: 'Large Format & Signage', description: 'Posters, PVC banners, shop boards and display graphics.', isActive: true },
  { id: 'cat-stickers-labels', slug: 'stickers-labels', name: 'Stickers & Labels', title: 'Stickers & Labels', description: 'Sticker sheets, labels and cut-to-shape jobs.', isActive: true },
  { id: 'cat-design-services', slug: 'design-services', name: 'Design Services', title: 'Design Services', description: 'Artwork setup, design help and print-ready file support.', isActive: true },
];

export const holoPrintLaunchProducts: LaunchProduct[] = [
  product('prod-holo-business-cards', 'business-cards', 'Business Cards', 'print-products', 'Premium business cards for local businesses, events and startups.', 1900, 'business-cards', 'fixed', [choiceGroup('size', 'Size', 'size', [value('85x55', '85 × 55mm'), value('90x50', '90 × 50mm')]), choiceGroup('stock', 'Stock', 'material', [value('350gsm-silk', '350gsm Silk'), value('450gsm-silk', '450gsm Silk', 600)]), choiceGroup('sides', 'Printed sides', 'custom', [value('single-sided', 'Single sided'), value('double-sided', 'Double sided', 400)]), choiceGroup('finish', 'Finish', 'finish', [value('none', 'No lamination'), value('matt-lam', 'Matt lamination', 500), value('gloss-lam', 'Gloss lamination', 500)]), quantityGroup([{ id: '250', label: '250', quantity: 250 }, { id: '500', label: '500', quantity: 500, extraCostMinor: 700 }, { id: '1000', label: '1000', quantity: 1000, extraCostMinor: 1500 }])], 'standard'),
  product('prod-holo-flyers-leaflets', 'flyers-leaflets', 'Flyers & Leaflets', 'print-products', 'A6, A5 and A4 flyers/leaflets for promotions, menus and events.', 2900, 'leaflets-flyers', 'fixed', [choiceGroup('size', 'Size', 'size', [value('a6', 'A6'), value('a5', 'A5', 600), value('a4', 'A4', 1200)]), choiceGroup('paper', 'Paper', 'material', [value('130gsm-silk', '130gsm Silk'), value('170gsm-silk', '170gsm Silk', 500), value('250gsm-silk', '250gsm Silk', 1100)]), choiceGroup('sides', 'Printed sides', 'custom', [value('single-sided', 'Single sided'), value('double-sided', 'Double sided', 600)]), quantityGroup([{ id: '100', label: '100', quantity: 100 }, { id: '250', label: '250', quantity: 250, extraCostMinor: 900 }, { id: '500', label: '500', quantity: 500, extraCostMinor: 1600 }, { id: '1000', label: '1000', quantity: 1000, extraCostMinor: 2600 }])], 'standard'),
  product('prod-holo-posters', 'posters', 'Posters', 'large-format-signage', 'Indoor posters for promotions, events, windows and wall displays.', 1200, 'business-cards', 'fixed', [choiceGroup('size', 'Size', 'size', [value('a3', 'A3'), value('a2', 'A2', 800), value('a1', 'A1', 1700), value('a0', 'A0', 3200)]), choiceGroup('material', 'Material', 'material', [value('180gsm-poster', '180gsm poster paper'), value('photo-satin', 'Photo satin', 600)]), quantityGroup([{ id: '1', label: '1', quantity: 1 }, { id: '5', label: '5', quantity: 5, extraCostMinor: 2800 }, { id: '10', label: '10', quantity: 10, extraCostMinor: 5000 }])], 'standard'),
  product('prod-holo-pvc-banners', 'pvc-banners', 'PVC Banners', 'large-format-signage', 'Outdoor PVC banners with hemming and eyelets for shops, events and promotions.', 3900, 'signage-banners', 'fixed', [choiceGroup('size', 'Size', 'size', [value('1000x500', '1000 × 500mm'), value('2000x1000', '2000 × 1000mm', 3500), value('3000x1000', '3000 × 1000mm', 6200), value('custom', 'Custom size - request quote', 0)]), choiceGroup('finish', 'Finish', 'finish', [value('hem-eyelets', 'Hemmed with eyelets'), value('trim-only', 'Trim only')]), quantityGroup([{ id: '1', label: '1', quantity: 1 }, { id: '2', label: '2', quantity: 2, extraCostMinor: 3500 }, { id: '5', label: '5', quantity: 5, extraCostMinor: 12000 }])], 'standard'),
  product('prod-holo-stickers-labels', 'stickers-labels', 'Stickers & Labels', 'stickers-labels', 'Sticker sheets, product labels and promotional stickers.', 2500, 'stickers-labels', 'fixed', [choiceGroup('format', 'Format', 'custom', [value('sheet-labels', 'Sheet labels'), value('round', 'Round stickers'), value('cut-to-shape', 'Cut to shape - quote')]), choiceGroup('material', 'Material', 'material', [value('paper', 'Paper sticker'), value('vinyl', 'Vinyl sticker', 800)]), quantityGroup([{ id: '50', label: '50', quantity: 50 }, { id: '100', label: '100', quantity: 100, extraCostMinor: 700 }, { id: '250', label: '250', quantity: 250, extraCostMinor: 1800 }])], 'cutline'),
  product('prod-holo-booklets', 'booklets', 'Booklets', 'print-products', 'Stapled booklets, brochures and programmes. Final price depends on pages and finishing.', 0, 'booklets-brochures', 'quote', [choiceGroup('size', 'Size', 'size', [value('a5', 'A5'), value('a4', 'A4')]), choiceGroup('pages', 'Pages', 'custom', [value('8pp', '8 pages'), value('12pp', '12 pages'), value('16pp', '16 pages'), value('custom-pages', 'More pages')]), choiceGroup('paper', 'Paper', 'material', [value('130gsm-silk', '130gsm Silk'), value('170gsm-silk', '170gsm Silk')]), quantityGroup([{ id: '25', label: '25', quantity: 25 }, { id: '50', label: '50', quantity: 50 }, { id: '100', label: '100', quantity: 100 }])], 'booklet'),
  product('prod-holo-shop-boards-signage', 'shop-boards-signage', 'Shop Boards & Signage', 'large-format-signage', 'Foamex, ACM and shop signage. Custom sizing and fitting needs approval.', 0, 'signage-banners', 'quote', [choiceGroup('material', 'Material', 'material', [value('foamex', 'Foamex'), value('acm', 'ACM / Dibond'), value('correx', 'Correx')]), choiceGroup('size', 'Size', 'size', [value('small', 'Small board'), value('medium', 'Medium board'), value('custom', 'Custom size')]), quantityGroup([{ id: '1', label: '1', quantity: 1 }, { id: '2', label: '2', quantity: 2 }])], 'manual'),
  product('prod-holo-design-service', 'design-service', 'Design Service / Artwork Help', 'design-services', 'Need help preparing artwork? Submit your brief and files for a design quote.', 0, 'design-service', 'quote', [choiceGroup('service', 'Service', 'custom', [value('artwork-check', 'Artwork check'), value('basic-design', 'Basic design'), value('full-design', 'Full design')]), choiceGroup('speed', 'Turnaround', 'turnaround', [value('standard', 'Standard'), value('urgent', 'Urgent')]), quantityGroup([{ id: '1', label: '1 design job', quantity: 1 }])], 'manual'),
];
