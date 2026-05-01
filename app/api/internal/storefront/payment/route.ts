export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { applyPaymentEventToOrder } from '@/core/storefront/order-payment-safety'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const result = await applyPaymentEventToOrder(request, body)

    return Response.json({
      ok: true,
      data: result
    })
  } catch (e) {
    return Response.json({
      ok: false,
      error: e instanceof Error ? e.message : 'Payment failed'
    }, { status: 500 })
  }
}
