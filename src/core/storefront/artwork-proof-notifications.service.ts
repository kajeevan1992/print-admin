import { queueInternalEmail, sendInternalEmail } from '@/core/email/internal-email.service';

function clean(value: unknown) { return String(value || '').trim(); }
function escapeHtml(value: string) { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function html(body: string) { return `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#111827;white-space:pre-wrap">${escapeHtml(body)}</div>`; }
function scopedRequest(request: Request, tenantSlug: string) { const headers = new Headers(request.headers); headers.set('x-tenant-id', tenantSlug); return new Request(request.url, { method: 'GET', headers }); }

export async function sendArtworkProofReadyEmail(request: Request, input: {
  tenantSlug: string;
  storeSlug: string;
  storeName: string;
  email: string;
  customerName: string;
  orderNumber: string;
  productName: string;
  revisionNumber: number;
  message?: string;
  accessToken: string;
}) {
  const brand = clean(input.storeName) || 'Print store';
  const proofUrl = `${new URL(request.url).origin}/native-stores/${encodeURIComponent(input.tenantSlug)}/${encodeURIComponent(input.storeSlug)}/artwork-proof?token=${encodeURIComponent(input.accessToken)}`;
  const body = `Hi ${clean(input.customerName) || 'Customer'},\n\nYour artwork proof is ready for review.\n\nOrder: ${clean(input.orderNumber)}\nProduct: ${clean(input.productName)}\nProof revision: ${Number(input.revisionNumber || 1)}${clean(input.message) ? `\nMessage from the artwork team: ${clean(input.message)}` : ''}\n\nOpen the secure proof link below to view the file, approve it for production, or request changes:\n${proofUrl}\n\nThe link expires after 14 days. Approving the proof confirms that the content, spelling, layout, size and supplied details are correct for production.\n\nKind regards,\n${brand}`;
  const scoped = scopedRequest(request, input.tenantSlug);
  const queued = await queueInternalEmail({ type: 'artwork-proof-ready', to: input.email, subject: `${brand}: artwork proof ${input.revisionNumber} for ${input.orderNumber}`, body, html: html(body) }, scoped);
  return sendInternalEmail(queued.id, scoped).catch(() => queued);
}

export async function sendArtworkProofDecisionEmail(request: Request, input: {
  tenantSlug: string;
  storeName: string;
  email: string;
  customerName: string;
  orderNumber: string;
  productName: string;
  revisionNumber: number;
  decision: 'approved' | 'changes-requested';
  note?: string;
}) {
  const brand = clean(input.storeName) || 'Print store';
  const approved = input.decision === 'approved';
  const body = `Hi ${clean(input.customerName) || 'Customer'},\n\nThis confirms that artwork proof revision ${Number(input.revisionNumber || 1)} for ${clean(input.orderNumber)} (${clean(input.productName)}) was ${approved ? 'approved for production' : 'returned with a change request'}.${clean(input.note) ? `\n\nYour note:\n${clean(input.note)}` : ''}\n\n${approved ? 'Production will remain subject to payment and the store’s normal production checks.' : 'The artwork team will prepare a new revision. The previous proof cannot be approved after it has been superseded.'}\n\nKind regards,\n${brand}`;
  const scoped = scopedRequest(request, input.tenantSlug);
  const queued = await queueInternalEmail({ type: approved ? 'artwork-proof-approved' : 'artwork-proof-changes-requested', to: input.email, subject: `${brand}: proof ${approved ? 'approved' : 'changes requested'} for ${input.orderNumber}`, body, html: html(body) }, scoped);
  return sendInternalEmail(queued.id, scoped).catch(() => queued);
}
