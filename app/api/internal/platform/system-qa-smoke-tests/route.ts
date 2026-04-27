import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  const tests = [
    { id: 'catalog-products-crud', area: 'Catalog', label: 'Create, edit, refresh, and delete a product', href: '/products', method: 'manual', expected: 'Product changes persist after refresh and appear in the internal products API.', priority: 'critical' },
    { id: 'catalog-categories-crud', area: 'Catalog', label: 'Create, edit, refresh, and delete a category', href: '/categories', method: 'manual', expected: 'Category changes persist after refresh and appear in the internal categories API.', priority: 'critical' },
    { id: 'pricing-engine-lab', area: 'Pricing', label: 'Run pricing diagnostics for a live product', href: '/pricing-engine-lab', method: 'manual', expected: 'Diagnostics return final price, unit price, warnings, and cost breakdown.', priority: 'high' },
    { id: 'print-maths-lab', area: 'Pricing', label: 'Run print maths calculation', href: '/print-maths-lab', method: 'manual', expected: 'Calculation returns ups per sheet, total sheets, costs, VAT, quote summary, and draft-order payload.', priority: 'high' },
    { id: 'navigation-registry', area: 'Platform', label: 'Check navigation registry health', href: '/navigation-registry', method: 'manual', expected: 'Registry page loads and reports no duplicate href errors.', priority: 'medium' },
    { id: 'system-qa-audit', area: 'Platform', label: 'Review system QA repair queue', href: '/system-qa-audit', method: 'manual', expected: 'Audit page loads summary, repair groups, and next repair recommendation.', priority: 'medium' }
  ];
  return NextResponse.json({ ok: true, source: 'internal-core', data: { count: tests.length, tests, guidance: 'Run these after each deploy before requesting the next build.' } });
}
