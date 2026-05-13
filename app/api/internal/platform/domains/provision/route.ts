import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json();

  try {
    return NextResponse.json({
      ok: true,
      data: {
        domain: body.domain,
        tenantId: body.tenantId,
        sslStatus: 'pending',
        dnsStatus: 'pending',
        provisioningStatus: 'queued',
        provider: process.env.DOMAIN_PROVIDER || 'manual',
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Domain provisioning failed.' } }, { status: 500 });
  }
}
