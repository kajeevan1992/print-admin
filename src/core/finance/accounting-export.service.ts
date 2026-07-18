import type { FinanceReconciliationReport } from './accounting-reconciliation.service';

export type AccountingExportFormat = 'sales-ledger' | 'journal' | 'vat' | 'exceptions';
function safeCell(value: unknown) { const text = String(value ?? ''); const protectedText = /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text; return `"${protectedText.replace(/"/g, '""')}"`; }
function csv(rows: Array<Record<string, unknown>>) { const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))); if (!headers.length) return '\uFEFF'; return `\uFEFF${[headers.map(safeCell).join(','), ...rows.map((row) => headers.map((key) => safeCell(row[key])).join(','))].join('\r\n')}\r\n`; }
function pounds(minor: number) { return (Number(minor || 0) / 100).toFixed(2); }
function date(value: string) { return value ? value.slice(0, 10) : ''; }
function reference(invoice: any) { const payment = invoice.paymentSnapshot || {}; return String(payment.reference || payment.paymentIntentId || payment.checkoutSessionId || ''); }
function inPeriod(value: string, report: FinanceReconciliationReport) { const parsed = new Date(value); return !Number.isNaN(parsed.getTime()) && parsed >= new Date(report.from) && parsed <= new Date(report.to); }

function salesLedgerRows(report: FinanceReconciliationReport) {
  const rows: Array<Record<string, unknown>> = [];
  for (const invoice of report.invoices) {
    if (inPeriod(invoice.issuedAt, report)) rows.push({ DocumentType: 'Invoice', DocumentNumber: invoice.invoiceNumber, DocumentDate: date(invoice.issuedAt), PaymentDate: date(invoice.paidAt), CustomerName: invoice.customerName, CustomerCompany: invoice.customerCompany, CustomerEmail: invoice.customerEmail, OrderNumber: invoice.orderNumber, QuoteReference: invoice.quoteReference, Store: invoice.storeSlug, Currency: invoice.currency, Net: pounds(invoice.subtotalMinor), VAT: pounds(invoice.vatMinor), Gross: pounds(invoice.totalMinor), PaymentReference: reference(invoice), Status: invoice.status });
    for (const note of invoice.creditNotes.filter((item) => item.status === 'issued' && inPeriod(item.issuedAt, report))) rows.push({ DocumentType: 'Credit Note', DocumentNumber: note.creditNoteNumber, DocumentDate: date(note.issuedAt), PaymentDate: '', CustomerName: invoice.customerName, CustomerCompany: invoice.customerCompany, CustomerEmail: invoice.customerEmail, OrderNumber: invoice.orderNumber, QuoteReference: invoice.quoteReference, Store: invoice.storeSlug, Currency: note.currency, Net: `-${pounds(note.netMinor)}`, VAT: `-${pounds(note.vatMinor)}`, Gross: `-${pounds(note.totalMinor)}`, PaymentReference: note.externalReference, Status: note.status });
  }
  return rows;
}

function journalRows(report: FinanceReconciliationReport) {
  const rows: Array<Record<string, unknown>> = []; let line = 0;
  const push = (document: string, documentDate: string, description: string, account: string, debitMinor: number, creditMinor: number, currency: string, customer: string, referenceValue: string) => rows.push({ JournalLine: ++line, DocumentNumber: document, Date: date(documentDate), Description: description, Account: account, Debit: debitMinor ? pounds(debitMinor) : '', Credit: creditMinor ? pounds(creditMinor) : '', Currency: currency, Customer: customer, Reference: referenceValue });
  for (const invoice of report.invoices) {
    if (inPeriod(invoice.issuedAt, report)) {
      push(invoice.invoiceNumber, invoice.issuedAt, `Sales invoice ${invoice.invoiceNumber}`, 'Accounts Receivable', invoice.totalMinor, 0, invoice.currency, invoice.customerName, invoice.orderNumber);
      push(invoice.invoiceNumber, invoice.issuedAt, `Net sales ${invoice.invoiceNumber}`, 'Sales Revenue', 0, invoice.subtotalMinor, invoice.currency, invoice.customerName, invoice.orderNumber);
      if (invoice.vatMinor) push(invoice.invoiceNumber, invoice.issuedAt, `Output VAT ${invoice.invoiceNumber}`, 'VAT Payable', 0, invoice.vatMinor, invoice.currency, invoice.customerName, invoice.orderNumber);
    }
    for (const note of invoice.creditNotes.filter((item) => item.status === 'issued' && inPeriod(item.issuedAt, report))) {
      push(note.creditNoteNumber, note.issuedAt, `Sales credit ${note.creditNoteNumber}`, 'Sales Returns', note.netMinor, 0, note.currency, invoice.customerName, invoice.invoiceNumber);
      if (note.vatMinor) push(note.creditNoteNumber, note.issuedAt, `VAT credit ${note.creditNoteNumber}`, 'VAT Payable', note.vatMinor, 0, note.currency, invoice.customerName, invoice.invoiceNumber);
      push(note.creditNoteNumber, note.issuedAt, `Customer credit ${note.creditNoteNumber}`, 'Accounts Receivable', 0, note.totalMinor, note.currency, invoice.customerName, invoice.invoiceNumber);
    }
  }
  return rows;
}
function vatRows(report: FinanceReconciliationReport) { return report.vat.map((row) => ({ PeriodFrom: date(report.from), PeriodTo: date(report.to), VATRate: `${row.rate}%`, SalesNet: pounds(row.salesNetMinor), SalesVAT: pounds(row.salesVatMinor), SalesGross: pounds(row.salesGrossMinor), CreditNet: pounds(row.creditNetMinor), CreditVAT: pounds(row.creditVatMinor), CreditGross: pounds(row.creditGrossMinor), NetTaxableSales: pounds(row.netNetMinor), NetOutputVAT: pounds(row.netVatMinor), NetGrossSales: pounds(row.netGrossMinor), Currency: report.currency })); }
function exceptionRows(report: FinanceReconciliationReport) { return report.issues.map((item) => ({ Severity: item.severity, Code: item.code, Message: item.message, OrderNumber: item.orderNumber, OrderId: item.orderId, InvoiceNumber: item.invoiceNumber, InvoiceId: item.invoiceId, Expected: pounds(item.expectedMinor), Actual: pounds(item.actualMinor), Currency: item.currency, PeriodFrom: date(report.from), PeriodTo: date(report.to) })); }
export function buildAccountingExport(report: FinanceReconciliationReport, format: AccountingExportFormat) { const rows = format === 'journal' ? journalRows(report) : format === 'vat' ? vatRows(report) : format === 'exceptions' ? exceptionRows(report) : salesLedgerRows(report); const suffix = `${date(report.from)}_${date(report.to)}`; return { filename: `${format}_${suffix}.csv`, contentType: 'text/csv; charset=utf-8', body: csv(rows), rowCount: rows.length }; }
