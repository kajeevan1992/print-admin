import { ok, fail } from '@/lib/api/responses';
import { prisma } from '@/lib/prisma';
import { hasDatabaseUrl } from '@/lib/api/db-env';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  if (!hasDatabaseUrl()) {
    return fail('DATABASE_NOT_CONFIGURED', 'DATABASE_URL is not configured.', 503);
  }

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    include: { domains: true, users: true },
  });

  return ok(tenants);
}
