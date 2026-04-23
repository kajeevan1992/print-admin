import { NextResponse } from 'next/server';
import { listDatabaseConnections, safeDatabaseConnection, upsertDatabaseConnection } from '@/core/db/database-connection-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const records = await listDatabaseConnections();
  return NextResponse.json({
    ok: true,
    data: records.map(safeDatabaseConnection),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const record = await upsertDatabaseConnection({
      id: body.id || undefined,
      tenantId: String(body.tenantId || ''),
      siteId: body.siteId ? String(body.siteId) : undefined,
      scope: body.scope === 'site' ? 'site' : 'tenant',
      label: String(body.label || ''),
      host: String(body.host || ''),
      port: Number(body.port || 5432),
      database: String(body.database || ''),
      username: String(body.username || ''),
      password: body.password ? String(body.password) : undefined,
      sslMode: body.sslMode === 'disable' || body.sslMode === 'require' ? body.sslMode : 'prefer',
    });

    return NextResponse.json({
      ok: true,
      data: safeDatabaseConnection(record),
      message: 'Database connection saved with encrypted password storage.',
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : 'Could not save database connection.',
    }, { status: 500 });
  }
}
