import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_NAVIGATION_REGISTRY,
  getVisibleAdminNavigationRegistry,
  validateAdminNavigationRegistry
} from '@/config/admin-navigation';

export const dynamic = 'force-dynamic';

function pageExistsForHref(href: string) {
  const cleanHref = href.split('?')[0].replace(/^\//, '') || 'page';
  const appDir = path.join(process.cwd(), 'app');
  const candidates = [
    path.join(appDir, cleanHref, 'page.tsx'),
    path.join(appDir, cleanHref, 'page.ts'),
    path.join(appDir, cleanHref, 'route.ts'),
    path.join(appDir, cleanHref, 'route.tsx')
  ];

  return candidates.some((candidate) => fs.existsSync(candidate));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role') || 'admin';
  const flags = (searchParams.get('flags') || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const visible = getVisibleAdminNavigationRegistry(role, flags).map((item) => ({
    ...item,
    pageExists: pageExistsForHref(item.href)
  }));

  const validation = validateAdminNavigationRegistry();
  const missingPages = visible.filter((item) => !item.pageExists);

  return NextResponse.json({
    ok: validation.ok && missingPages.length === 0,
    source: 'internal-core',
    data: {
      role,
      totalRegistered: ADMIN_NAVIGATION_REGISTRY.length,
      visible,
      missingPages,
      validation,
      guidance: 'When adding a new page/tool, register it in src/config/admin-navigation.ts so sidebar/topbar/audit can find it.'
    }
  });
}
