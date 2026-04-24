import { ok, fail } from '@/lib/api/responses';
import { prisma } from '@/lib/prisma';
import { hasDatabaseUrl } from '@/lib/api/db-env';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId') ?? undefined;

  if (!hasDatabaseUrl()) {
    return fail('DATABASE_NOT_CONFIGURED', 'DATABASE_URL is not configured.', 503);
  }

  const rows = await prisma.order.findMany({
    where: tenantId ? { tenantId } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { items: true, statusHistory: true, artworks: true },
  });

  return ok(rows);
}
