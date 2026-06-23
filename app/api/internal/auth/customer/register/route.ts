import { NextResponse } from 'next/server';
import { registerCustomer, setCustomerCookie } from '@/core/auth/customer-auth.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await registerCustomer(body);
    const response = NextResponse.json({ ok: true, source: 'internal-auth-customer-register', customer: data.customer });
    setCustomerCookie(response, data.serverSession.token, data.serverSession.expiresAt);
    return response;
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Customer registration failed.' }, { status: 400 });
  }
}
