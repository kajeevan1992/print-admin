import { NextResponse } from 'next/server';
import { makeCredential } from '@/core/platform/credentials.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await makeCredential(body);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Could not complete request.' }, { status: 400 });
  }
}
