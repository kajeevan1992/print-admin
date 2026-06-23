import { NextResponse } from 'next/server';
import { readCustomerSessionFromCookie } from '@/core/auth/customer-auth.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const customer = await readCustomerSessionFromCookie();
  if (!customer) return NextResponse.json({ ok: false, error: 'Customer session required.' }, { status: 401 });
  return NextResponse.json({ ok: true, source: 'internal-auth-customer-session', customer });
}
