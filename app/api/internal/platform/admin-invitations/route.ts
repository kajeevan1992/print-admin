import { NextResponse } from 'next/server';
import { createAdminInvitation, listAdminInvitationSetup, revokeAdminInvitation } from '@/core/platform/admin-invitations.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try { return NextResponse.json({ ok: true, source: 'internal-platform-admin-invitations', data: await listAdminInvitationSetup() }); }
  catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Admin invitations could not load.' }, { status: 500 }); }
}

export async function POST(request: Request) {
  try { const body = await request.json().catch(() => ({})); return NextResponse.json({ ok: true, source: 'internal-platform-admin-invitations', data: await createAdminInvitation(body) }); }
  catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Admin invitation could not be created.' }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  try { const url = new URL(request.url); const id = url.searchParams.get('id') || ''; if (!id) return NextResponse.json({ ok: false, error: 'Invitation id is required.' }, { status: 400 }); return NextResponse.json({ ok: true, source: 'internal-platform-admin-invitations', data: await revokeAdminInvitation(id) }); }
  catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Admin invitation could not be revoked.' }, { status: 400 }); }
}
