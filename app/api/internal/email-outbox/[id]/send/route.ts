import { NextResponse } from 'next/server';
import { sendInternalEmail, smtpStatusForRequest } from '@/core/email/internal-email.service';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string } };

export async function POST(request: Request, context: RouteContext) {
  try {
    const email = await sendInternalEmail(context.params.id, request);
    return NextResponse.json({ ok: true, source: 'internal-email-send', smtp: await smtpStatusForRequest(request), email });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-email-send', smtp: await smtpStatusForRequest(request), error: error instanceof Error ? error.message : 'Failed to send email.' }, { status: 500 });
  }
}
