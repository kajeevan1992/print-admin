import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: { token: string } }) {
  try {
    const token = context.params.token;

    const rows = await prisma.$queryRawUnsafe(
      'SELECT * FROM "OwnerInvitation" WHERE "token" = $1 LIMIT 1',
      token,
    ) as any[];

    const invite = rows[0];

    if (!invite) {
      return NextResponse.json({ ok: false, error: { message: 'Invitation not found.' } }, { status: 404 });
    }

    if (invite.status === 'accepted') {
      return NextResponse.json({ ok: true, data: { alreadyAccepted: true } });
    }

    await prisma.$executeRawUnsafe(
      'UPDATE "OwnerInvitation" SET "status" = $1, "acceptedAt" = $2 WHERE "id" = $3',
      'accepted',
      new Date(),
      invite.id,
    );

    return NextResponse.json({
      ok: true,
      data: {
        accepted: true,
        tenantId: invite.tenantId,
        role: invite.role,
        email: invite.email,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Invitation acceptance failed.' } }, { status: 500 });
  }
}
