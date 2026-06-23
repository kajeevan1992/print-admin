import { NextResponse } from 'next/server';
import { listSecurityAuditEvents } from '@/core/security/security-audit.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await listSecurityAuditEvents({ limit: Number(url.searchParams.get('limit') || 100), action: url.searchParams.get('action') || '', search: url.searchParams.get('search') || '' });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Events could not load.' }, { status: 500 });
  }
}
