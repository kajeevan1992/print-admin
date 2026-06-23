import { NextResponse } from 'next/server';
import { clearCustomerCookie, logoutCustomer } from '@/core/auth/customer-auth.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  await logoutCustomer().catch(() => undefined);
  const response = NextResponse.json({ ok: true, source: 'internal-auth-customer-logout' });
  clearCustomerCookie(response);
  return response;
}
