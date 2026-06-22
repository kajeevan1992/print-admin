import { NextResponse } from 'next/server';
import { Client } from 'pg';
import { getRuntimeDatabaseInfo, getRuntimeDatabaseUrl } from '@/core/db/platform-prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const database = getRuntimeDatabaseInfo();
  const connectionString = getRuntimeDatabaseUrl();
  const startedAt = Date.now();

  if (!connectionString) {
    return NextResponse.json({ ok: false, source: 'internal-auth-db-ping', database, error: 'No database URL configured.' }, { status: 500 });
  }

  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 10000,
    query_timeout: 10000,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const result = await client.query('select current_database() as database, current_user as user_name, now() as server_time');
    return NextResponse.json({ ok: true, source: 'internal-auth-db-ping', database, durationMs: Date.now() - startedAt, result: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-auth-db-ping', database, durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : 'Database ping failed.' }, { status: 500 });
  } finally {
    await client.end().catch(() => undefined);
  }
}
