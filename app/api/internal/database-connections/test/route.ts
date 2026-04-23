import { NextResponse } from 'next/server';
import { testTenantDatabaseConnection } from '@/core/db/tenant-db-manager';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await testTenantDatabaseConnection({
      host: String(body.host || ''),
      port: String(body.port || '5432'),
      database: String(body.database || ''),
      username: String(body.username || ''),
      password: String(body.password || ''),
      sslMode: body.sslMode === 'require' || body.sslMode === 'disable' ? body.sslMode : 'prefer',
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : 'Connection test failed.' }, { status: 500 });
  }
}
