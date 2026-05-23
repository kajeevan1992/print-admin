import type { Id } from '@/types/common';

export type OrderStatus = 'draft' | 'pending' | 'approved' | 'in-production' | 'shipped' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'authorized' | 'paid' | 'failed' | 'refund-pending' | 'refunded';
export type ProductionStage = 'prepress' | 'proofing' | 'queued' | 'printing' | 'finishing' | 'dispatch';

export type OrderLineItem = {
  id: Id;
  productId: Id;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  thumbnail: string;
};

export type OrderTimelineEvent = {
  id: Id;
  label: string;
  timestamp: string;
  tone: 'default' | 'success' | 'warning';
  description: string;
};

export type Order = {
  id: Id;
  orderNumber: string;
  customerName: string;
  organizationName: string;
  customerEmail: string;
  createdAt: string;
  updatedAt: string;
  dueDate: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentProvider?: string;
  paymentReference?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  stripeRefundId?: string;
  stripeRefundStatus?: string;
  paidAt?: string;
  refundedAt?: string;
  refundAmountMinor?: number | string;
  refundNote?: string;
  paymentFailureReason?: string;
  productionStage: ProductionStage;
  total: number;
  currency: string;
  itemCount: number;
  storeName: string;
  shippingMethod: string;
  shippingAddress: string;
  billingAddress: string;
  trackingNumber: string;
  notes: string[];
  items: OrderLineItem[];
  activity: OrderTimelineEvent[];
};