import { NextResponse } from 'next/server';
import { deleteDatabaseConnection, getDatabaseConnection, safeDatabaseConnection } from '@/core/db/database-connection-store';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const record = await getDatabaseConnection(id);

  if (!record) {
    return NextResponse.json({ ok: false, message: 'Database connection not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: safeDatabaseConnection(record) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await deleteDatabaseConnection(id);
  return NextResponse.json({ ok: true, message: 'Database connection deleted.' });
}
