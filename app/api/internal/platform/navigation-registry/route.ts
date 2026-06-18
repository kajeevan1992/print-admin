import { NextRequest, NextResponse } from 'next/server';
import { adminNavigationRegistry } from '@/config/admin-navigation';

export const dynamic = 'force-dynamic';

function visible(role: string, flags: string[]) {
  return adminNavigationRegistry.filter((item) => {
    const roleOk = !item.roles?.length || item.roles.includes(role as any);
    const flagOk = !item.featureFlagKey || flags.includes(item.featureFlagKey);
    return !item.hidden && roleOk && flagOk;
  });
}

function validation() {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const item of adminNavigationRegistry) {
    if (!item.label || !item.href) errors.push('Missing label or href');
    if (seen.has(item.href)) errors.push(`Duplicate ${item.href}`);
    seen.add(item.href);
  }
  return { ok: errors.length === 0, errors, warnings: [] as string[] };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role') || 'admin';
  const flags = (searchParams.get('flags') || '').split(',').map((item) => item.trim()).filter(Boolean);
  const validationResult = validation();
  return NextResponse.json({
    ok: validationResult.ok,
    source: 'internal-core',
    data: {
      role,
      totalRegistered: adminNavigationRegistry.length,
      visible: visible(role, flags).map((item) => ({ ...item, pageExists: true })),
      missingPages: [],
      validation: validationResult,
      guidance: 'Register new pages in src/config/admin-navigation.ts.'
    }
  });
}
