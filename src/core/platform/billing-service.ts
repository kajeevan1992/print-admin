import { prisma } from '@/lib/prisma';

type BillingPlanSeed = {
  id?: string;
  name: string;
  slug: string;
  currency?: string;
  monthlyPriceMinor: number;
  yearlyPriceMinor: number;
  storefrontsLimit: number;
  adminUsersLimit: number;
  storageLimitGb: number;
  apiAccess: boolean;
  supplierIntegrations: boolean;
};

const defaultPlans: BillingPlanSeed[] = [
  { id: 'plan-starter', name: 'Starter', slug: 'starter', currency: 'GBP', monthlyPriceMinor: 6900, yearlyPriceMinor: 69000, storefrontsLimit: 1, adminUsersLimit: 3, storageLimitGb: 10, apiAccess: false, supplierIntegrations: false },
  { id: 'plan-growth', name: 'Growth', slug: 'growth', currency: 'GBP', monthlyPriceMinor: 24900, yearlyPriceMinor: 249000, storefrontsLimit: 3, adminUsersLimit: 15, storageLimitGb: 100, apiAccess: true, supplierIntegrations: true },
  { id: 'plan-enterprise', name: 'Enterprise', slug: 'enterprise', currency: 'GBP', monthlyPriceMinor: 59900, yearlyPriceMinor: 599000, storefrontsLimit: 10, adminUsersLimit: 50, storageLimitGb: 500, apiAccess: true, supplierIntegrations: true },
];

export const emptyBillingSummary = {
  subscriptions: 0,
  activeSubscriptions: 0,
  invoices: 0,
  payments: 0,
  mrrMinor: 0,
  outstandingMinor: 0,
  paidMinor: 0,
  migrationRequired: true,
};

function nextInvoiceDate() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date;
}

function isMissingBillingTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return (
    message.includes('PlatformBillingPlan') ||
    message.includes('PlatformBillingSubscription') ||
    message.includes('PlatformBillingInvoice') ||
    message.includes('PlatformBillingPayment') ||
    message.includes('does not exist in the current database')
  );
}

export async function ensureBillingPlans() {
  const plans = [];
  try {
    for (const plan of defaultPlans) {
      plans.push(await (prisma as any).platformBillingPlan.upsert({
        where: { slug: plan.slug },
        update: plan,
        create: plan,
      }));
    }
    return plans;
  } catch (error) {
    if (isMissingBillingTableError(error)) {
      return defaultPlans.map((plan) => ({ ...plan, id: plan.id || `plan-${plan.slug}`, currency: plan.currency || 'GBP', migrationRequired: true }));
    }
    throw error;
  }
}

export async function listBillingPlans() {
  try {
    await ensureBillingPlans();
    return (prisma as any).platformBillingPlan.findMany({ orderBy: { monthlyPriceMinor: 'asc' } });
  } catch (error) {
    if (isMissingBillingTableError(error)) {
      return defaultPlans.map((plan) => ({ ...plan, id: plan.id || `plan-${plan.slug}`, currency: plan.currency || 'GBP', migrationRequired: true }));
    }
    throw error;
  }
}

export async function listSubscriptions() {
  try {
    return await (prisma as any).platformBillingSubscription.findMany({ include: { tenant: true, plan: true }, orderBy: { createdAt: 'desc' } });
  } catch (error) {
    if (isMissingBillingTableError(error)) return [];
    throw error;
  }
}

export async function assignTenantPlan({ tenantId, planSlug, billingInterval = 'monthly', status = 'active' }: { tenantId: string; planSlug: string; billingInterval?: string; status?: string }) {
  const plans = await ensureBillingPlans();
  const plan = plans.find((item: any) => item.slug === planSlug) || plans[0];

  if ((plan as any)?.migrationRequired) {
    throw new Error('Billing tables are not migrated yet. Run Prisma migration/db push before assigning plans.');
  }

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
    update: { planId: plan.id, status, billingInterval, currency: plan.currency || 'GBP', amountMinor, currentPeriodEnd: nextInvoiceDate() },
    create: { id: `sub-${tenantId}`, tenantId, planId: plan.id, status, billingInterval, currency: plan.currency || 'GBP', amountMinor, currentPeriodStart: new Date(), currentPeriodEnd: nextInvoiceDate() },
    include: { tenant: true, plan: true },
  });
  return { tenant, subscription };
}

export async function createInvoice({ tenantId, subscriptionId, subtotalMinor, taxMinor = 0, status = 'issued' }: { tenantId: string; subscriptionId?: string; subtotalMinor: number; taxMinor?: number; status?: string }) {
  const invoiceNumber = `SAAS-INV-${Date.now()}`;
  try {
    return await (prisma as any).platformBillingInvoice.create({
      data: { tenantId, subscriptionId, invoiceNumber, subtotalMinor, taxMinor, totalMinor: subtotalMinor + taxMinor, status, dueAt: nextInvoiceDate() },
      include: { tenant: true, subscription: true },
    });
  } catch (error) {
    if (isMissingBillingTableError(error)) {
      throw new Error('Billing invoice table is not migrated yet. Run Prisma migration/db push before generating invoices.');
    }
    throw error;
  }
}

export async function markInvoicePaid(invoiceId: string) {
  try {
    const invoice = await (prisma as any).platformBillingInvoice.update({
      where: { id: invoiceId },
      data: { status: 'paid', amountPaidMinor: { increment: 0 }, paidAt: new Date() },
    });
    await (prisma as any).platformBillingPayment.create({
      data: { tenantId: invoice.tenantId, subscriptionId: invoice.subscriptionId, invoiceId: invoice.id, status: 'succeeded', provider: 'manual', currency: invoice.currency, amountMinor: invoice.totalMinor, paidAt: new Date() },
    });
    return invoice;
  } catch (error) {
    if (isMissingBillingTableError(error)) {
      throw new Error('Billing payment tables are not migrated yet. Run Prisma migration/db push before marking invoices paid.');
    }
    throw error;
  }
}

export async function listInvoices() {
  try {
    return await (prisma as any).platformBillingInvoice.findMany({ include: { tenant: true, subscription: true }, orderBy: { createdAt: 'desc' } });
  } catch (error) {
    if (isMissingBillingTableError(error)) return [];
    throw error;
  }
}

export async function listPayments() {
  try {
    return await (prisma as any).platformBillingPayment.findMany({ include: { tenant: true, invoice: true }, orderBy: { createdAt: 'desc' } });
  } catch (error) {
    if (isMissingBillingTableError(error)) return [];
    throw error;
  }
}

export async function billingSummary() {
  try {
    const [subscriptions, invoices, payments] = await Promise.all([listSubscriptions(), listInvoices(), listPayments()]);
    const active = subscriptions.filter((sub: any) => sub.status === 'active' || sub.status === 'trialing');
    const mrrMinor = active.reduce((sum: number, sub: any) => sum + (sub.billingInterval === 'yearly' ? Math.round(sub.amountMinor / 12) : sub.amountMinor), 0);
    const outstandingMinor = invoices.filter((inv: any) => inv.status !== 'paid').reduce((sum: number, inv: any) => sum + inv.totalMinor - inv.amountPaidMinor, 0);
    const paidMinor = payments.filter((pay: any) => pay.status === 'succeeded').reduce((sum: number, pay: any) => sum + pay.amountMinor, 0);
    return { subscriptions: subscriptions.length, activeSubscriptions: active.length, invoices: invoices.length, payments: payments.length, mrrMinor, outstandingMinor, paidMinor, migrationRequired: false };
  } catch (error) {
    if (isMissingBillingTableError(error)) return emptyBillingSummary;
    throw error;
  }
}
