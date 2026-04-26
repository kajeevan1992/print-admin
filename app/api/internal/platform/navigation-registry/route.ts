import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_NAVIGATION_REGISTRY, getVisibleAdminNavigationRegistry } from '@/config/admin-navigation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role') || 'admin';
  const flags = (searchParams.get('flags') || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return NextResponse.json({
    ok: true,
    source: 'internal-core',
    data: {
      role,
      totalRegistered: ADMIN_NAVIGATION_REGISTRY.length,
      visible: getVisibleAdminNavigationRegistry(role, flags)
    }
  });
}
