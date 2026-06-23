import { NextResponse } from 'next/server';
import { listCredentials } from '@/core/platform/credentials.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = await listCredentials('');
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Credentials could not load.' }, { status: 500 });
  }
}
