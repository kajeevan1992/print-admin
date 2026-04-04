import type { Product, ProductTag } from '@/modules/products/types';

export const productCategories = [
  { id: 'cat-catalogs', name: 'Catalogs' },
  { id: 'cat-business-cards', name: 'Business Cards' },
  { id: 'cat-signage', name: 'Signage' },
  { id: 'cat-packaging', name: 'Packaging' }
];

export const productVendors = [
  { id: 'ven-blueline', name: 'BlueLine Print' },
  { id: 'ven-printwave', name: 'PrintWave' },
  { id: 'ven-northpress', name: 'NorthPress' }
];

export const storefrontOptions = [
  { id: 'store-na', name: 'North America' },
  { id: 'store-eu', name: 'Europe' },
  { id: 'store-b2b', name: 'Wholesale Portal' }
];

export const productTagSuggestions: ProductTag[] = [
  { id: 'tag-premium', label: 'Premium', color: 'violet' },
  { id: 'tag-fast', label: 'Fast Turnaround', color: 'emerald' },
  { id: 'tag-featured', label: 'Featured', color: 'blue' },
  { id: 'tag-wholesale', label: 'Wholesale', color: 'amber' }
];

export const productsMock: Product[] = [
  {
    id: 'p-1001',
    slug: 'premium-catalog-a4',
    sortOrder: 10,
    name: 'Premium Catalog A4',
    description: 'High-end stitched catalog for product showcases.',
    thumbnail: 'https://placehold.co/100x100/111827/ffffff?text=PC',
    previewUrl: 'https://preview.print.local/p-1001',
    cmsPageLink: '/products/premium-catalog-a4',
    commentsSummary: 2,
    lastSavedAt: '2026-04-03 14:20 UTC',
    published: true,
    isGlobal: true,
    storefrontAssignments: [
      { storefrontId: 'store-na', storefrontName: 'North America' },
      { storefrontId: 'store-eu', storefrontName: 'Europe' }
    ],
    channelIds: ['ch-1'],
    categoryId: 'cat-catalogs',
    vendorId: 'ven-blueline',
    hotFolder: '/hotfolders/catalog',
    productType: 'online',
    creationMethod: 'print_editor_template',
    status: 'active',
    pages: 24,
    units: 'mm',
    width: 210,
    height: 297,
    bleed: 3,
    productNumbers: {
      itemNumber: 'ITM-89311',
      modelNumber: 'MDL-CAT-A4',
      integrationId: 'ERP-CAT-001'
    },
    priceMapping: {
      basePrice: 12.5,
      sizeLabel: 'A4',
      dielineMapping: 'CATALOG_A4_DIELINE',
      currency: 'USD'
    },
    templateDefaults: {
      scaleFactor: 1,
      zoomState: 'fit',
      palette: 'Brand Core',
      colorSpace: 'CMYK',
      editorMode: 'advanced',
      textModes: ['point', 'paragraph'],
      imageMode: 'cover',
      previewType: '3D',
      photoGroup: 'Catalog Lifestyle',
      model3d: 'Catalog_A4_Stapled',
      defaultFont: ''
    },
    templateSetup: {
      showToolbar: true,
      showLayersPanel: true,
      showRulesPanel: true,
      lockBleed: true,
      rulesEngine: 'print-core-default'
    },
    templateAssets: {
      fonts: ['Inter', 'Montserrat'],
      layouts: ['A4 portrait'],
      themes: ['Corporate'],
      cliparts: ['Arrows', 'Badges']
    },
    attributes: [
      { id: 'attr-1', type: 'Paper', value: '170gsm Silk' },
      { id: 'attr-2', type: 'Finish', value: 'Matte' }
    ],
    comments: [
      { id: 'cm-1', author: 'Alex Rivera', timestamp: '2026-04-02 09:12 UTC', message: 'Verify font fallback before publishing.' },
      { id: 'cm-2', author: 'Mina Chen', timestamp: '2026-04-03 10:51 UTC', message: 'Dieline mapping reviewed and approved.' }
    ],
    relatedProducts: [
      { id: 'p-1002', name: 'Matte Business Card', slug: 'matte-business-card', thumbnail: 'https://placehold.co/80x80/0f172a/fff?text=BC' }
    ],
    alternateViews: [
      { id: 'view-1', label: 'Front View', url: 'https://placehold.co/400x220/111827/fff?text=Front' }
    ],
    inventory: { onHandQuantity: 1220, reorderQuantity: 350 },
    tags: [productTagSuggestions[0], productTagSuggestions[2]],
    actionState: {
      canPreview: true,
      canOpenPrintEditor: true,
      canDownloadPdf: true
    },
    updatedAt: '2026-04-03'
  },
  {
    id: 'p-1002',
    slug: 'matte-business-card',
    sortOrder: 20,
    name: 'Matte Business Card',
    description: 'Static proof-driven business card product.',
    thumbnail: 'https://placehold.co/100x100/1f2937/ffffff?text=BC',
    previewUrl: 'https://preview.print.local/p-1002',
    cmsPageLink: '/products/matte-business-card',
    commentsSummary: 1,
    lastSavedAt: '2026-04-01 18:10 UTC',
    published: false,
    isGlobal: false,
    storefrontAssignments: [{ storefrontId: 'store-na', storefrontName: 'North America' }],
    channelIds: ['ch-1', 'ch-2'],
    categoryId: 'cat-business-cards',
    vendorId: 'ven-printwave',
    hotFolder: '/hotfolders/cards',
    productType: 'static',
    creationMethod: 'idml_template',
    status: 'draft',
    pdfFileName: 'matte-business-card-proof.pdf',
    pdfFileUrl: 'https://files.print.local/matte-business-card-proof.pdf',
    pages: 2,
    units: 'mm',
    width: 90,
    height: 50,
    bleed: 2,
    productNumbers: {
      itemNumber: 'ITM-22001',
      modelNumber: 'MDL-BC-STD',
      integrationId: 'ERP-BC-210'
    },
    priceMapping: {
      basePrice: 0.2,
      sizeLabel: '90x50',
      dielineMapping: 'BC_90_50',
      currency: 'USD'
    },
    templateDefaults: {
      scaleFactor: 1,
      zoomState: 'fit',
      palette: 'Default',
      colorSpace: 'CMYK',
      editorMode: 'guided',
      textModes: ['point'],
      imageMode: 'contain',
      previewType: 'proof',
      photoGroup: 'Business Cards',
      model3d: '',
      defaultFont: 'Roboto'
    },
    templateSetup: {
      showToolbar: false,
      showLayersPanel: false,
      showRulesPanel: false,
      lockBleed: true,
      rulesEngine: 'none'
    },
    templateAssets: {
      fonts: ['Roboto'],
      layouts: [],
      themes: [],
      cliparts: []
    },
    attributes: [{ id: 'attr-3', type: 'Stock', value: '350gsm Matte' }],
    comments: [{ id: 'cm-3', author: 'Vendor Ops', timestamp: '2026-03-30 07:00 UTC', message: 'Awaiting supplier stock update.' }],
    relatedProducts: [],
    alternateViews: [],
    inventory: { onHandQuantity: 0, reorderQuantity: 200 },
    tags: [productTagSuggestions[1]],
    actionState: {
      canPreview: false,
      canOpenPrintEditor: false,
      canDownloadPdf: true
    },
    updatedAt: '2026-04-01'
  }
];
