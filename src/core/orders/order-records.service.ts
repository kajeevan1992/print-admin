import crypto from 'node:crypto';
import { platformPrisma } from '@/core/db/platform-prisma';

export type OrderRecordItemInput = {
  productId: string | null;
  titleSnapshot: string;
  quantity: number;
  unitPriceMinor: number;
  totalPriceMinor: number;
  metadataJson: Record<string, any>;
};

export type OrderRecordWriteInput = {
  id?: string;
  tenantId: string;
  customerId?: string | null;
  orderNumber: string;
  status: string;
  currency: string;
  subtotalMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  notes: string;
  items: OrderRecordItemInput[];
};

type Row = Record<string, any>;

function clean(value: unknown) { return String(value || '').trim(); }
function integer(value: unknown) { const next = Number(value || 0); return Number.isFinite(next) ? Math.round(next) : 0; }
function jsonObject(value: unknown) { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}; }

export async function ensureOrderRecordTables() {
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Order" (
    "id" TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "subtotalMinor" INTEGER NOT NULL DEFAULT 0,
    "shippingMinor" INTEGER NOT NULL DEFAULT 0,
    "taxMinor" INTEGER NOT NULL DEFAULT 0,
    "totalMinor" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`);
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "OrderItem" (
    "id" TEXT PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "titleSnapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceMinor" INTEGER NOT NULL DEFAULT 0,
    "totalPriceMinor" INTEGER NOT NULL DEFAULT 0,
    "metadataJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`);
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "tenantId" TEXT');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerId" TEXT');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "orderNumber" TEXT');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT \'AWAITING_PAYMENT\'');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT \'GBP\'');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "subtotalMinor" INTEGER DEFAULT 0');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingMinor" INTEGER DEFAULT 0');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "taxMinor" INTEGER DEFAULT 0');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "totalMinor" INTEGER DEFAULT 0');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "notes" TEXT DEFAULT \'\'');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "orderId" TEXT');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "productId" TEXT');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "titleSnapshot" TEXT');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "quantity" INTEGER DEFAULT 1');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "unitPriceMinor" INTEGER DEFAULT 0');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "totalPriceMinor" INTEGER DEFAULT 0');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "metadataJson" JSONB DEFAULT \'{}\'::jsonb');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP');
  await platformPrisma.$executeRawUnsafe('ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP');
  await platformPrisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Order_tenant_number_uq" ON "Order"("tenantId","orderNumber")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Order_tenant_status_idx" ON "Order"("tenantId","status","updatedAt")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Order_customer_idx" ON "Order"("tenantId","customerId","createdAt")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "OrderItem_order_idx" ON "OrderItem"("orderId","createdAt")');
}

async function itemsForOrder(orderId: string) {
  const rows = await platformPrisma.$queryRawUnsafe<Row[]>('SELECT * FROM "OrderItem" WHERE "orderId"=$1 ORDER BY "createdAt" ASC,id ASC', orderId);
  return rows.map((row) => ({
    id: clean(row.id),
    orderId,
    productId: row.productId ? clean(row.productId) : null,
    titleSnapshot: clean(row.titleSnapshot) || 'Order item',
    quantity: Math.max(1, integer(row.quantity)),
    unitPriceMinor: Math.max(0, integer(row.unitPriceMinor)),
    totalPriceMinor: Math.max(0, integer(row.totalPriceMinor)),
    metadataJson: jsonObject(row.metadataJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

async function customerForOrder(customerId: string | null | undefined) {
  if (!customerId) return null;
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; name: string | null; email: string }>>('SELECT id,name,email FROM "User" WHERE id=$1 LIMIT 1', customerId).catch(() => []);
  return rows[0] ? { id: rows[0].id, name: rows[0].name || '', email: rows[0].email || '' } : null;
}

async function hydrate(row: Row) {
  return {
    id: clean(row.id),
    tenantId: clean(row.tenantId),
    customerId: row.customerId ? clean(row.customerId) : null,
    orderNumber: clean(row.orderNumber),
    status: clean(row.status),
    currency: clean(row.currency) || 'GBP',
    subtotalMinor: Math.max(0, integer(row.subtotalMinor)),
    shippingMinor: Math.max(0, integer(row.shippingMinor)),
    taxMinor: Math.max(0, integer(row.taxMinor)),
    totalMinor: Math.max(0, integer(row.totalMinor)),
    notes: typeof row.notes === 'string' ? row.notes : '',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    items: await itemsForOrder(clean(row.id)),
    customer: await customerForOrder(row.customerId),
  };
}

export async function readOrderRecord(tenantId: string, idOrNumber: string) {
  await ensureOrderRecordTables();
  const rows = await platformPrisma.$queryRawUnsafe<Row[]>('SELECT * FROM "Order" WHERE "tenantId"=$1 AND (id=$2 OR "orderNumber"=$2) LIMIT 1', clean(tenantId), clean(idOrNumber));
  return rows[0] ? hydrate(rows[0]) : null;
}

export async function listOrderRecords(tenantId: string, options: { status?: string | null; limit?: number } = {}) {
  await ensureOrderRecordTables();
  const limit = Math.max(1, Math.min(1000, Number(options.limit || 100)));
  const status = clean(options.status);
  const rows = status
    ? await platformPrisma.$queryRawUnsafe<Row[]>('SELECT * FROM "Order" WHERE "tenantId"=$1 AND status=$2 ORDER BY "createdAt" DESC LIMIT $3', clean(tenantId), status, limit)
    : await platformPrisma.$queryRawUnsafe<Row[]>('SELECT * FROM "Order" WHERE "tenantId"=$1 ORDER BY "createdAt" DESC LIMIT $2', clean(tenantId), limit);
  const out = [];
  for (const row of rows) out.push(await hydrate(row));
  return out;
}

export async function saveOrderRecord(input: OrderRecordWriteInput) {
  await ensureOrderRecordTables();
  const existing = input.id ? await readOrderRecord(input.tenantId, input.id) : await readOrderRecord(input.tenantId, input.orderNumber);
  const id = existing?.id || clean(input.id) || `order-${crypto.randomUUID()}`;
  await (platformPrisma as any).$transaction(async (tx: any) => {
    if (existing) {
      await tx.$executeRawUnsafe(
        'UPDATE "Order" SET "customerId"=$1,"orderNumber"=$2,status=$3,currency=$4,"subtotalMinor"=$5,"shippingMinor"=$6,"taxMinor"=$7,"totalMinor"=$8,notes=$9,"updatedAt"=NOW() WHERE id=$10 AND "tenantId"=$11',
        input.customerId || null, clean(input.orderNumber), clean(input.status), clean(input.currency) || 'GBP', integer(input.subtotalMinor), integer(input.shippingMinor), integer(input.taxMinor), integer(input.totalMinor), input.notes || '', id, clean(input.tenantId),
      );
      await tx.$executeRawUnsafe('DELETE FROM "OrderItem" WHERE "orderId"=$1', id);
    } else {
      await tx.$executeRawUnsafe(
        'INSERT INTO "Order" (id,"tenantId","customerId","orderNumber",status,currency,"subtotalMinor","shippingMinor","taxMinor","totalMinor",notes,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())',
        id, clean(input.tenantId), input.customerId || null, clean(input.orderNumber), clean(input.status), clean(input.currency) || 'GBP', integer(input.subtotalMinor), integer(input.shippingMinor), integer(input.taxMinor), integer(input.totalMinor), input.notes || '',
      );
    }
    for (const item of input.items) {
      await tx.$executeRawUnsafe(
        'INSERT INTO "OrderItem" (id,"orderId","productId","titleSnapshot",quantity,"unitPriceMinor","totalPriceMinor","metadataJson","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,NOW(),NOW())',
        `order-item-${crypto.randomUUID()}`, id, item.productId || null, clean(item.titleSnapshot) || 'Order item', Math.max(1, integer(item.quantity)), Math.max(0, integer(item.unitPriceMinor)), Math.max(0, integer(item.totalPriceMinor)), JSON.stringify(jsonObject(item.metadataJson)),
      );
    }
  });
  return readOrderRecord(input.tenantId, id);
}
