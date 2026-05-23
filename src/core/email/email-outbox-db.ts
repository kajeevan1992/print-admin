import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';
import type { InternalEmailRecord } from './internal-email.service';

function outboxPath() { return path.join(process.cwd(), '.data', 'email-outbox.json'); }
async function readFileOutbox(): Promise<InternalEmailRecord[]> {
  await mkdir(path.dirname(outboxPath()), { recursive: true });
  try { const parsed = JSON.parse(await readFile(outboxPath(), 'utf8')); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
async function writeFileOutbox(items: InternalEmailRecord[]) {
  await mkdir(path.dirname(outboxPath()), { recursive: true });
  await writeFile(outboxPath(), JSON.stringify(items, null, 2));
}
function dateIn(value?: string) { if (!value) return undefined; const d = new Date(value); return Number.isFinite(d.getTime()) ? d : undefined; }
function dateOut(value: unknown) { return value ? new Date(String(value)).toISOString() : undefined; }
async function tenantId(request?: Request) {
  const ctx = request ? tenantContextFromRequest(request).tenantId : process.env.DEFAULT_TENANT_ID || 'platform-demo';
  const value = String(ctx || '').trim();
  const tenant =
    (value && await prisma.tenant.findUnique({ where: { id: value }, select: { id: true } }).catch(() => null)) ||
    (value && await prisma.tenant.findUnique({ where: { slug: value }, select: { id: true } }).catch(() => null)) ||
    (await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }).catch(() => null));
  return tenant?.id || null;
}
function rowToEmail(row: any): InternalEmailRecord {
  return {
    id: row.id, type: row.type, status: row.status, to: row.to || '', subject: row.subject, body: row.body,
    html: row.html || undefined, reuploadLink: row.reuploadLink || undefined, uploadId: row.uploadId || undefined,
    orderId: row.orderId || undefined, quoteId: row.quoteId || undefined, attempts: row.attempts || 0,
    messageId: row.messageId || undefined, lastError: row.lastError || undefined,
    createdAt: dateOut(row.createdAt) || new Date().toISOString(), sentAt: dateOut(row.sentAt), failedAt: dateOut(row.failedAt),
    storageSource: 'db', migratedFromFile: Boolean(row.migratedFromFile),
  } as InternalEmailRecord;
}
async function dbReady() { return Boolean((prisma as any).tenantEmailOutboxEmail); }
async function saveDbEmail(tid: string, email: InternalEmailRecord, migratedFromFile = false) {
  const data = {
    tenantId: tid, type: email.type, status: email.status, to: email.to || '', subject: email.subject, body: email.body,
    html: email.html || null, reuploadLink: email.reuploadLink || null, uploadId: email.uploadId || null, orderId: email.orderId || null, quoteId: email.quoteId || null,
    attempts: email.attempts || 0, messageId: email.messageId || null, lastError: email.lastError || null, sentAt: dateIn(email.sentAt), failedAt: dateIn(email.failedAt),
    metadataJson: { storageSource: 'db' }, migratedFromFile,
  } as any;
  const row = await (prisma as any).tenantEmailOutboxEmail.upsert({ where: { id: email.id }, update: data, create: { id: email.id, ...data } });
  return rowToEmail(row);
}
async function migrateFiles(tid: string) {
  const items = await readFileOutbox();
  if (!items.length) return 0;
  let moved = 0;
  for (const item of items) {
    await saveDbEmail(tid, { ...item, status: item.status || (item.to ? 'queued' : 'needs-email-address'), attempts: item.attempts || 0 }, true).catch(() => null);
    moved += 1;
  }
  return moved;
}
export async function listStoredEmails(request?: Request) {
  const tid = await tenantId(request);
  if (tid && await dbReady()) {
    try { await migrateFiles(tid); return (await (prisma as any).tenantEmailOutboxEmail.findMany({ where: { tenantId: tid }, orderBy: { createdAt: 'desc' } })).map(rowToEmail); } catch {}
  }
  return (await readFileOutbox()).map((item) => ({ ...item, storageSource: 'file-fallback' as const }));
}
export async function saveStoredEmail(email: InternalEmailRecord, request?: Request) {
  const tid = await tenantId(request);
  if (tid && await dbReady()) { try { return await saveDbEmail(tid, email); } catch {} }
  const current = await readFileOutbox();
  await writeFileOutbox(current.some((item) => item.id === email.id) ? current.map((item) => item.id === email.id ? email : item) : [email, ...current]);
  return { ...email, storageSource: 'file-fallback' as const } as InternalEmailRecord;
}
export async function emailOutboxStorageStatus(request?: Request) {
  const tid = await tenantId(request);
  if (!tid || !(await dbReady())) return { mode: 'file-fallback', tenantId: tid, dbReady: false, migratedFileEmails: 0 };
  return { mode: 'db-primary', tenantId: tid, dbReady: true, migratedFileEmails: await migrateFiles(tid).catch(() => 0) };
}
