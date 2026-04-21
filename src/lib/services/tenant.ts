import { prisma } from '@/lib/prisma';

export async function getTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug },
    include: { domains: true },
  });
}
