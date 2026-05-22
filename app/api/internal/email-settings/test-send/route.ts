import { NextResponse } from 'next/server';
import { queueInternalEmail, sendInternalEmail, smtpStatus } from '@/core/email/internal-email.service';
import { getEmailSettings } from '@/core/email/email-settings.service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const settings = await getEmailSettings();
    const to = String(body.to || settings.replyTo || settings.fromEmail || '').trim();
    const email = await queueInternalEmail({
      type: 'smtp-test',
      to,
      subject: body.subject || 'HOLO PRINT SMTP test email',
      body: body.body || `This is a test email from ${settings.brandName}. If you received this, SMTP sending is working.`,
    });
    const sent = await sendInternalEmail(email.id);
    return NextResponse.json({ ok: true, source: 'internal-email-test-send', smtp: smtpStatus(), email: sent });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-email-test-send', smtp: smtpStatus(), error: error instanceof Error ? error.message : 'Failed to send test email.' }, { status: 500 });
  }
}
