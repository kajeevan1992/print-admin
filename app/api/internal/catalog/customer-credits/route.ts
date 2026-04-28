export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const CREDIT_KEY = 'storefront-customer-credit-requests';
const COMMUNICATION_KEY = 'storefront-customer-communication-log';
const ISSUE_KEY = 'storefront-customer-issues';

type CreditRequest = Record<string, any> & {
  id: string;
  orderId: string;
  status: string;
  requestedMinor: number;
  currency: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
};

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Customer credit request failed.' }, { status });
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

function statusFromAction(action: string, current?: string) {
  if (action === 'approve') return 'approved';
  if (action === 'reject') return 'rejected';
  if (action === 'mark-issued') return 'issued';
  if (action === 'reopen') return 'review';
  return current || 'review';
}

function summarise(items: CreditRequest[]) {
  return {
    totalRequests: items.length,
    review: items.filter((item) => item.status === 'review').length,
    approved: items.filter((item) => item.status === 'approved').length,
    rejected: items.filter((item) => item.status === 'rejected').length,
    issued: items.filter((item) => item.status === 'issued').length,
    totalRequestedMinor: items.reduce((sum, item) => sum + Number(item.requestedMinor || 0), 0),
  };
}

async function logCreditCommunication(request: NextRequest, item: CreditRequest, action: string) {
  const manualItems = await readConfigItems<any>(request, COMMUNICATION_KEY);
  const now = new Date().toISOString();
  const note = {
    id: `communication-credit-${Date.now()}`,
    orderId: item.orderId,
    orderNumber: item.orderNumber || null,
    customerName: item.customerName || null,
    channel: 'internal-note',
    direction: 'internal',
    status: 'logged',
    subject: `Credit/refund review ${item.status}`,
    message: `${action}: ${item.reason} (${item.currency} ${Number(item.requestedMinor || 0) / 100})`,
    createdAt: now,
    updatedAt: now,
    source: 'customer-credits',
    history: [{ at: now, action, status: item.status, source: 'customer-credits' }],
  };
  await saveConfigItems(request, COMMUNICATION_KEY, 'Customer communication log', 'Manual notes and communication visibility records for storefront orders.', [note, ...manualItems], 'StorefrontCustomerCommunications');
}

async function logCreditIssue(request: NextRequest, item: CreditRequest, action: string) {
  const issues = await readConfigItems<any>(request, ISSUE_KEY);
  const now = new Date().toISOString();
  const existingIndex = issues.findIndex((issue) => String(issue.orderId || '') === String(item.orderId || '') && String(issue.source || '') === 'customer-credits');
  const issue = {
    ...(existingIndex >= 0 ? issues[existingIndex] : {}),
    id: existingIndex >= 0 ? issues[existingIndex].id : `issue-credit-${Date.now()}`,
    orderId: item.orderId,
    orderNumber: item.orderNumber || null,
    customerName: item.customerName || null,
    customerEmail: item.customerEmail || null,
    severity: item.status === 'rejected' ? 'normal' : 'finance-review',
    status: item.status === 'issued' || item.status === 'rejected' ? 'resolved' : 'open',
    reason: `Credit/refund request is ${item.status}.`,
    source: 'customer-credits',
    createdAt: existingIndex >= 0 ? issues[existingIndex].createdAt : now,
    updatedAt: now,
    history: [...(Array.isArray(issues[existingIndex]?.history) ? issues[existingIndex].history : []), { at: now, action, status: item.status, source: 'customer-credits' }],
  };
  const nextIssues = existingIndex >= 0 ? issues.map((old, index) => index === existingIndex ? issue : old) : [issue, ...issues];
  await saveConfigItems(request, ISSUE_KEY, 'Customer issue queue', 'Customer service exceptions linked to storefront test orders.', nextIssues, 'StorefrontCustomerIssues');
}

export async function GET(request: NextRequest) {
  try {
    const items = await readConfigItems<CreditRequest>(request, CREDIT_KEY);
    const sorted = [...items].sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
    return NextResponse.json({ ok: true, source: 'internal-customer-credits-db', data: { items: sorted, summary: summarise(sorted) } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = String(body.orderId || '').trim();
    const action = String(body.action || 'request-credit').trim();
    if (!orderId) return responseError(new Error('orderId is required.'), 400);

    const existingItems = await readConfigItems<CreditRequest>(request, CREDIT_KEY);
    const now = new Date().toISOString();
    const matchIndex = existingItems.findIndex((item) => String(item.id) === String(body.creditId || '') || String(item.orderId) === orderId);
    const current = matchIndex >= 0 ? existingItems[matchIndex] : null;
    const requestedMinor = Number(body.requestedMinor || body.grossTotalMinor || current?.requestedMinor || 0);
    const item: CreditRequest = {
      ...(current || {}),
      id: current?.id || `credit-${Date.now()}`,
      orderId,
      orderNumber: body.orderNumber || current?.orderNumber || null,
      customerName: body.customerName || current?.customerName || null,
      customerEmail: body.customerEmail || current?.customerEmail || null,
      status: statusFromAction(action, current?.status),
      requestedMinor,
      currency: String(body.currency || current?.currency || 'GBP'),
      reason: String(body.reason || current?.reason || 'Customer service credit/refund review requested.'),
      createdAt: current?.createdAt || now,
      updatedAt: now,
      history: [...(Array.isArray(current?.history) ? current.history : []), { at: now, action, status: statusFromAction(action, current?.status), source: 'customer-credits' }],
    };
    const nextItems = matchIndex >= 0 ? existingItems.map((old, index) => index === matchIndex ? item : old) : [item, ...existingItems];
    await saveConfigItems(request, CREDIT_KEY, 'Customer credit/refund requests', 'Customer service credit and refund request tracking records. No payment movement is performed here.', nextItems, 'StorefrontCustomerCredits');
    await logCreditCommunication(request, item, action);
    await logCreditIssue(request, item, action);
    return NextResponse.json({ ok: true, source: 'internal-customer-credits-db', data: { items: nextItems, summary: summarise(nextItems) }, item });
  } catch (error) {
    return responseError(error);
  }
}
