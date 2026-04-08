export type ProductSystemOption = { label: string; value: string };

export type ProductSystemField = {
  key: string;
  label: string;
  type: 'select' | 'text' | 'number';
  required?: boolean;
  options?: ProductSystemOption[];
  helpText?: string;
};

export type ConfigTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  fields: ProductSystemField[];
};

export type Material = {
  id: string;
  name: string;
  family: string;
  gsm: number;
  surcharge: number;
  compatiblePrinterIds: string[];
  compatibleFinishIds: string[];
};

export type Finish = {
  id: string;
  name: string;
  family: string;
  surcharge: number;
  setupFee: number;
};

export type PrinterProfile = {
  id: string;
  name: string;
  technology: string;
  maxSheet: string;
  turnaroundDays: number;
  materialIds: string[];
};

export const configTemplates: ConfigTemplate[] = [
  {
    id: 'business-cards',
    name: 'Business Cards',
    description: 'Standard small-format trade card with fast-run options.',
    category: 'Marketing',
    fields: [
      {
        key: 'size',
        label: 'Trim size',
        type: 'select',
        required: true,
        options: [
          { label: '85 × 55 mm', value: '85x55' },
          { label: '90 × 50 mm', value: '90x50' },
          { label: 'Square 65 × 65 mm', value: '65x65' }
        ]
      },
      {
        key: 'sides',
        label: 'Print sides',
        type: 'select',
        required: true,
        options: [
          { label: 'Single sided', value: 'single' },
          { label: 'Double sided', value: 'double' }
        ]
      },
      {
        key: 'artworkNotes',
        label: 'Artwork notes',
        type: 'text',
        helpText: 'Optional guidance for studio or prepress teams.'
      }
    ]
  },
  {
    id: 'flyers',
    name: 'Flyers & Leaflets',
    description: 'Promotional sheet product with folding and finishing support.',
    category: 'Marketing',
    fields: [
      {
        key: 'size',
        label: 'Flat size',
        type: 'select',
        required: true,
        options: [
          { label: 'A6', value: 'a6' },
          { label: 'A5', value: 'a5' },
          { label: 'A4', value: 'a4' },
          { label: 'DL', value: 'dl' }
        ]
      },
      {
        key: 'folding',
        label: 'Fold style',
        type: 'select',
        options: [
          { label: 'No fold', value: 'none' },
          { label: 'Half fold', value: 'half' },
          { label: 'Tri-fold', value: 'tri-fold' },
          { label: 'Z-fold', value: 'z-fold' }
        ]
      },
      {
        key: 'campaignCode',
        label: 'Campaign code',
        type: 'text'
      }
    ]
  },
  {
    id: 'booklets',
    name: 'Booklets',
    description: 'Multi-page product with binding and proofing controls.',
    category: 'Booklets',
    fields: [
      {
        key: 'size',
        label: 'Finished size',
        type: 'select',
        required: true,
        options: [
          { label: 'A5 Portrait', value: 'a5-portrait' },
          { label: 'A4 Portrait', value: 'a4-portrait' },
          { label: 'Square 210 × 210', value: 'square-210' }
        ]
      },
      {
        key: 'binding',
        label: 'Binding',
        type: 'select',
        required: true,
        options: [
          { label: 'Saddle stitched', value: 'saddle' },
          { label: 'Wire bound', value: 'wire' },
          { label: 'Perfect bound', value: 'perfect' }
        ]
      },
      {
        key: 'pageCount',
        label: 'Page count',
        type: 'number',
        required: true
      }
    ]
  }
];

export const materials: Material[] = [
  {
    id: 'silk-350',
    name: '350gsm Silk',
    family: 'Coated stock',
    gsm: 350,
    surcharge: 0,
    compatiblePrinterIds: ['hp-indigo-7k', 'xerox-iridesse'],
    compatibleFinishIds: ['matt-lam', 'soft-touch', 'spot-uv']
  },
  {
    id: 'uncoated-300',
    name: '300gsm Uncoated',
    family: 'Uncoated stock',
    gsm: 300,
    surcharge: 2,
    compatiblePrinterIds: ['hp-indigo-7k', 'komori-offset'],
    compatibleFinishIds: ['none', 'matt-lam']
  },
  {
    id: 'silk-170',
    name: '170gsm Silk',
    family: 'Flyer stock',
    gsm: 170,
    surcharge: 1,
    compatiblePrinterIds: ['hp-indigo-7k', 'komori-offset'],
    compatibleFinishIds: ['none', 'gloss-lam']
  }
];

export const finishes: Finish[] = [
  { id: 'none', name: 'No finish', family: 'Standard', surcharge: 0, setupFee: 0 },
  { id: 'matt-lam', name: 'Matt laminate', family: 'Laminate', surcharge: 6, setupFee: 10 },
  { id: 'gloss-lam', name: 'Gloss laminate', family: 'Laminate', surcharge: 5, setupFee: 10 },
  { id: 'soft-touch', name: 'Soft touch laminate', family: 'Premium', surcharge: 9, setupFee: 14 },
  { id: 'spot-uv', name: 'Spot UV', family: 'Premium', surcharge: 18, setupFee: 30 }
];

export const printerProfiles: PrinterProfile[] = [
  {
    id: 'hp-indigo-7k',
    name: 'HP Indigo 7K',
    technology: 'Digital',
    maxSheet: '330 × 482 mm',
    turnaroundDays: 2,
    materialIds: ['silk-350', 'uncoated-300', 'silk-170']
  },
  {
    id: 'xerox-iridesse',
    name: 'Xerox Iridesse',
    technology: 'Digital specialty',
    maxSheet: '330 × 660 mm',
    turnaroundDays: 3,
    materialIds: ['silk-350']
  },
  {
    id: 'komori-offset',
    name: 'Komori Lithrone',
    technology: 'Offset',
    maxSheet: '720 × 1020 mm',
    turnaroundDays: 4,
    materialIds: ['uncoated-300', 'silk-170']
  }
];

export type PricingQuoteInput = {
  quantity: number;
  materialId: string;
  finishId: string;
  printerProfileId: string;
};

export function getTemplateById(templateId?: string) {
  return configTemplates.find((template) => template.id === templateId) ?? configTemplates[0];
}

export function getMaterialById(materialId?: string) {
  return materials.find((material) => material.id === materialId) ?? materials[0];
}

export function getFinishById(finishId?: string) {
  return finishes.find((finish) => finish.id === finishId) ?? finishes[0];
}

export function getPrinterById(printerId?: string) {
  return printerProfiles.find((printer) => printer.id === printerId) ?? printerProfiles[0];
}

export function getAvailableFinishes(materialId?: string) {
  const material = getMaterialById(materialId);
  return finishes.filter((finish) => material.compatibleFinishIds.includes(finish.id));
}

export function getAvailablePrinters(materialId?: string) {
  return printerProfiles.filter((printer) => printer.materialIds.includes(materialId ?? getMaterialById().id));
}

export function calculatePricingQuote(input: PricingQuoteInput) {
  const material = getMaterialById(input.materialId);
  const finish = getFinishById(input.finishId);
  const printer = getPrinterById(input.printerProfileId);

  const quantity = Number.isFinite(input.quantity) && input.quantity > 0 ? input.quantity : 100;
  const baseRun = 14;
  const quantityCost = quantity * 0.08;
  const materialCost = material.surcharge + material.gsm / 100;
  const finishCost = finish.surcharge + finish.setupFee;
  const printerCost = printer.technology === 'Offset' ? 16 : printer.technology === 'Digital specialty' ? 12 : 8;
  const subtotal = baseRun + quantityCost + materialCost + finishCost + printerCost;
  const margin = subtotal * 0.28;
  const total = subtotal + margin;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    margin: Number(margin.toFixed(2)),
    total: Number(total.toFixed(2)),
    turnaroundDays: printer.turnaroundDays
  };
}
