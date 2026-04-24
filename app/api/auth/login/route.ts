import { fail, ok } from '@/lib/api/responses';
import type { LoginRequest } from '@/types/api-dtos';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as LoginRequest | null;

  if (!body?.email || !body?.password) {
    return fail('INVALID_LOGIN_INPUT', 'Email and password are required.', 400);
  }

  return ok({
    userId: 'mock-user-id',
    role: 'TENANT_ADMIN',
    tenantId: 'mock-tenant-id',
    email: body.email,
    name: 'Demo User',
  });
}
