import { fail, ok } from '@/lib/api/responses';
import { hasDatabaseUrl } from '@/lib/api/db-env';
import { seedTenantAndProducts } from '@/lib/seed/dev-seed';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  if (!hasDatabaseUrl()) {
    return fail('DATABASE_NOT_CONFIGURED', 'DATABASE_URL is not configured.', 503);
  }

  const result = await seedTenantAndProducts();
  return ok(result);
}
