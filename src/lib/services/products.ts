import { prisma } from '@/lib/prisma';

export async function listProducts(tenantId?: string) {
  return prisma.product.findMany({
    where: tenantId ? { tenantId, isActive: true } : { isActive: true },
    orderBy: { createdAt: 'desc' },
    include: { variants: true },
  });
}

export async function getProductBySlug(slug: string, tenantId?: string) {
  return prisma.product.findFirst({
    where: {
      slug,
      ...(tenantId ? { tenantId } : {}),
    },
    include: { variants: true },
  });
}
