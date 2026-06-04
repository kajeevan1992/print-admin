export type CheckoutPaymentDecision = {
  mode: 'pay-now' | 'quote-first' | 'blocked';
  orderStatus: 'AWAITING_PAYMENT' | 'AWAITING_APPROVAL' | 'ARTWORK_CHECK';
  paymentStatus: 'unpaid' | 'pending';
  canPayNow: boolean;
  requiresApproval: boolean;
  nextAction: string;
  reason: string;
  paymentLinkAvailableAfterApproval: boolean;
};

function text(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

export function wantsOnlinePayment(input: Record<string, any> = {}) {
  const method = text(input.payment_method || input.paymentMethod || input.payment?.method);
  return method.includes('pay now') || method.includes('card') || method.includes('stripe') || method.includes('online');
}

export function checkoutRequiresQuote(input: Record<string, any> = {}) {
  const method = text(input.payment_method || input.paymentMethod || input.payment?.method);
  return method.includes('quote') || Boolean(input.quoteRequired || input.resolver?.quoteRequired || input.checkout?.quoteRequired);
}

export function checkoutIsBlocked(input: Record<string, any> = {}) {
  return Boolean(input.checkoutBlocked || input.resolver?.checkoutBlocked || input.checkout?.checkoutBlocked || input.resolver?.blocked || input.checkout?.blocked);
}

export function decideCheckoutPayment(input: Record<string, any> = {}): CheckoutPaymentDecision {
  if (checkoutIsBlocked(input)) {
    return {
      mode: 'blocked',
      orderStatus: 'ARTWORK_CHECK',
      paymentStatus: 'unpaid',
      canPayNow: false,
      requiresApproval: true,
      nextAction: 'manual-review-before-payment',
      reason: 'checkout-blocked-or-artwork-review-required',
      paymentLinkAvailableAfterApproval: true,
    };
  }

  if (checkoutRequiresQuote(input)) {
    return {
      mode: 'quote-first',
      orderStatus: 'AWAITING_APPROVAL',
      paymentStatus: 'unpaid',
      canPayNow: false,
      requiresApproval: true,
      nextAction: 'approve-quote-then-send-payment-link',
      reason: 'quote-required-by-product-delivery-or-artwork',
      paymentLinkAvailableAfterApproval: true,
    };
  }

  return {
    mode: wantsOnlinePayment(input) ? 'pay-now' : 'quote-first',
    orderStatus: wantsOnlinePayment(input) ? 'AWAITING_PAYMENT' : 'AWAITING_APPROVAL',
    paymentStatus: wantsOnlinePayment(input) ? 'pending' : 'unpaid',
    canPayNow: wantsOnlinePayment(input),
    requiresApproval: !wantsOnlinePayment(input),
    nextAction: wantsOnlinePayment(input) ? 'create-stripe-checkout-session' : 'approve-quote-then-send-payment-link',
    reason: wantsOnlinePayment(input) ? 'fixed-price-online-payment-selected' : 'customer-selected-review-first',
    paymentLinkAvailableAfterApproval: !wantsOnlinePayment(input),
  };
}

export function canCreatePaymentSessionForOrder(order: Record<string, any> = {}) {
  const status = String(order.status || '').toUpperCase();
  const paymentStatus = text(order.paymentStatus || order.payment?.paymentStatus);
  const totalMinor = Number(order.totalMinor || 0);
  const approvedStatuses = new Set(['AWAITING_PAYMENT', 'APPROVED', 'ARTWORK_CHECK', 'IN_PRODUCTION', 'QUALITY_CHECK']);

  if (!totalMinor || totalMinor <= 0) return { ok: false, reason: 'Order total must be greater than zero before payment.' };
  if (paymentStatus === 'paid') return { ok: false, reason: 'Order is already marked as paid.' };
  if (status === 'AWAITING_APPROVAL') return { ok: false, reason: 'Quote/order must be approved before a payment link can be created.' };
  if (status === 'CANCELLED') return { ok: false, reason: 'Cancelled orders cannot be paid online.' };
  if (!approvedStatuses.has(status)) return { ok: false, reason: `Order status ${status || 'unknown'} is not ready for payment.` };

  return { ok: true, reason: 'order-ready-for-card-payment' };
}
