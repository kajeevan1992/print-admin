import { prisma } from '@/lib/prisma';

const defaultPlans = [
  { name: 'Starter', slug: 'starter', monthlyPriceMinor: 6900, yearlyPriceMinor: 69000, storefrontsLimit: 1, adminUsersLimit: 3, storageLimitGb: 10, apiAccess: false, supplierIntegrations: false },
  { name: 'Growth', slug: 'growth', monthlyPriceMinor: 24900, yearlyPriceMinor: 249000, storefrontsLimit: 3, adminUsersLimit: 15, storageLimitGb: 100, apiAccess: true, supplierIntegrations: true },
  { name: 'Enterprise', slug: 'enterprise', monthlyPriceMinor: 59900, yearlyPriceMinor: 599000, storefrontsLimit: 10, adminUsersLimit: 50, storageLimitGb: 500, apiAccess: true, supplierIntegrations: true },
];

function nextInvoiceDate() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date;
}

export async function ensureBillingPlans() {
  const plans = [];
  for (const plan of defaultPlans) {
    plans.push(await (prisma as any).platformBillingPlan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    }));
  }
  return plans;
}

export async function listBillingPlans() {
  await ensureBillingPlans();
  return (prisma as any).platformBillingPlan.findMany({ orderBy: { monthlyPriceMinor: 'asc' } });
}

export async function listSubscriptions() {
  return (prisma as any).platformBillingSubscription.findMany({ include: { tenant: true, plan: true }, orderBy: { createdAt: 'desc' } });
}

export async function assignTenantPlan({ tenantId, planSlug, billingInterval = 'monthly', status = 'active' }: { tenantId: string; planSlug: string; billingInterval?: string; status?: string }) {
  const plans = await ensureBillingPlans();
  const plan = plans.find((item: any) => item.slug === planSlug) || plans[0];
  const amountMinor = billingInterval === 'yearly' ? plan.yearlyPriceMinor : plan.monthlyPriceMinor;
  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      planName: plan.name,
      storefrontsLimit: plan.storefrontsLimit,
      adminUsersLimit: plan.adminUsersLimit,
      storageLimitGb: plan.storageLimitGb,
      status: status === 'trialing' ? 'TRIAL' : status === 'past_due' ? 'SUSPENDED' : 'ACTIVE',
    },
  });
  const subscription = await (prisma as any).platformBillingSubscription.upsert({
    where: { id: `sub-${tenantId}` },
    update: { planId: plan.id, status, billingInterval, currency: plan.currency, amountMinor, currentPeriodEnd: nextInvoiceDate() },
    create: { id: `sub-${tenantId}`, tenantId, planId: plan.id, status, billingInterval, currency: plan.currency, amountMinor, currentPeriodStart: new Date(), currentPeriodEnd: nextInvoiceDate() },
    include: { tenant: true, plan: true },
  });
  return { tenant, subscription };
}

export async function createInvoice({ tenantId, subscriptionId, subtotalMinor, taxMinor = 0, status = 'issued' }: { tenantId: string; subscriptionId?: string; subtotalMinor: number; taxMinor?: number; status?: string }) {
  const invoiceNumber = `SAAS-INV-${Date.now()}`;
  return (prisma as any).platformBillingInvoice.create({
    data: { tenantId, subscriptionId, invoiceNumber, subtotalMinor, taxMinor, totalMinor: subtotalMinor + taxMinor, status, dueAt: nextInvoiceDate() },
    include: { tenant: true, subscription: true },
  });
}

export async function markInvoicePaid(invoiceId: string) {
  const invoice = await (prisma as any).platformBillingInvoice.update({
    where: { id: invoiceId },
    data: { status: 'paid', amountPaidMinor: { increment: 0 }, paidAt: new Date() },
  });
  await (prisma as any).platformBillingPayment.create({
    data: { tenantId: invoice.tenantId, subscriptionId: invoice.subscriptionId, invoiceId: invoice.id, status: 'succeeded', provider: 'manual', currency: invoice.currency, amountMinor: invoice.totalMinor, paidAt: new Date() },
  });
  return invoice;
}

export async function listInvoices() {
  return (prisma as any).platformBillingInvoice.findMany({ include: { tenant: true, subscription: true }, orderBy: { createdAt: 'desc' } });
}

export async function listPayments() {
  return (prisma as any).platformBillingPayment.findMany({ include: { tenant: true, invoice: true }, orderBy: { createdAt: 'desc' } });
}

export async function billingSummary() {
  const [subscriptions, invoices, payments] = await Promise.all([listSubscriptions(), listInvoices(), listPayments()]);
  const active = subscriptions.filter((sub: any) => sub.status === 'active' || sub.status === 'trialing');
  const mrrMinor = active.reduce((sum: number, sub: any) => sum + (sub.billingInterval === 'yearly' ? Math.round(sub.amountMinor / 12) : sub.amountMinor), 0);
  const outstandingMinor = invoices.filter((inv: any) => inv.status !== 'paid').reduce((sum: number, inv: any) => sum + inv.totalMinor - inv.amountPaidMinor, 0);
  const paidMinor = payments.filter((pay: any) => pay.status === 'succeeded').reduce((sum: number, pay: any) => sum + pay.amountMinor, 0);
  return { subscriptions: subscriptions.length, activeSubscriptions: active.length, invoices: invoices.length, payments: payments.length, mrrMinor, outstandingMinor, paidMinor };
}
