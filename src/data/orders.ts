import type { Order } from '@/modules/orders/types';

export const ordersMock: Order[] = [
  {
    id: 'ord-1001',
    orderNumber: 'SO-240401-001',
    customerName: 'James Carter',
    organizationName: 'Northwind Realty',
    customerEmail: 'james@northwindrealty.com',
    createdAt: '2026-04-01 09:18',
    updatedAt: '2026-04-04 09:45',
    dueDate: '2026-04-08',
    status: 'in-production',
    paymentStatus: 'paid',
    productionStage: 'printing',
    total: 1248.5,
    currency: 'USD',
    itemCount: 3,
    storeName: 'US Main Store',
    shippingMethod: 'UPS Ground',
    shippingAddress: '145 West 38th St, New York, NY 10018',
    billingAddress: '145 West 38th St, New York, NY 10018',
    trackingNumber: '1Z999AA10123456784',
    notes: ['Customer requested color proof before final dispatch.', 'Rush production approved by account manager.'],
    items: [
      { id: 'line-1', productId: 'p-1001', productName: 'Premium Catalog A4', sku: 'CAT-A4-PRM', quantity: 250, unitPrice: 4.25, totalPrice: 1062.5, thumbnail: 'https://placehold.co/64x64/111827/ffffff?text=PC' },
      { id: 'line-2', productId: 'p-1002', productName: 'Matte Business Card', sku: 'BC-MAT-STD', quantity: 500, unitPrice: 0.22, totalPrice: 110, thumbnail: 'https://placehold.co/64x64/111827/ffffff?text=BC' },
      { id: 'line-3', productId: 'p-1003', productName: 'Roll-up Banner 33x80', sku: 'BAN-33-80', quantity: 1, unitPrice: 76, totalPrice: 76, thumbnail: 'https://placehold.co/64x64/111827/ffffff?text=RB' }
    ],
    activity: [
      { id: 'act-1', label: 'Order created', timestamp: '2026-04-01 09:18', tone: 'default', description: 'Order was placed through the storefront checkout.' },
      { id: 'act-2', label: 'Payment captured', timestamp: '2026-04-01 09:19', tone: 'success', description: 'Payment settled successfully through Stripe.' },
      { id: 'act-3', label: 'Proof approved', timestamp: '2026-04-02 14:40', tone: 'success', description: 'Customer approved the final proof.' },
      { id: 'act-4', label: 'Production started', timestamp: '2026-04-03 08:15', tone: 'warning', description: 'Job released to the Nevada plant.' }
    ]
  },
  {
    id: 'ord-1002',
    orderNumber: 'SO-240402-014',
    customerName: 'Olivia Bennett',
    organizationName: 'Studio Frame',
    customerEmail: 'olivia@studioframe.co',
    createdAt: '2026-04-02 11:02',
    updatedAt: '2026-04-03 17:20',
    dueDate: '2026-04-10',
    status: 'approved',
    paymentStatus: 'authorized',
    productionStage: 'proofing',
    total: 486,
    currency: 'USD',
    itemCount: 2,
    storeName: 'B2B Wholesale API',
    shippingMethod: 'FedEx Priority',
    shippingAddress: '90 Market Street, San Francisco, CA 94105',
    billingAddress: '90 Market Street, San Francisco, CA 94105',
    trackingNumber: '',
    notes: ['Waiting on vendor material confirmation.'],
    items: [
      { id: 'line-4', productId: 'p-1004', productName: 'Product Insert Leaflet', sku: 'PL-INS-01', quantity: 1200, unitPrice: 0.18, totalPrice: 216, thumbnail: 'https://placehold.co/64x64/111827/ffffff?text=PL' },
      { id: 'line-5', productId: 'p-1002', productName: 'Matte Business Card', sku: 'BC-MAT-STD', quantity: 1000, unitPrice: 0.27, totalPrice: 270, thumbnail: 'https://placehold.co/64x64/111827/ffffff?text=BC' }
    ],
    activity: [
      { id: 'act-5', label: 'Order created', timestamp: '2026-04-02 11:02', tone: 'default', description: 'Order submitted via B2B API channel.' },
      { id: 'act-6', label: 'Payment authorized', timestamp: '2026-04-02 11:04', tone: 'success', description: 'Authorization captured for invoice workflow.' },
      { id: 'act-7', label: 'Prepress review', timestamp: '2026-04-03 17:20', tone: 'warning', description: 'Awaiting signoff on supplied artwork margins.' }
    ]
  },
  {
    id: 'ord-1003',
    orderNumber: 'SO-240403-031',
    customerName: 'Grace Miller',
    organizationName: 'Miller Events',
    customerEmail: 'grace@miller-events.com',
    createdAt: '2026-04-03 16:11',
    updatedAt: '2026-04-04 07:50',
    dueDate: '2026-04-12',
    status: 'shipped',
    paymentStatus: 'paid',
    productionStage: 'dispatch',
    total: 890,
    currency: 'USD',
    itemCount: 1,
    storeName: 'US Main Store',
    shippingMethod: 'DHL Express',
    shippingAddress: '15 King St, Seattle, WA 98104',
    billingAddress: '15 King St, Seattle, WA 98104',
    trackingNumber: 'DHL-9981237742',
    notes: ['Customer requested SMS delivery notification.'],
    items: [
      { id: 'line-6', productId: 'p-1003', productName: 'Roll-up Banner 33x80', sku: 'BAN-33-80', quantity: 10, unitPrice: 89, totalPrice: 890, thumbnail: 'https://placehold.co/64x64/111827/ffffff?text=RB' }
    ],
    activity: [
      { id: 'act-8', label: 'Order created', timestamp: '2026-04-03 16:11', tone: 'default', description: 'Order submitted from storefront.' },
      { id: 'act-9', label: 'Sent to dispatch', timestamp: '2026-04-04 06:32', tone: 'success', description: 'Packages manifested and scanned for pickup.' },
      { id: 'act-10', label: 'Shipment in transit', timestamp: '2026-04-04 07:50', tone: 'success', description: 'Tracking is now active with DHL Express.' }
    ]
  }
];
