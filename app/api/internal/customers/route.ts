export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { listCustomers, saveCustomer } from '@/core/customers/customers.service';

function responseError(error: unknown, status = 500) {
  return NextResponse.json({
    ok: false,
    source: 'internal-customers-db',
    error: error instanceof Error ? error.message : 'Customers request failed.',
  }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    const limit = Number(request.nextUrl.searchParams.get('limit') || 100);

    const customers = await listCustomers(request, {
      email,
      limit,
    });

    return NextResponse.json({
      ok: true,
      source: 'internal-customers-db',
      data: {
        customers,
        count: customers.length,
      },
    });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const customer = await saveCustomer(request, body);

    return NextResponse.json({
      ok: true,
      source: 'internal-customers-db',
      data: { customer },
    });
  } catch (error) {
    return responseError(error);
  }
}
