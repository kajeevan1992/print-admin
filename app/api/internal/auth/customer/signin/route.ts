import { NextResponse } from 'next/server';
import { loginCustomer, setCustomerCookie } from '@/core/auth/customer-auth.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await loginCustomer(body);
    const response = NextResponse.json({ ok: true, source: 'internal-auth-customer-signin', customer: data.customer });
    setCustomerCookie(response, data.serverSession.token, data.serverSession.expiresAt);
    return response;
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Customer sign in failed.' }, { status: 401 });
  }
}
