import { queueInternalEmail } from '@/core/email/internal-email.service';
import type { FormalQuote } from './formal-quotes.service';

function money(quote: FormalQuote) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: quote.currency || 'GBP' }).format(quote.totalMinor / 100); }
function escape(value: unknown) { return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function lines(quote: FormalQuote) { return quote.lines.map((line) => `- ${line.productName} × ${line.quantity}`).join('\n'); }

export async function queueFormalQuoteEmail(request: Request, quote: FormalQuote, input: { accessUrl: string; documentUrl: string; note?: string }) {
  if (!quote.customerEmail) return { ok: false, skipped: true, reason: 'Missing customer email.' };
  const body = `Hi ${quote.customerName || 'there'},\n\nYour formal print quotation ${quote.quoteNumber} is ready.\n\n${quote.title}\nTotal: ${money(quote)}\nExpires: ${quote.expiresAt ? new Date(quote.expiresAt).toLocaleDateString('en-GB') : 'Not set'}\n\nItems:\n${lines(quote)}\n\nReview, approve or decline:\n${input.accessUrl}\n\nPrint or save the formal quotation:\n${input.documentUrl}\n\n${input.note ? `Note from our team:\n${input.note}\n\n` : ''}Once approved, you can continue to secure payment.\n\nKind regards,\nHolo Print`;
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827"><p>Hi ${escape(quote.customerName || 'there')},</p><p>Your formal print quotation <strong>${escape(quote.quoteNumber)}</strong> is ready.</p><p><strong>${escape(quote.title)}</strong><br>Total: <strong>${escape(money(quote))}</strong><br>Expires: ${escape(quote.expiresAt ? new Date(quote.expiresAt).toLocaleDateString('en-GB') : 'Not set')}</p><p><a href="${escape(input.accessUrl)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#18A7D0;color:white;text-decoration:none;font-weight:bold">Review quotation</a></p><p><a href="${escape(input.documentUrl)}">Print or save the formal quotation</a></p>${input.note ? `<p>${escape(input.note)}</p>` : ''}<p>Once approved, you can continue to secure payment.</p><p>Kind regards,<br>Holo Print</p></div>`;
  const email = await queueInternalEmail({ type: 'customer-formal-quote', to: quote.customerEmail, subject: `Quotation ${quote.quoteNumber} from Holo Print`, body, html, quoteId: quote.id }, request);
  return { ok: true, email };
}
