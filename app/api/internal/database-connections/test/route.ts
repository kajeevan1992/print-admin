import { NextResponse } from 'next/server';
import { getDatabaseConnection, toConnectionInput, updateDatabaseConnectionStatus } from '@/core/db/database-connection-store';
import { testTenantDatabaseConnection } from '@/core/db/tenant-db-manager';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    let input;
    let recordId: string | undefined;

    if (body.id) {
      const record = await getDatabaseConnection(String(body.id));
      if (!record) {
        return NextResponse.json({ ok: false, message: 'Database connection not found.' }, { status: 404 });
      }
      input = toConnectionInput(record);
      recordId = record.id;
    } else {
      input = {
        host: String(body.host || ''),
        port: String(body.port || '5432'),
        database: String(body.database || ''),
        username: String(body.username || ''),
        password: String(body.password || ''),
        sslMode: body.sslMode === 'require' || body.sslMode === 'disable' ? body.sslMode : 'prefer',
      };
    }

    const result = await testTenantDatabaseConnection(input);

    if (recordId) {
      await updateDatabaseConnectionStatus(recordId, result.ok ? 'connected' : 'failed');
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : 'Connection test failed.',
    }, { status: 500 });
  }
}
