import { prisma } from '@/lib/prisma';
import type { CreateOrderRequest } from '@/types/api-dtos';

function generateOrderNumber() {
  const stamp = Date.now().toString().slice(-8);
  return `ORD-${stamp}`;
}

export async function createOrder(input: CreateOrderRequest) {
  const subtotalMinor = input.items.reduce((sum, item) => sum + item.totalPriceMinor, 0);
  const shippingMinor = 0;
  const taxMinor = 0;
  const totalMinor = subtotalMinor + shippingMinor + taxMinor;

  return prisma.order.create({
    data: {
      tenantId: input.tenantId,
      customerId: input.customerId ?? null,
      orderNumber: generateOrderNumber(),
      currency: input.currency,
      subtotalMinor,
      shippingMinor,
      taxMinor,
      totalMinor,
      notes: input.notes ?? null,
      items: {
        create: input.items.map((item) => ({
          productId: item.productId ?? null,
          titleSnapshot: item.titleSnapshot,
          quantity: item.quantity,
          unitPriceMinor: item.unitPriceMinor,
          totalPriceMinor: item.totalPriceMinor,
        })),
      },
      statusHistory: {
        create: {
          status: 'DRAFT',
          note: 'Order created through API foundation.',
        },
      },
    },
  });
}

export async function getOrderByNumber(orderNumber: string) {
  return prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
      artworks: true,
    },
  });
}
