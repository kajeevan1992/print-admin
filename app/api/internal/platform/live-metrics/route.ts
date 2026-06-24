import { NextResponse } from 'next/server';
import { platformPrisma } from '@/core/db/platform-prisma';
import { requireSuperAdmin } from '@/core/auth/session-guard.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function countRows(table: string) {
  const exists = await platformPrisma.$queryRawUnsafe<Array<{ exists: boolean }>>('SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema=current_schema() AND table_name=$1) AS exists', table).catch(() => [{ exists: false }]);
  if (!exists[0]?.exists) return 0;
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ count: bigint | number | string }>>(`SELECT COUNT(*)::bigint AS count FROM "${table}"`);
  return Number(rows[0]?.count || 0);
}

export async function GET() {
  try {
    await requireSuperAdmin();
    const tenants = await platformPrisma.$queryRawUnsafe<Array<{ id: string; name: string; slug: string; status: string; planName: string; storefrontsLimit: number; adminUsersLimit: number }>>('SELECT id,name,slug,status::text AS status,"planName","storefrontsLimit","adminUsersLimit" FROM "Tenant" ORDER BY "createdAt" DESC LIMIT 100').catch(() => []);
    const data = {
      tenants,
      metrics: {
        tenants: tenants.length,
        activeTenants: tenants.filter((row) => String(row.status).toLowerCase() === 'active').length,
        users: await countRows('User'),
        orders: await countRows('Order'),
        credentials: await countRows('ApiKey'),
        events: await countRows('AuditLog'),
        stores: tenants.reduce((sum, row) => sum + Number(row.storefrontsLimit || 0), 0),
        seats: tenants.reduce((sum, row) => sum + Number(row.adminUsersLimit || 0), 0),
      }
    };
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Metrics could not load.' }, { status: 500 });
  }
}
