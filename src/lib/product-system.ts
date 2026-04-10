export type ProductTemplateFieldType = "select" | "text" | "number";
export type ProductSystemOption = { label: string; value: string };
export type ProductTemplateField = {
  key: string;
  label: string;
  type: ProductTemplateFieldType;
  options?: ProductSystemOption[];
  helpText?: string;
  visibility?: { key: string; equals: string };
  priceImpact?: number;
  required?: boolean;
};
export type ProductTemplateDefinition = {
  id: string;
  name: string;
  description: string;
  artworkProfile: string;
  productFamily: string;
  fields: ProductTemplateField[];
};
export type ProductMaterialDefinition = {
  id: string;
  name: string;
  family: string;
  surcharge: number;
  finishIds: string[];
  printerIds: string[];
  gsm: number;
  notes?: string;
};
export type ProductFinishDefinition = {
  id: string;
  name: string;
  surcharge: number;
  setupFee: number;
  compatibleFamilies?: string[];
  notes?: string;
};
export type PrinterProfileDefinition = {
  id: string;
  name: string;
  technology: string;
  turnaroundDays: number;
  supportsWhiteInk?: boolean;
  supportsLargeFormat?: boolean;
  notes?: string;
};
export type Turnaround = 'standard' | 'priority' | 'rush';
export type ArtworkProfileDefinition = {
  id: string;
  name: string;
  checklist: string[];
  proofMode: 'soft' | 'hard' | 'hybrid';
  minimumDpi: number;
  warnings: string[];
};

export const productTemplates: ProductTemplateDefinition[] = [
  {
    id: 'business-cards',
    name: 'Business Cards',
    productFamily: 'cards',
    description: 'Standard small-format trade card with premium finish support.',
    artworkProfile: 'marketing-standard',
    fields: [
      { key: 'size', label: 'Trim size', type: 'select', required: true, options: [{ label: '85 × 55 mm', value: '85x55' }, { label: '90 × 50 mm', value: '90x50' }, { label: 'Square 65 × 65 mm', value: '65x65' }] },
      { key: 'sides', label: 'Print sides', type: 'select', required: true, options: [{ label: 'Single sided', value: 'single' }, { label: 'Double sided', value: 'double' }], priceImpact: 5 },
      { key: 'cornerStyle', label: 'Corner style', type: 'select', options: [{ label: 'Square corners', value: 'square' }, { label: 'Rounded corners', value: 'rounded' }], priceImpact: 8 },
      { key: 'whiteInk', label: 'White ink layer', type: 'select', options: [{ label: 'Not required', value: 'off' }, { label: 'Include white ink', value: 'on' }], visibility: { key: 'size', equals: '65x65' }, priceImpact: 18 },
      { key: 'notes', label: 'Artwork notes', type: 'text', helpText: 'Optional guidance for studio or prepress teams.' }
    ]
  },
  {
    id: 'flyers',
    name: 'Flyers & Leaflets',
    productFamily: 'leaflets',
    description: 'Promotional sheet product with folding and campaign options.',
    artworkProfile: 'folded-leaflet',
    fields: [
      { key: 'size', label: 'Flat size', type: 'select', required: true, options: [{ label: 'A6', value: 'a6' }, { label: 'A5', value: 'a5' }, { label: 'A4', value: 'a4' }, { label: 'DL', value: 'dl' }] },
      { key: 'folding', label: 'Fold style', type: 'select', options: [{ label: 'No fold', value: 'none' }, { label: 'Half fold', value: 'half' }, { label: 'Tri-fold', value: 'tri-fold' }], priceImpact: 7 },
      { key: 'perforation', label: 'Perforation', type: 'select', options: [{ label: 'No perforation', value: 'off' }, { label: 'Add perforation', value: 'on' }], visibility: { key: 'folding', equals: 'tri-fold' }, priceImpact: 6 },
      { key: 'campaignCode', label: 'Campaign code', type: 'text' }
    ]
  },
  {
    id: 'booklets',
    name: 'Booklets',
    productFamily: 'books',
    description: 'Multi-page booklet product with binding and spine configuration.',
    artworkProfile: 'booklet-production',
    fields: [
      { key: 'size', label: 'Finished size', type: 'select', required: true, options: [{ label: 'A5 Portrait', value: 'a5' }, { label: 'A4 Portrait', value: 'a4' }] },
      { key: 'binding', label: 'Binding', type: 'select', required: true, options: [{ label: 'Saddle stitched', value: 'saddle' }, { label: 'Perfect bound', value: 'perfect' }], priceImpact: 16 },
      { key: 'pageCount', label: 'Page count', type: 'number', required: true, helpText: 'Must usually be divisible by 4.' },
      { key: 'spineText', label: 'Spine text', type: 'text', visibility: { key: 'binding', equals: 'perfect' } }
    ]
  }
];

export const productMaterials: ProductMaterialDefinition[] = [
  { id: 'silk-350', name: '350gsm Silk', family: 'cards', surcharge: 0, finishIds: ['matt-lam', 'soft-touch', 'spot-uv'], printerIds: ['hp-indigo-7k', 'xerox-iridesse'], gsm: 350, notes: 'Main trade card stock.' },
  { id: 'uncoated-300', name: '300gsm Uncoated', family: 'cards', surcharge: 2, finishIds: ['none', 'matt-lam'], printerIds: ['hp-indigo-7k', 'komori-offset'], gsm: 300, notes: 'Best for writable cards.' },
  { id: 'silk-170', name: '170gsm Silk', family: 'leaflets', surcharge: 1, finishIds: ['none', 'gloss-lam'], printerIds: ['hp-indigo-7k', 'komori-offset'], gsm: 170, notes: 'General marketing leaflet stock.' },
  { id: 'silk-130', name: '130gsm Silk', family: 'books', surcharge: 3, finishIds: ['none', 'matt-lam'], printerIds: ['komori-offset'], gsm: 130, notes: 'Inner text pages for booklets.' }
];

export const productFinishes: ProductFinishDefinition[] = [
  { id: 'none', name: 'No finish', surcharge: 0, setupFee: 0 },
  { id: 'matt-lam', name: 'Matt laminate', surcharge: 6, setupFee: 10, compatibleFamilies: ['cards', 'leaflets'] },
  { id: 'gloss-lam', name: 'Gloss laminate', surcharge: 5, setupFee: 10, compatibleFamilies: ['leaflets'] },
  { id: 'soft-touch', name: 'Soft touch laminate', surcharge: 9, setupFee: 14, compatibleFamilies: ['cards'] },
  { id: 'spot-uv', name: 'Spot UV', surcharge: 18, setupFee: 30, compatibleFamilies: ['cards'] }
];

export const printerProfiles: PrinterProfileDefinition[] = [
  { id: 'hp-indigo-7k', name: 'HP Indigo 7K', technology: 'Digital', turnaroundDays: 2, supportsWhiteInk: false, notes: 'Fast digital short runs.' },
  { id: 'xerox-iridesse', name: 'Xerox Iridesse', technology: 'Digital specialty', turnaroundDays: 3, supportsWhiteInk: true, notes: 'Best for metallic and white-ink layers.' },
  { id: 'komori-offset', name: 'Komori Lithrone', technology: 'Offset', turnaroundDays: 4, supportsWhiteInk: false, notes: 'Economical for longer runs.' }
];

export const artworkProfiles: Record<string, ArtworkProfileDefinition> = {
  'marketing-standard': {
    id: 'marketing-standard',
    name: 'Marketing standard',
    checklist: ['3 mm bleed on all edges', 'CMYK artwork preferred', 'Fonts outlined or embedded', 'Images above 300 DPI'],
    proofMode: 'soft',
    minimumDpi: 300,
    warnings: ['White ink requires specialty press selection.']
  },
  'folded-leaflet': {
    id: 'folded-leaflet',
    name: 'Folded leaflet',
    checklist: ['Fold panel widths confirmed', 'Safe area respected on fold lines', 'Bleed checked around fold edges'],
    proofMode: 'hybrid',
    minimumDpi: 250,
    warnings: ['Tri-fold layouts should be proofed with panel width notes.']
  },
  'booklet-production': {
    id: 'booklet-production',
    name: 'Booklet production',
    checklist: ['Page count divisible by 4', 'Creep allowance confirmed', 'Binding setup approved'],
    proofMode: 'hard',
    minimumDpi: 300,
    warnings: ['Perfect-bound booklets need final spine width confirmation before print.']
  }
};

const pricingTiers = [
  { upTo: 250, unitCost: 0.18 },
  { upTo: 500, unitCost: 0.12 },
  { upTo: 1000, unitCost: 0.09 },
  { upTo: 5000, unitCost: 0.06 }
];

export function getTemplateById(templateId?: string) {
  return productTemplates.find((item) => item.id === templateId) ?? productTemplates[0];
}
export function getMaterialById(materialId?: string) {
  return productMaterials.find((item) => item.id === materialId) ?? productMaterials[0];
}
export function getFinishById(finishId?: string) {
  return productFinishes.find((item) => item.id === finishId) ?? productFinishes[0];
}
export function getPrinterById(printerId?: string) {
  return printerProfiles.find((item) => item.id === printerId) ?? printerProfiles[0];
}
export function getArtworkProfile(templateId?: string) {
  const template = getTemplateById(templateId);
  return artworkProfiles[template.artworkProfile] ?? artworkProfiles['marketing-standard'];
}
export function getVisibleTemplateFields(templateId: string, values: Record<string, string>) {
  const template = getTemplateById(templateId);
  return template.fields.filter((field) => !field.visibility || values[field.visibility.key] === field.visibility.equals);
}
export function getCompatibleMaterials(templateId: string) {
  const template = getTemplateById(templateId);
  return productMaterials.filter((item) => item.family === template.productFamily);
}
export function getCompatibleFinishes(templateId: string, materialId: string) {
  const template = getTemplateById(templateId);
  const material = getMaterialById(materialId);
  return productFinishes.filter((item) => material.finishIds.includes(item.id) && (!item.compatibleFamilies || item.compatibleFamilies.includes(template.productFamily)));
}
export function getCompatiblePrinters(templateId: string, materialId: string, fieldValues: Record<string, string> = {}) {
  const material = getMaterialById(materialId);
  const wantsWhiteInk = fieldValues.whiteInk === 'on';
  return printerProfiles.filter((item) => material.printerIds.includes(item.id) && (!wantsWhiteInk || item.supportsWhiteInk));
}
export function getRuleWarnings(templateId: string, fieldValues: Record<string, string>) {
  const template = getTemplateById(templateId);
  const warnings: string[] = [];
  if (template.id === 'booklets') {
    const pageCount = Number(fieldValues.pageCount || '0');
    if (pageCount && pageCount % 4 !== 0) warnings.push('Booklet page counts should usually be divisible by 4.');
    if (fieldValues.binding === 'perfect' && !fieldValues.spineText?.trim()) warnings.push('Perfect-bound booklets should include spine text or an explicit blank-spine decision.');
  }
  if (template.id === 'flyers' && fieldValues.folding === 'tri-fold' && fieldValues.perforation === 'on') warnings.push('Tri-fold with perforation should be checked against panel widths before release.');
  if (template.id === 'business-cards' && fieldValues.size === '65x65' && fieldValues.whiteInk === 'on') warnings.push('Square cards with white ink require specialty press routing.');
  return warnings;
}

export function calculateProductEstimate(quantity: number, materialId: string, finishId: string, printerId: string, turnaround: Turnaround, fieldValues: Record<string, string> = {}) {
  const material = getMaterialById(materialId);
  const finish = getFinishById(finishId);
  const printer = getPrinterById(printerId);
  const tier = pricingTiers.find((item) => quantity <= item.upTo) ?? pricingTiers[pricingTiers.length - 1];
  const optionUpcharge = Object.values(fieldValues).reduce((sum, value) => {
    const normalized = String(value).toLowerCase();
    if (['double', 'rounded', 'on', 'perfect'].includes(normalized)) return sum + 6;
    return sum;
  }, 0);
  const baseRun = 14;
  const machineCost = printer.technology === 'Offset' ? 24 : printer.technology === 'Digital specialty' ? 18 : 12;
  const turnaroundMultiplier = turnaround === 'rush' ? 1.4 : turnaround === 'priority' ? 1.18 : 1;
  const runCost = Math.round(quantity * tier.unitCost);
  const subtotal = Math.round((baseRun + runCost + material.surcharge + finish.surcharge + finish.setupFee + machineCost + optionUpcharge) * turnaroundMultiplier);
  const service = Math.round(subtotal * 0.08);
  const margin = Math.round(subtotal * 0.32);
  return {
    subtotal,
    margin,
    service,
    total: subtotal + margin + service,
    turnaroundDays: turnaround === 'rush' ? Math.max(1, printer.turnaroundDays - 1) : turnaround === 'priority' ? Math.max(1, printer.turnaroundDays - 0.5) : printer.turnaroundDays,
    tierLabel: `up to ${tier.upTo}`,
    breakdown: [
      { label: 'Base run', value: baseRun },
      { label: 'Quantity tier', value: runCost },
      { label: 'Material uplift', value: material.surcharge },
      { label: 'Finish & setup', value: finish.surcharge + finish.setupFee },
      { label: 'Configuration options', value: optionUpcharge },
      { label: 'Machine routing', value: machineCost },
      { label: 'Service overhead', value: service },
      { label: 'Margin', value: margin }
    ]
  };
}
