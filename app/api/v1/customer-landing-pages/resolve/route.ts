import { NextRequest, NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { listCustomerLandingPages, resolveCustomerLandingPage } from '@/modules/landing-pages/customer-landing-page-store';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-tenant-id, x-site-id',
};

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, { status, headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') || url.searchParams.get('page') || '';
  const includeDrafts = url.searchParams.get('preview') === '1' || url.searchParams.get('includeDrafts') === '1';
  const ctx = tenantContextFromRequest(request);

  try {
    if (slug) {
      const page = await resolveCustomerLandingPage(ctx, slug, { includeDrafts });
      if (!page) return json({ ok: false, error: 'Customer landing page not found.', slug }, 404);
      return json({ ok: true, source: 'customer-landing-pages', data: page });
    }

    const pages = await listCustomerLandingPages(ctx, { includeDrafts });
    return json({ ok: true, source: 'customer-landing-pages', data: { items: pages, total: pages.length } });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Customer landing pages could not load.' }, 500);
  }
}
