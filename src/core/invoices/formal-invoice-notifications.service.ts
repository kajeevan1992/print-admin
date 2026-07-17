import { queueInternalEmail } from '@/core/email/internal-email.service';
import type { FormalCreditNote, FormalInvoice } from './formal-invoices.service';

function clean(value: unknown) { return String(value || '').trim(); }
function money(minor: number, currency: string) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'GBP' }).format(Number(minor || 0) / 100); }
function html(text: string) { return `<div style="font-family:Arial,sans-serif;line-height:1.55;color:#111827;white-space:pre-wrap">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`; }

export async function queueFormalInvoiceEmail(request: Request, invoice: FormalInvoice) {
  if (!invoice.customerEmail) return { ok: false, skipped: true, reason: 'Missing customer email.' };
  const accountUrl = `${new URL(request.url).origin}/native-stores/${encodeURIComponent(invoice.tenantSlug)}/${encodeURIComponent(invoice.storeSlug)}/account/invoices`;
  const body = `Hi ${invoice.customerName || 'Customer'},\n\nPayment has been confirmed for order ${invoice.orderNumber}.\n\nInvoice: ${invoice.invoiceNumber}\nTotal: ${money(invoice.totalMinor, invoice.currency)}\nVAT: ${money(invoice.vatMinor, invoice.currency)}\n\nSign in to download your VAT invoice and payment receipt:\n${accountUrl}\n\nThe invoice is stored as an immutable snapshot of the paid order.\n\nKind regards,\n${invoice.brandSnapshot?.brandName || invoice.brandSnapshot?.tradingName || 'Print team'}`;
  return queueInternalEmail({ type: 'customer-vat-invoice', to: invoice.customerEmail, subject: `VAT invoice ${invoice.invoiceNumber} for ${invoice.orderNumber}`, body, html: html(body), orderId: invoice.orderId }, request);
}

export async function queueFormalCreditNoteEmail(request: Request, invoice: FormalInvoice, creditNote: FormalCreditNote) {
  if (!invoice.customerEmail) return { ok: false, skipped: true, reason: 'Missing customer email.' };
  const accountUrl = `${new URL(request.url).origin}/native-stores/${encodeURIComponent(invoice.tenantSlug)}/${encodeURIComponent(invoice.storeSlug)}/account/invoices`;
  const body = `Hi ${invoice.customerName || 'Customer'},\n\nA credit note has been issued against invoice ${invoice.invoiceNumber}.\n\nCredit note: ${creditNote.creditNoteNumber}\nCredit total: ${money(creditNote.totalMinor, creditNote.currency)}\nReason: ${clean(creditNote.reason) || 'Refund / account adjustment'}\n\nSign in to download the credit note:\n${accountUrl}\n\nKind regards,\n${invoice.brandSnapshot?.brandName || invoice.brandSnapshot?.tradingName || 'Print team'}`;
  return queueInternalEmail({ type: 'customer-credit-note', to: invoice.customerEmail, subject: `Credit note ${creditNote.creditNoteNumber}`, body, html: html(body), orderId: invoice.orderId }, request);
}
