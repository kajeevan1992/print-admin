export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCustomer, saveCustomer } from '@/core/customers/customers.service';

function responseError(error: unknown, status = 500) {
  return NextResponse.json({
    ok: false,
    source: 'internal-customers-db',
    error: error instanceof Error ? error.message : 'Customer request failed.',
  }, { status });
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const customer = await getCustomer(request, context.params.id);

    if (!customer) {
      return responseError(new Error('Customer not found.'), 404);
    }

    return NextResponse.json({
      ok: true,
      source: 'internal-customers-db',
      data: { customer },
    });
  } catch (error) {
    return responseError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    const customer = await saveCustomer(request, {
      ...body,
      id: context.params.id,
    });

    return NextResponse.json({
      ok: true,
      source: 'internal-customers-db',
      data: { customer },
    });
  } catch (error) {
    return responseError(error);
  }
}
