import { ok } from '@/lib/api/responses';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId') ?? undefined;

  const rows = await prisma.order.findMany({
    where: tenantId ? { tenantId } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { items: true, statusHistory: true, artworks: true },
  });

  return ok(rows);
}
