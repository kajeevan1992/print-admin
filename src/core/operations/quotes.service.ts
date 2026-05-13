import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';

type QuoteInput = Record<string, any>;

async function tenantIdFromRequest(request: Request) {
  const context = tenantContextFromRequest(request);
  const value = String(context.tenantId || '').trim();
  const tenant =
    (value && (await prisma.tenant.findUnique({ where: { id: value }, select: { id: true } }))) ||
    (value && (await prisma.tenant.findUnique({ where: { slug: value }, select: { id: true } }))) ||
    (await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }));

  if (!tenant) throw new Error('No tenant found for quote persistence.');
  return tenant.id;
}

function normalize(quote: any) {
  return {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    status: quote.status,
    customerName: quote.customerName || '',
    customerEmail: quote.customerEmail || '',
    productName: quote.productName || '',
    quantity: quote.quantity || 0,
    currency: quote.currency || 'GBP',
    totalMinor: quote.totalMinor || 0,
    notes: quote.notes || '',
    createdAt: quote.createdAt,
    updatedAt: quote.updatedAt,
    source: 'internal-quotes-db',
  };
}

export async function saveQuote(request: Request, input: QuoteInput) {
  const tenantId = await tenantIdFromRequest(request);

  const quoteNumber = String(input.quoteNumber || `QT-${Date.now()}`);
  const existing = await prisma.quote.findFirst({
    where: {
      tenantId,
      OR: [{ id: String(input.id || '') }, { quoteNumber }],
    },
    select: { id: true },
  });

  const data = {
    tenantId,
    quoteNumber,
    status: String(input.status || 'draft').toUpperCase(),
    customerName: String(input.customerName || ''),
    customerEmail: String(input.customerEmail || ''),
    productName: String(input.productName || ''),
    quantity: Number(input.quantity || 0),
    currency: String(input.currency || 'GBP'),
    totalMinor: Number(input.totalMinor || 0),
    notes: String(input.notes || ''),
    metadataJson: input,
  } as any;

  const quote = existing
    ? await prisma.quote.update({ where: { id: existing.id }, data })
    : await prisma.quote.create({ data });

  return normalize(quote);
}

export async function getQuote(request: Request, id: string) {
  const tenantId = await tenantIdFromRequest(request);
  const quote = await prisma.quote.findFirst({
    where: {
      tenantId,
      OR: [{ id }, { quoteNumber: id }],
    },
  });

  return quote ? normalize(quote) : null;
}

export async function listQuotes(request: Request) {
  const tenantId = await tenantIdFromRequest(request);
  const quotes = await prisma.quote.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return quotes.map(normalize);
}
