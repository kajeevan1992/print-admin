import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';

async function tenantIdFromRequest(request: Request) {
  const context = tenantContextFromRequest(request);
  const raw = String(context.tenantId || '').trim();

  const tenant =
    (raw && (await prisma.tenant.findUnique({ where: { id: raw }, select: { id: true } }))) ||
    (raw && (await prisma.tenant.findUnique({ where: { slug: raw }, select: { id: true } }))) ||
    (await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }));

  if (!tenant) throw new Error('No tenant available for inventory.');
  return tenant.id;
}

export async function listInventoryItems(request: Request) {
  const tenantId = await tenantIdFromRequest(request);

  const rows = await prisma.$queryRawUnsafe(
    'SELECT * FROM "InventoryItem" WHERE "tenantId" = $1 ORDER BY "createdAt" DESC LIMIT 200',
    tenantId,
  );

  return rows;
}

export async function createInventoryItem(request: Request, input: Record<string, any>) {
  const tenantId = await tenantIdFromRequest(request);
  const id = input.id || crypto.randomUUID();

  await prisma.$executeRawUnsafe(
    'INSERT INTO "InventoryItem" ("id","tenantId","sku","name","category","unit","supplierName","supplierSku","supplierCostMinor","currency","onHandQty","reservedQty","reorderPointQty","metadataJson") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)',
    id,
    tenantId,
    String(input.sku || ''),
    String(input.name || ''),
    input.category || null,
    String(input.unit || 'unit'),
    input.supplierName || null,
    input.supplierSku || null,
    Number(input.supplierCostMinor || 0),
    String(input.currency || 'GBP'),
    Number(input.onHandQty || 0),
    Number(input.reservedQty || 0),
    Number(input.reorderPointQty || 0),
    input,
  );

  const [item] = await prisma.$queryRawUnsafe(
    'SELECT * FROM "InventoryItem" WHERE "id" = $1 LIMIT 1',
    id,
  );

  return item;
}
