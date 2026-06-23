import { NextResponse } from 'next/server';
import { acceptAdminInvitation } from '@/core/platform/admin-invitations.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await acceptAdminInvitation(body);
    return NextResponse.json({ ok: true, source: 'internal-auth-accept-invite', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-auth-accept-invite', error: error instanceof Error ? error.message : 'Invitation could not be accepted.' }, { status: 400 });
  }
}
