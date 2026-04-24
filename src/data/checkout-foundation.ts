export type CheckoutStepKey = 'cart' | 'details' | 'shipping' | 'payment' | 'review';

export const checkoutFoundation = {
  shippingMethods: [
    { id: 'standard', label: 'Standard delivery', meta: '2–3 days · Included' },
    { id: 'priority', label: 'Priority delivery', meta: '1–2 days · +£12' },
    { id: 'collection', label: 'Collection', meta: 'By arrangement · £0' }
  ],
  paymentMethods: [
    { id: 'card', label: 'Card payment', meta: 'Frontend shell for future payment provider wiring' },
    { id: 'po', label: 'Purchase order', meta: 'B2B-friendly route for internal approvals' },
    { id: 'invoice', label: 'Invoice account', meta: 'For approved customer accounts and enterprise flows' }
  ],
  summary: {
    subtotal: '£95.00',
    shipping: '£0.00',
    tax: '£19.00',
    total: '£114.00'
  }
};
