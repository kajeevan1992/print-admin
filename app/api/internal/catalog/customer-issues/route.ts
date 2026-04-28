export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const ISSUE_KEY = 'storefront-customer-issues';
const COMMUNICATION_KEY = 'storefront-customer-communication-log';

type CustomerIssue = Record<string, any> & {
  id: string;
  orderId: string;
  status: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
};

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Customer issue request failed.' }, { status });
}

async function readConfigItems<T>(request: NextRequest, key: string): Promise<T[]> {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key);
    const items = (record as any)?.metadataJson?.items;
    return Array.isArray(items) ? items : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return [];
    throw error;
  }
}

async function saveConfigItems(request: NextRequest, key: string, name: string, description: string, items: unknown[], source: string) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: key,
    slug: key,
    name,
    description,
    metadataJson: { items, savedAt: new Date().toISOString(), storageKey: key, source },
  } as any);
}

function summarise(items: CustomerIssue[]) {
  return {
    totalIssues: items.length,
    open: items.filter((item) => item.status === 'open').length,
    waiting: items.filter((item) => item.status === 'waiting-customer').length,
    resolved: items.filter((item) => item.status === 'resolved').length,
  };
}

async function logIssueCommunication(request: NextRequest, issue: CustomerIssue, action: string) {
  const manualItems = await readConfigItems<any>(request, COMMUNICATION_KEY);
  const now = new Date().toISOString();
  const note = {
    id: `communication-issue-${Date.now()}`,
    orderId: issue.orderId,
    orderNumber: issue.orderNumber || null,
    customerName: issue.customerName || null,
    channel: 'internal-note',
    direction: 'internal',
    status: 'logged',
    subject: `Customer issue ${issue.status}`,
    message: `${action}: ${issue.reason}`,
    createdAt: now,
    updatedAt: now,
    source: 'customer-issues',
    history: [{ at: now, action, source: 'customer-issues' }],
  };
  await saveConfigItems(request, COMMUNICATION_KEY, 'Customer communication log', 'Manual notes and communication visibility records for storefront orders.', [note, ...manualItems], 'StorefrontCustomerCommunications');
}

export async function GET(request: NextRequest) {
  try {
    const items = await readConfigItems<CustomerIssue>(request, ISSUE_KEY);
    const sorted = [...items].sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
    return NextResponse.json({ ok: true, source: 'internal-customer-issues-db', data: { items: sorted, summary: summarise(sorted) } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = String(body.orderId || '').trim();
    const action = String(body.action || 'open-issue').trim();
    if (!orderId) return responseError(new Error('orderId is required.'), 400);

    const existingItems = await readConfigItems<CustomerIssue>(request, ISSUE_KEY);
    const now = new Date().toISOString();
    const matchIndex = existingItems.findIndex((item) => String(item.id) === String(body.issueId || '') || String(item.orderId) === orderId);
    const current = matchIndex >= 0 ? existingItems[matchIndex] : null;
    const status = action === 'resolve' ? 'resolved' : action === 'waiting-customer' ? 'waiting-customer' : 'open';
    const issue: CustomerIssue = {
      ...(current || {}),
      id: current?.id || `issue-${Date.now()}`,
      orderId,
      orderNumber: body.orderNumber || current?.orderNumber || null,
      customerName: body.customerName || current?.customerName || null,
      customerEmail: body.customerEmail || current?.customerEmail || null,
      severity: body.severity || current?.severity || 'normal',
      status,
      reason: String(body.reason || current?.reason || 'Customer/order exception raised.'),
      createdAt: current?.createdAt || now,
      updatedAt: now,
      history: [...(Array.isArray(current?.history) ? current.history : []), { at: now, action, status, source: 'customer-issues' }],
    };
    const nextItems = matchIndex >= 0 ? existingItems.map((item, index) => index === matchIndex ? issue : item) : [issue, ...existingItems];
    await saveConfigItems(request, ISSUE_KEY, 'Customer issue queue', 'Customer service exceptions linked to storefront test orders.', nextItems, 'StorefrontCustomerIssues');
    await logIssueCommunication(request, issue, action);
    return NextResponse.json({ ok: true, source: 'internal-customer-issues-db', data: { items: nextItems, summary: summarise(nextItems) }, item: issue });
  } catch (error) {
    return responseError(error);
  }
}
