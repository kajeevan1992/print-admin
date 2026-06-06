import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { listLaunchTestOrders } from './launch-test-order-generator.service';

const CONFIRM = 'DELETE_TEST_DATA';
const PASS_RESOURCE = 'collection-handover-passes';

function clean(value: unknown) { return String(value || '').trim(); }
function asJson(value: unknown) { return typeof value === 'object' && value ? value as Record<string, any> : {}; }
function isTestOrder(order: any) { return String(order.orderNumber || '').startsWith('TEST-HOLO-') || JSON.stringify(order).includes('BUILD_67_SAFE_TEST_ORDER') || String(order.notes || '').includes('BUILD 67 TEST DATA'); }

async function tenantIdFromRequest(request: Request) {
  const ctx = tenantContextFromRequest(request);
  const value = clean(ctx.tenantId);
  const tenant =
    (value && (await (prisma as any).tenant.findUnique({ where: { id: value }, select: { id: true } }).catch(() => null))) ||
    (value && (await (prisma as any).tenant.findUnique({ where: { slug: value }, select: { id: true } }).catch(() => null))) ||
    (await (prisma as any).tenant.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }).catch(() => null));
  return tenant?.id || value || 'platform-demo';
}

async function testOrderRows(request: Request) {
  const tenantId = await tenantIdFromRequest(request);
  const rows = await (prisma as any).order.findMany({ where: { tenantId }, include: { items: true, customer: true }, orderBy: { createdAt: 'desc' }, take: 250 });
  return rows.filter(isTestOrder);
}

async function relatedCollectionPassRows(tenantId: string, orderIds: string[], orderNumbers: string[]) {
  const rows = await (prisma as any).coreCatalogRecord.findMany({ where: { tenantId, resource: PASS_RESOURCE }, orderBy: { updatedAt: 'desc' }, take: 500 }).catch(() => []);
  return rows.filter((row: any) => {
    const meta = asJson(row.metadataJson);
    return orderIds.includes(String(meta.orderId || '')) || orderNumbers.includes(String(meta.orderNumber || '')) || orderNumbers.some((number) => String(row.slug || '').includes(number.toLowerCase()));
  });
}

async function relatedEmailRows(tenantId: string, orderIds: string[], orderNumbers: string[]) {
  const rows = await (prisma as any).tenantEmailOutboxEmail.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 500 }).catch(() => []);
  return rows.filter((row: any) => {
    const text = JSON.stringify(row);
    return orderIds.includes(String(row.orderId || '')) || orderNumbers.some((number) => text.includes(number)) || text.includes('BUILD_67_SAFE_TEST_ORDER') || text.includes('build-67-launch-test-order-generator');
  });
}

export async function previewLaunchTestDataCleanup(request: Request) {
  const tenantId = await tenantIdFromRequest(request);
  const orders = await testOrderRows(request);
  const orderIds = orders.map((order: any) => order.id);
  const orderNumbers = orders.map((order: any) => order.orderNumber);
  const passes = await relatedCollectionPassRows(tenantId, orderIds, orderNumbers);
  const emails = await relatedEmailRows(tenantId, orderIds, orderNumbers);
  return {
    ok: true,
    mode: 'preview',
    safe: true,
    tenantId,
    confirmationRequired: CONFIRM,
    summary: {
      orders: orders.length,
      orderItems: orders.reduce((sum: number, order: any) => sum + Number(order.items?.length || 0), 0),
      collectionPasses: passes.length,
      emailOutbox: emails.length,
    },
    orders: orders.map((order: any) => ({ id: order.id, orderNumber: order.orderNumber, status: order.status, totalMinor: order.totalMinor, createdAt: order.createdAt, customerEmail: order.customer?.email || '' })),
    collectionPasses: passes.map((row: any) => ({ id: row.id, slug: row.slug, name: row.name, orderNumber: asJson(row.metadataJson).orderNumber || '' })),
    emailOutbox: emails.map((row: any) => ({ id: row.id, type: row.type, status: row.status, to: row.to, subject: row.subject, orderId: row.orderId, createdAt: row.createdAt })),
  };
}

export async function runLaunchTestDataCleanup(request: Request, options: { confirm?: string; includeOrders?: boolean; includePasses?: boolean; includeEmails?: boolean } = {}) {
  if (clean(options.confirm) !== CONFIRM) {
    return { ok: false, mode: 'blocked', reason: 'confirmation-required', requiredConfirmation: CONFIRM, preview: await previewLaunchTestDataCleanup(request) };
  }
  const tenantId = await tenantIdFromRequest(request);
  const preview = await previewLaunchTestDataCleanup(request);
  const orderIds = preview.orders.map((order: any) => order.id);
  const passIds = preview.collectionPasses.map((pass: any) => pass.id);
  const emailIds = preview.emailOutbox.map((email: any) => email.id);
  const result: Record<string, any> = { ok: true, mode: 'cleanup', tenantId, before: preview.summary, deleted: { orders: 0, collectionPasses: 0, emailOutbox: 0 } };

  if (options.includeEmails !== false && emailIds.length) {
    const deleted = await (prisma as any).tenantEmailOutboxEmail.deleteMany({ where: { tenantId, id: { in: emailIds } } });
    result.deleted.emailOutbox = deleted.count || 0;
  }
  if (options.includePasses !== false && passIds.length) {
    const deleted = await (prisma as any).coreCatalogRecord.deleteMany({ where: { tenantId, resource: PASS_RESOURCE, id: { in: passIds } } });
    result.deleted.collectionPasses = deleted.count || 0;
  }
  if (options.includeOrders !== false && orderIds.length) {
    const deleted = await (prisma as any).order.deleteMany({ where: { tenantId, id: { in: orderIds } } });
    result.deleted.orders = deleted.count || 0;
  }
  result.after = (await previewLaunchTestDataCleanup(request)).summary;
  result.warning = 'Only TEST-HOLO / BUILD_67_SAFE_TEST_ORDER data was targeted.';
  return result;
}

export function launchTestCleanupConfirmationText() { return CONFIRM; }
