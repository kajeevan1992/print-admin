import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { getOrder } from '@/core/orders/orders.service';
import { artworkStorageStatus, saveArtworkMetadataDb } from '@/core/storefront/internal-artwork-db';
import { saveArtworkUpload } from '@/core/storefront/internal-artwork-storage';
import { readPlannerStore, savePlannerStore } from '@/core/storefront/production-planner';
import { tenantContextFromRequest } from '@/core/tenant/context';

export const dynamic = 'force-dynamic';

type Row = Record<string, any>;
const CONFIG_RESOURCE = 'admin-config' as any;
const TICKETS_KEY = 'production-job-tickets';
const REVISIONS_KEY = 'customer-proof-revisions-v377';

function corsHeaders() { return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id' }; }
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } }); }
function text(value: unknown) { return String(value || '').trim(); }
function now() { return new Date().toISOString(); }
function uploadFile(value: FormDataEntryValue | null) { return value && typeof value !== 'string' && value.size > 0 ? value as File : null; }
function firstProductId(order: Row) { return text(order.items?.[0]?.productId || order.items?.[0]?.sku || order.items?.[0]?.productName || 'storefront-product').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '') || 'storefront-product'; }
function compact(upload: Row | null) { if (!upload) return null; return { id: upload.id, productId: upload.productId, orderId: upload.orderId, originalName: upload.originalName, mimeType: upload.mimeType, sizeBytes: upload.sizeBytes, fileUrl: upload.fileUrl, downloadUrl: upload.downloadUrl, preflight: upload.preflight, reviewStatus: upload.reviewStatus, createdAt: upload.createdAt }; }
function uploadStatus(upload: Row | null) { const status = text(upload?.preflight?.preflight?.status || upload?.preflight?.status).toLowerCase(); if (status === 'warning') return 'warning'; if (['blocked', 'fail', 'failed'].includes(status)) return 'fail'; if (['pass', 'passed'].includes(status)) return 'pass'; return 'pending'; }
function preflightLabel(upload: Row | null) { const status = uploadStatus(upload); if (status === 'warning') return 'Artwork uploaded with preflight warnings and is waiting for proof approval.'; if (status === 'fail') return 'Artwork uploaded, but preflight found an issue.'; if (status === 'pass') return 'Artwork uploaded and passed preflight. It is waiting for proof approval.'; return 'Artwork uploaded and queued for review.'; }
function rowsFrom(record: any) { const body = record?.metadataJson || {}; return Array.isArray(body.items) ? body.items as Row[] : Array.isArray(body.store?.items) ? body.store.items as Row[] : []; }
async function readRows(request: Request, key: string) { try { return rowsFrom(await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key)); } catch (error) { const msg = error instanceof Error ? error.message : ''; if (msg.includes('was not found')) return []; throw error; } }
async function writeRows(request: Request, key: string, title: string, rows: Row[]) { return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, { id: key, slug: key, name: title, title, metadataJson: { items: rows, values: { count: String(rows.length), savedAt: now(), source: 'native-storefront-artwork-revision' } } } as any); }
function ticketMatches(ticket: Row, order: Row) { const keys = [order.id, order.orderNumber, ...(Array.isArray(order.artworkUploadIds) ? order.artworkUploadIds : [])].filter(Boolean).map(String); return keys.some((key) => [ticket.id, ticket.orderId, ticket.orderNumber, ticket.artworkUploadId].filter(Boolean).map(String).includes(key)); }
function ticketPatch(upload: Row, note: string) { const status = uploadStatus(upload); const approval = status === 'pass' || status === 'warning'; return { artworkUploadId: upload.id, artworkFileUrl: upload.fileUrl || '', artworkDownloadUrl: upload.downloadUrl || '', preflightStatus: status, artworkStatus: status === 'fail' ? 'preflight-fail' : status === 'warning' ? 'preflight-warning' : status === 'pass' ? 'preflight-pass' : 'uploaded', customerProofStatus: approval ? 'pending-customer-approval' : 'awaiting-review', handoffState: 'blocked', status: status === 'fail' ? 'blocked' : 'artwork-check', productionNotes: note || 'Customer uploaded replacement artwork.', customerReplacementUploadedAt: now(), updatedAt: now(), warnings: status === 'warning' ? ['Replacement artwork has preflight warnings.'] : status === 'fail' ? ['Replacement artwork failed preflight.'] : [] }; }
function plannerMatches(job: Row, ticket: Row, order: Row) { const keys = [ticket.id, ticket.orderId, ticket.orderNumber, order.id, order.orderNumber].filter(Boolean).map(String); return keys.some((key) => [job.productionTicketId, job.orderId, job.orderNumber, job.workflowId, job.id].filter(Boolean).map(String).includes(key) || String(job.workflowId || '') === `ticket-${key}`); }
async function syncPlanner(request: Request, ticket: Row, order: Row, note: string) { const planner = await readPlannerStore(request).catch(() => null); if (!planner) return { updated: false, skipped: 'planner missing' }; let changed = false; const updatedJobs = planner.jobs.map((job: Row) => { if (!plannerMatches(job, ticket, order)) return job; changed = true; return { ...job, stage: 'blocked', status: 'blocked-replacement-artwork-review', productionBlocked: true, blockReason: note || 'Replacement artwork uploaded. Waiting for proof approval.', artworkStatus: ticket.artworkStatus, preflightStatus: ticket.preflightStatus, customerProofStatus: ticket.customerProofStatus, handoffState: 'blocked', artworkUploadId: ticket.artworkUploadId, artworkFileUrl: ticket.artworkFileUrl, artworkDownloadUrl: ticket.artworkDownloadUrl, liveStatus: 'blocked', updatedAt: now() }; }); if (!changed) return { updated: false, skipped: 'planner job not found' }; await savePlannerStore(request, { ...planner, jobs: updatedJobs, actions: [{ id: `planner-action-${Date.now()}`, action: 'customer-replacement-artwork-uploaded', orderId: order.id, orderNumber: order.orderNumber, productionTicketId: ticket.id, at: now(), note }, ...planner.actions].slice(0, 400) }); return { updated: true }; }
async function addRevision(request: Request, order: Row, ticket: Row, upload: Row, note: string, email: string) { const current = await readRows(request, REVISIONS_KEY).catch(() => []); const row = { id: `rev-${Date.now()}`, orderNumber: order.orderNumber, productionTicketId: ticket.id, action: 'replacement-artwork-uploaded', customerEmail: email || order.customerEmail || ticket.customerEmail || '', artworkUploadId: upload.id, comment: note || 'Customer uploaded replacement artwork.', timestamp: now(), source: 'native-storefront-artwork-revision' }; await writeRows(request, REVISIONS_KEY, 'Customer Proof Revisions', [row, ...current]); return row; }

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: corsHeaders() }); }

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const orderId = text(form.get('orderId') || form.get('orderNumber'));
    const email = text(form.get('email')).toLowerCase();
    const note = text(form.get('note'));
    const file = uploadFile(form.get('file'));
    if (!orderId) return json({ ok: false, error: 'orderId or orderNumber is required.' }, { status: 400 });
    if (!file) return json({ ok: false, error: 'Artwork file is required.' }, { status: 400 });
    const order = await getOrder(request, orderId) as Row | null;
    if (!order) return json({ ok: false, error: 'Order was not found.' }, { status: 404 });
    if (email && order.customerEmail && email !== String(order.customerEmail).toLowerCase()) return json({ ok: false, error: 'Order email does not match.' }, { status: 403 });
    const ctx = tenantContextFromRequest(request);
    const uploadForm = new FormData();
    uploadForm.set('file', file, file.name || 'artwork.pdf');
    uploadForm.set('productId', firstProductId(order));
    uploadForm.set('orderId', text(order.orderNumber || orderId));
    const saved = await saveArtworkUpload(ctx, uploadForm);
    const dbSaved = await saveArtworkMetadataDb(saved, ctx).catch(() => null);
    const upload = (dbSaved || saved) as Row;
    const storage = await artworkStorageStatus(ctx).catch(() => ({ mode: 'file-fallback', dbReady: false }));
    const tickets = await readRows(request, TICKETS_KEY);
    const index = tickets.findIndex((ticket) => ticketMatches(ticket, order));
    let ticketUpdate = { updated: false, skipped: 'proof ticket not found' } as Row;
    let revision = null as Row | null;
    let plannerSync = null as Row | null;
    if (index >= 0) {
      const ticket = { ...tickets[index], ...ticketPatch(upload, note) };
      tickets[index] = ticket;
      await writeRows(request, TICKETS_KEY, 'Production Job Tickets', tickets);
      revision = await addRevision(request, order, ticket, upload, note, email).catch(() => null);
      plannerSync = await syncPlanner(request, ticket, order, note).catch((error) => ({ updated: false, error: error instanceof Error ? error.message : 'Planner sync failed.' }));
      ticketUpdate = { updated: true, ticketId: ticket.id, artworkStatus: ticket.artworkStatus, preflightStatus: ticket.preflightStatus, customerProofStatus: ticket.customerProofStatus };
    }
    return json({ ok: true, source: 'native-storefront-artwork-revision', data: { orderNumber: order.orderNumber, upload: compact(upload), storage, ticketUpdate, revision, plannerSync, message: preflightLabel(upload) } });
  } catch (error) {
    return json({ ok: false, source: 'native-storefront-artwork-revision', error: error instanceof Error ? error.message : 'Artwork upload failed.' }, { status: 500 });
  }
}
