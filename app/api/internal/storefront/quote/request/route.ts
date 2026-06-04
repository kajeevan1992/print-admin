import { NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { createQuoteRequest } from '@/core/storefront/internal-storefront-resolver';
import { saveOrder } from '@/core/orders/orders.service';
import { decideCheckoutPayment } from '@/core/payments/payment-rules';
import { collectArtworkUploadIds, linkArtworkUploadsToOrder } from '@/core/storefront/artwork-order-linking';

export const dynamic = 'force-dynamic';

function customerName(customer: Record<string, any> = {}) {
  return String(customer.name || `${customer.first_name || customer.firstName || ''} ${customer.last_name || customer.lastName || ''}`.trim() || 'Customer');
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const checkout = body.checkout || body;
    const data = await createQuoteRequest(tenantContextFromRequest(request), body || {});
    const paymentDecision = decideCheckoutPayment({ ...checkout, payment_method: 'Quote request', quoteRequired: true });
    const artworkUploadIds = collectArtworkUploadIds({ ...body, ...checkout, items: checkout.items || body.items || [] });

    let order = null;
    let artworkLink = null;
    if (Array.isArray(checkout.items) && checkout.items.length) {
      const quoteReference = String(checkout.quoteReference || data?.quoteRequest?.id || `QUOTE-${Date.now()}`);
      const customer = checkout.customer || body.customer || {};
      order = await saveOrder(request, {
        ...checkout,
        id: checkout.id || quoteReference,
        orderNumber: quoteReference,
        quoteReference,
        status: paymentDecision.orderStatus,
        paymentStatus: paymentDecision.paymentStatus,
        paymentProvider: '',
        customerName: customerName(customer),
        customerEmail: customer.email,
        customerPhone: customer.phone,
        customerCompany: customer.company || customer.company_name || customer.companyName,
        items: checkout.items,
        totals: checkout.totals,
        artworkUploadIds,
        payload: {
          ...checkout,
          artworkUploadIds,
          quoteRequest: data.quoteRequest,
          paymentDecision,
          source: 'HostedThemeQuoteCheckoutDB',
        },
        resolver: {
          ...(checkout.resolver || {}),
          quoteRequired: true,
        },
        internalNotes: [
          'Quote checkout captured as real customer order.',
          `Next action: ${paymentDecision.nextAction}.`,
          artworkUploadIds.length ? `Artwork uploads linked: ${artworkUploadIds.join(', ')}.` : 'No artwork upload linked at quote checkout.',
        ],
      });

      artworkLink = await linkArtworkUploadsToOrder(request, { ...body, ...checkout, items: checkout.items, artworkUploadIds }, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        quoteId: order.orderNumber,
        note: `Linked during quote checkout for order ${order.orderNumber}.`,
      }).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Artwork link failed.' }));
    }

    return NextResponse.json({
      ...data,
      order,
      artworkLink,
      paymentDecision,
      payment: {
        mode: paymentDecision.mode,
        canPayNow: paymentDecision.canPayNow,
        requiresApproval: paymentDecision.requiresApproval,
        nextAction: paymentDecision.nextAction,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-storefront-resolver', error: error instanceof Error ? error.message : 'Failed to create quote request.' }, { status: 500 });
  }
}
