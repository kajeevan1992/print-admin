import { NextResponse } from 'next/server';
import { listDatabaseConnections } from '@/core/db/database-connection-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dbConnections = await listDatabaseConnections().catch(() => []);
  return NextResponse.json({
    ok: true,
    platform: {
      mode: 'unified-core',
      databaseConnectionStore: dbConnections.length,
      publicApiVersions: ['v1'],
      internalServices: ['tenant-db-manager', 'catalog-contracts', 'orders-contracts', 'artwork-contracts'],
    },
  });
}
