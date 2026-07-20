import { NextRequest, NextResponse } from 'next/server';
import { requireTenantSession } from '@/core/auth/session-guard.service';
import { listAdminCustomers } from '@/core/customers/customer-admin.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, init); }

export async function GET(request: NextRequest) {
  try {
    const session = await requireTenantSession();
    const result = await listAdminCustomers(session.tenantId, {
      search: request.nextUrl.searchParams.get('search') || '',
      status: request.nextUrl.searchParams.get('status') || '',
      verification: request.nextUrl.searchParams.get('verification') || '',
      security: request.nextUrl.searchParams.get('security') || '',
      sort: request.nextUrl.searchParams.get('sort') || 'activity',
      limit: Number(request.nextUrl.searchParams.get('limit') || 300),
    });
    return json({ ok: true, source: 'tenant-customer-management', data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Customers could not be loaded.';
    return json({ ok: false, error: message }, { status: message.toLowerCase().includes('session') ? 401 : 500 });
  }
}
