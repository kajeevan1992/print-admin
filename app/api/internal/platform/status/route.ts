import { NextResponse } from 'next/server';
import { listDatabaseConnections } from '@/core/db/database-connection-store';
import { resolveTenantDb } from '@/core/db/tenant-db-resolver';
import { tenantContextFromRequest } from '@/core/tenant/context';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const dbConnections = await listDatabaseConnections().catch(() => []);
  const tenantDb = await resolveTenantDb(tenantContextFromRequest(request)).catch((error) => ({
    ok: false,
    message: error instanceof Error ? error.message : 'Tenant DB resolver failed.',
  }));

  return NextResponse.json({
    ok: true,
    platform: {
      mode: 'unified-core',
      databaseConnectionStore: dbConnections.length,
      tenantDb,
      publicApiVersions: ['v1'],
      internalServices: ['tenant-db-manager', 'tenant-db-resolver', 'catalog-crud', 'orders-contracts', 'artwork-contracts', 'backup-manager'],
    },
  });
}
