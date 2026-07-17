import { createBasicPdf, type BasicPdfLine } from '@/core/documents/basic-pdf';
import type { FormalCreditNote, FormalInvoice } from './formal-invoices.service';

function money(minor: number, currency = 'GBP') { return `${currency} ${(Number(minor || 0) / 100).toFixed(2)}`; }
function date(value: string) { try { return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(value)); } catch { return value || ''; } }
function line(text = '', options: Omit<BasicPdfLine, 'text'> = {}): BasicPdfLine { return { text, ...options }; }
function vatRegistered(invoice: FormalInvoice) { return Boolean(String(invoice.brandSnapshot?.vatNumber || '').trim()); }
function taxLabel(invoice: FormalInvoice) { return vatRegistered(invoice) ? 'VAT' : 'Tax'; }

function businessLines(invoice: FormalInvoice) {
  const brand = invoice.brandSnapshot || ({} as any);
  return [
    line(brand.brandName || brand.tradingName || 'Print company', { size: 21, bold: true, gapAfter: 5 }),
    line(brand.legalName || ''),
    line(brand.address || ''),
    line([brand.email, brand.phone, brand.website].filter(Boolean).join(' | ')),
    line(brand.companyNumber ? `Company number: ${brand.companyNumber}` : ''),
    line(brand.vatNumber ? `VAT registration number: ${brand.vatNumber}` : 'Not VAT registered', { gapAfter: 8 }),
  ].filter((item) => item.text);
}

function customerLines(invoice: FormalInvoice) {
  return [
    line('BILL TO', { bold: true }),
    line(invoice.customerName || 'Customer'),
    line(invoice.customerCompany || ''),
    line(invoice.billingAddress || ''),
    line(invoice.customerEmail || ''),
    line(invoice.customerPhone || '', { gapAfter: 8 }),
  ].filter((item) => item.text);
}

function invoiceItemLines(invoice: FormalInvoice) {
  const label = taxLabel(invoice);
  const rows: BasicPdfLine[] = [line('ITEMS', { bold: true, gapAfter: 2 })];
  for (const item of invoice.lines) {
    rows.push(line(`${item.productName}${item.sku ? ` [${item.sku}]` : ''}`, { bold: true }));
    rows.push(line(`Qty ${item.quantity} | Unit net ${money(item.unitNetMinor, invoice.currency)} | ${label} ${item.vatRate}% | Net ${money(item.netMinor, invoice.currency)} | ${label} ${money(item.vatMinor, invoice.currency)} | Gross ${money(item.grossMinor, invoice.currency)}`, { gapAfter: 4 }));
  }
  return rows;
}

export function buildInvoicePdf(invoice: FormalInvoice, receipt = false) {
  const registered = vatRegistered(invoice);
  const documentName = registered ? 'VAT invoice' : 'Invoice';
  const title = receipt ? `Payment receipt ${invoice.invoiceNumber}` : `${documentName} ${invoice.invoiceNumber}`;
  const lines: BasicPdfLine[] = [
    ...businessLines(invoice),
    line(receipt ? 'PAYMENT RECEIPT' : registered ? 'VAT INVOICE' : 'INVOICE', { size: 18, bold: true }),
    line(`Invoice number: ${invoice.invoiceNumber}`, { bold: true }),
    line(`Order number: ${invoice.orderNumber}`),
    ...(invoice.quoteReference ? [line(`Quote reference: ${invoice.quoteReference}`)] : []),
    line(`Issue date: ${date(invoice.issuedAt)}`),
    line(`Payment date: ${date(invoice.paidAt || invoice.issuedAt)}`),
    line(`Status: ${invoice.status.replace(/_/g, ' ')}`, { gapAfter: 8 }),
    ...customerLines(invoice),
    ...invoiceItemLines(invoice),
    line(`Net total: ${money(invoice.subtotalMinor, invoice.currency)}`, { bold: true }),
    line(`${taxLabel(invoice)} total: ${money(invoice.vatMinor, invoice.currency)}`, { bold: true }),
    line(`Invoice total: ${money(invoice.totalMinor, invoice.currency)}`, { size: 14, bold: true }),
    ...(invoice.creditedMinor ? [line(`Credit notes issued: ${money(invoice.creditedMinor, invoice.currency)}`, { bold: true })] : []),
    line('', { gapAfter: 5 }),
    ...(invoice.brandSnapshot?.paymentTerms ? [line(`Payment terms: ${invoice.brandSnapshot.paymentTerms}`)] : []),
    ...(invoice.brandSnapshot?.bankDetails ? [line(`Bank details: ${invoice.brandSnapshot.bankDetails}`)] : []),
    ...(invoice.brandSnapshot?.footerNote ? [line(invoice.brandSnapshot.footerNote)] : []),
  ];
  return createBasicPdf({ title, lines, footer: `${invoice.invoiceNumber} | ${invoice.orderNumber} | ${invoice.customerName}` });
}

export function buildCreditNotePdf(invoice: FormalInvoice, creditNote: FormalCreditNote) {
  const label = taxLabel(invoice);
  const lines: BasicPdfLine[] = [
    ...businessLines(invoice),
    line('CREDIT NOTE', { size: 18, bold: true }),
    line(`Credit note number: ${creditNote.creditNoteNumber}`, { bold: true }),
    line(`Original invoice: ${invoice.invoiceNumber}`),
    line(`Order number: ${invoice.orderNumber}`),
    line(`Issue date: ${date(creditNote.issuedAt)}`),
    line(`Reason: ${creditNote.reason}`, { gapAfter: 8 }),
    ...customerLines(invoice),
    line('CREDITED ITEMS', { bold: true, gapAfter: 2 }),
    ...creditNote.lines.flatMap((item) => [
      line(item.description, { bold: true }),
      line(`${label} ${item.vatRate}% | Net ${money(item.netMinor, creditNote.currency)} | ${label} ${money(item.vatMinor, creditNote.currency)} | Credit ${money(item.grossMinor, creditNote.currency)}`, { gapAfter: 4 }),
    ]),
    line(`Net credit: ${money(creditNote.netMinor, creditNote.currency)}`, { bold: true }),
    line(`${label} credit: ${money(creditNote.vatMinor, creditNote.currency)}`, { bold: true }),
    line(`Total credit: ${money(creditNote.totalMinor, creditNote.currency)}`, { size: 14, bold: true }),
    ...(invoice.brandSnapshot?.footerNote ? [line(invoice.brandSnapshot.footerNote)] : []),
  ];
  return createBasicPdf({ title: `Credit note ${creditNote.creditNoteNumber}`, lines, footer: `${creditNote.creditNoteNumber} | Original invoice ${invoice.invoiceNumber}` });
}
