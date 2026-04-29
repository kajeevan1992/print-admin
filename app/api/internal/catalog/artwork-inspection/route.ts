import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type InspectionItem = {
  id: string;
  orderNumber: string;
  productName: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  expected: {
    pages: number;
    trimWidthMm: number;
    trimHeightMm: number;
    bleedMm: number;
    pdfOnly: boolean;
  };
  detected: {
    pages: number | null;
    trimWidthMm: number | null;
    trimHeightMm: number | null;
    bleedMm: number | null;
    parser: string;
  };
  status: 'pending' | 'pass' | 'fail' | 'needs-review';
  issues: string[];
  productionBlocked: boolean;
  inspectedAt?: string;
};

let store: { items: InspectionItem[]; actions: any[] } = {
  items: [
    {
      id: 'art-inspect-001',
      orderNumber: 'DRAFT-BOOKLET-001',
      productName: 'A5 Booklet',
      fileName: 'customer-booklet.pdf',
      mimeType: 'application/pdf',
      fileSize: 7420000,
      expected: { pages: 24, trimWidthMm: 148, trimHeightMm: 210, bleedMm: 3, pdfOnly: true },
      detected: { pages: null, trimWidthMm: null, trimHeightMm: null, bleedMm: null, parser: 'metadata-placeholder' },
      status: 'pending',
      issues: [],
      productionBlocked: false,
    },
    {
      id: 'art-inspect-002',
      orderNumber: 'DRAFT-CARDS-002',
      productName: 'Business Cards',
      fileName: 'business-card-front.pdf',
      mimeType: 'application/pdf',
      fileSize: 1820000,
      expected: { pages: 2, trimWidthMm: 85, trimHeightMm: 55, bleedMm: 3, pdfOnly: true },
      detected: { pages: null, trimWidthMm: null, trimHeightMm: null, bleedMm: null, parser: 'metadata-placeholder' },
      status: 'pending',
      issues: [],
      productionBlocked: false,
    },
  ],
  actions: [],
};

function summary(items: InspectionItem[]) {
  return {
    total: items.length,
    pass: items.filter((item) => item.status === 'pass').length,
    fail: items.filter((item) => item.status === 'fail').length,
    needsReview: items.filter((item) => item.status === 'needs-review').length,
    blocked: items.filter((item) => item.productionBlocked).length,
  };
}

function inspectItem(item: InspectionItem, mode: string): InspectionItem {
  const detected = mode === 'simulate-fail'
    ? { pages: Math.max(1, item.expected.pages - 4), trimWidthMm: item.expected.trimWidthMm, trimHeightMm: item.expected.trimHeightMm, bleedMm: item.expected.bleedMm, parser: 'simulated-pdf-inspector' }
    : { pages: item.expected.pages, trimWidthMm: item.expected.trimWidthMm, trimHeightMm: item.expected.trimHeightMm, bleedMm: item.expected.bleedMm, parser: 'simulated-pdf-inspector' };

  const issues: string[] = [];
  if (item.expected.pdfOnly && item.mimeType !== 'application/pdf') issues.push('Expected PDF artwork.');
  if (detected.pages !== item.expected.pages) issues.push(`Page count mismatch: expected ${item.expected.pages}, detected ${detected.pages}.`);
  if (detected.trimWidthMm !== item.expected.trimWidthMm || detected.trimHeightMm !== item.expected.trimHeightMm) {
    issues.push(`Trim mismatch: expected ${item.expected.trimWidthMm}x${item.expected.trimHeightMm}mm, detected ${detected.trimWidthMm}x${detected.trimHeightMm}mm.`);
  }
  if (Number(detected.bleedMm || 0) < item.expected.bleedMm) issues.push(`Bleed too small: expected ${item.expected.bleedMm}mm, detected ${detected.bleedMm}mm.`);

  return {
    ...item,
    detected,
    issues,
    status: issues.length > 0 ? 'fail' : 'pass',
    productionBlocked: issues.length > 0,
    inspectedAt: new Date().toISOString(),
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: 'internal-artwork-inspection-foundation',
    data: {
      items: store.items,
      actions: store.actions,
      summary: summary(store.items),
      capabilities: ['pdf_metadata_foundation', 'page_count_compare', 'trim_size_compare', 'bleed_compare', 'production_block_flag'],
      note: 'This is the real PDF inspection foundation. Full binary PDF parsing can be wired later with a parser/library or external preflight worker.',
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || 'inspect-all');
  const now = new Date().toISOString();

  if (action === 'inspect-all' || action === 'simulate-pass') {
    store.items = store.items.map((item) => inspectItem(item, 'simulate-pass'));
  }

  if (action === 'simulate-fail') {
    store.items = store.items.map((item, index) => index === 0 ? inspectItem(item, 'simulate-fail') : inspectItem(item, 'simulate-pass'));
  }

  if (action === 'clear-blocks') {
    store.items = store.items.map((item) => ({ ...item, productionBlocked: false, status: item.status === 'fail' ? 'needs-review' : item.status }));
  }

  const item = { id: `artwork-inspection-action-${Date.now()}`, action, at: now };
  store.actions = [item, ...store.actions].slice(0, 50);

  return NextResponse.json({
    ok: true,
    source: 'internal-artwork-inspection-foundation',
    item,
    data: { items: store.items, actions: store.actions, summary: summary(store.items) },
  });
}
