import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';

type CustomerInput = Record<string, any>;

async function tenantIdFromRequest(request: Request) {
  const context = tenantContextFromRequest(request);
  const raw = String(context.tenantId || '').trim();

  const tenant =
    (raw && (await prisma.tenant.findUnique({ where: { id: raw }, select: { id: true } }))) ||
    (raw && (await prisma.tenant.findUnique({ where: { slug: raw }, select: { id: true } }))) ||
    (await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }));

  if (!tenant) {
    throw new Error('No tenant available for customers.');
  }

  return tenant.id;
}

export function normalizeCustomer(user: any) {
  return {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name || '',
    phone: user.phone || '',
    company: user.company || '',
    role: user.role || 'CUSTOMER',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    source: 'internal-customers-db',
  };
}

export async function listCustomers(request: Request, options: Record<string, any> = {}) {
  const tenantId = await tenantIdFromRequest(request);

  const users = await prisma.user.findMany({
    where: {
      tenantId,
      ...(options.email ? { email: { contains: String(options.email), mode: 'insensitive' } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: Math.max(1, Math.min(200, Number(options.limit || 100))),
  });

  return users.map(normalizeCustomer);
}

export async function getCustomer(request: Request, id: string) {
  const tenantId = await tenantIdFromRequest(request);

  const user = await prisma.user.findFirst({
    where: {
      tenantId,
      OR: [{ id }, { email: id }],
    },
  });

  return user ? normalizeCustomer(user) : null;
}

export async function saveCustomer(request: Request, input: CustomerInput) {
  const tenantId = await tenantIdFromRequest(request);
  const id = String(input.id || '').trim();
  const email = String(input.email || '').trim().toLowerCase();

  if (!email) {
    throw new Error('Customer email is required.');
  }

  const existing = id
    ? await prisma.user.findFirst({ where: { tenantId, id }, select: { id: true } })
    : await prisma.user.findFirst({ where: { tenantId, email }, select: { id: true } });

  const data = {
    tenantId,
    email,
    name: String(input.name || ''),
    phone: String(input.phone || ''),
    company: String(input.company || ''),
    role: String(input.role || 'CUSTOMER').toUpperCase(),
  } as any;

  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data })
    : await prisma.user.create({ data });

  return normalizeCustomer(user);
}
