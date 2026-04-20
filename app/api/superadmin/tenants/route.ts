import { ok } from '@/lib/api/responses';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    include: { domains: true, users: true },
  });

  return ok(tenants);
}
