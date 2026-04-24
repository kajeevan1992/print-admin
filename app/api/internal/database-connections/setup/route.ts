import { NextResponse } from 'next/server';
import { getDatabaseConnection, toConnectionInput } from '@/core/db/database-connection-store';
import { runTenantDatabaseSetup } from '@/core/db/tenant-db-setup';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const record = await getDatabaseConnection(String(body.id || ''));

    if (!record) {
      return NextResponse.json({ ok: false, message: 'Database connection not found.' }, { status: 404 });
    }

    const result = await runTenantDatabaseSetup(toConnectionInput(record));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : 'Database setup failed.',
      steps: [],
    }, { status: 500 });
  }
}
