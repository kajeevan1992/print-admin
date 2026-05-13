import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { readProductionBoardStore, saveProductionBoardStore } from '@/core/storefront/production-board';
import { getCustomerJobTrackingIntelligence } from '@/core/storefront/customer-job-tracking-intelligence';
import { getDynamicPricingIntelligence, generateDynamicQuote } from '@/core/storefront/dynamic-pricing-intelligence';
import { getProductionCostingIntelligence } from '@/core/storefront/production-costing-intelligence';

/**
 * v326 Smart CRM + Sales Pipeline Intelligence
 *
 * Reuses existing live internal systems:
 * - existing customer records and quote records from internal config storage
 * - v320 dynamic pricing and quote intelligence
 * - v323 customer job tracking and proof activity
 * - production board/order workflow timeline
 * - v319 production margin intelligence
 *
 * This is not a disconnected CRM demo. It is the sales intelligence layer for
 * quote-to-order, customer value, follow-up, account management and B2B pricing.
 */

type Store = Record<string, any>;

const CONFIG_RESOURCE = 'admin-config' as any;
const CUSTOMERS_KEY = 'admin_customers_store';
const QUOTES_KEY = 'admin_quotes_store';
const CRM_LEDGER_KEY = 'storefront-crm-sales-ledger';

const CRM_SETTINGS = {
  quoteFollowUpHours: 24,
  staleQuoteDays: 7,
  repeatOrderWindowDays: 90,
  highValueCustomerMinor: 100000,
  b2bDiscountPercent: 8,
  enterpriseDiscountPercent: 12,
  minimumMarginGuardPercent: 22
};

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanText(value: unknown) {
  return String(value || '').toLowerCase();
}

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function daysSince(value?: string) {
  if (!value) return 999;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 999;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

async function readConfigList(request: Request, key: string) {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key);
    const meta = (record as any)?.metadataJson || {};
    if (Array.isArray(meta.items)) return meta.items;
    if (Array.isArray(meta.store?.items)) return meta.store.items;
    if (Array.isArray(meta.data)) return meta.data;
  } catch {
    return [];
  }
  return [];
}

async function readCrmLedger(request: Request) {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, CRM_LEDGER_KEY);
    const store = (record as any)?.metadataJson?.store || {};
    return {
      leads: Array.isArray(store.leads) ? store.leads : [],
      activities: Array.isArray(store.activities) ? store.activities : [],
      followUps: Array.isArray(store.followUps) ? store.followUps : [],
      assignments: Array.isArray(store.assignments) ? store.assignments : [],
      opportunities: Array.isArray(store.opportunities) ? store.opportunities : []
    };
  } catch {
    return { leads: [], activities: [], followUps: [], assignments: [], opportunities: [] };
  }
}

async function saveCrmLedger(request: Request, store: Store) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: CRM_LEDGER_KEY,
    slug: CRM_LEDGER_KEY,
    name: 'CRM sales pipeline ledger',
    description: 'Leads, opportunities, sales activities, follow-ups and account assignments.',
    metadataJson: {
      store,
      savedAt: nowIso(),
      storageKey: CRM_LEDGER_KEY,
      source: 'CrmSalesPipelineIntelligence'
    }
  } as any);
}

function customerKey(value: Store) {
  return cleanText(value.email || value.customerEmail || value.name || value.customer || value.organization || value.company);
}

function quoteCustomerKey(value: Store) {
  return cleanText(value.customer || value.customerName || value.organization || value.email || value.customerEmail);
}

function quoteValueMinor(quote: Store) {
  return asNumber(quote.totalMinor, asNumber(quote.total, 0) * (asNumber(quote.total, 0) < 10000 ? 100 : 1));
}

function buildCustomerProfiles(customers: Store[], quotes: Store[], boardItems: Store[], tracking: Store, costing: Store) {
  return customers.map((customer) => {
    const key = customerKey(customer);
    const customerQuotes = quotes.filter((quote) => quoteCustomerKey(quote).includes(key) || key.includes(quoteCustomerKey(quote)) || cleanText(quote.customer).includes(cleanText(customer.organization || customer.name)));
    const customerJobs = boardItems.filter((job) => cleanText(job.customer).includes(cleanText(customer.organization || customer.name)) || cleanText(job.customer).includes(cleanText(customer.name)));
    const trackingJobs = Array.isArray(tracking.jobs) ? tracking.jobs.filter((job: Store) => cleanText(job.customer).includes(cleanText(customer.organization || customer.name))) : [];
    const spendMinor = asNumber(customer.spendYtd, 0) * (asNumber(customer.spendYtd, 0) < 10000 ? 100 : 1) + customerQuotes.filter((q) => q.status === 'approved').reduce((sum, quote) => sum + quoteValueMinor(quote), 0);
    const activeJobs = customerJobs.filter((job) => job.stage !== 'shipped').length;
    const approvedQuotes = customerQuotes.filter((quote) => quote.status === 'approved').length;
    const sentQuotes = customerQuotes.filter((quote) => quote.status === 'sent').length;
    const conversionRate = customerQuotes.length ? Math.round((approvedQuotes / customerQuotes.length) * 100) : 0;
    const segment = customer.segment || (spendMinor >= CRM_SETTINGS.highValueCustomerMinor ? 'Enterprise' : activeJobs > 1 ? 'B2B' : 'Retail');
    return {
      id: customer.id || makeId('customer-profile'),
      name: customer.name,
      organization: customer.organization,
      email: customer.email,
      segment,
      status: customer.status || 'active',
      spendMinor,
      quoteCount: customerQuotes.length,
      approvedQuotes,
      sentQuotes,
      activeJobs,
      completedJobs: customerJobs.filter((job) => job.stage === 'shipped').length,
      trackingJobs: trackingJobs.length,
      conversionRate,
      lifetimeValueMinor: spendMinor,
      valueBand: spendMinor >= CRM_SETTINGS.highValueCustomerMinor ? 'high-value' : spendMinor > 30000 ? 'growth' : 'standard',
      repeatOrderScore: Math.min(100, activeJobs * 20 + approvedQuotes * 15 + conversionRate),
      marginRisk: Array.isArray(costing.marginAlerts) ? costing.marginAlerts.filter((alert: Store) => customerJobs.some((job) => cleanText(job.orderNumber) === cleanText(alert.orderNumber))).length : 0
    };
  });
}

function buildPipeline(quotes: Store[], ledger: Store) {
  const quoteOpps = quotes.map((quote) => {
    const value = quoteValueMinor(quote);
    const age = daysSince(quote.updatedAt || quote.createdAt);
    const status = quote.status === 'approved' ? 'won' : quote.status === 'expired' ? 'lost' : quote.status === 'sent' ? 'proposal-sent' : 'draft';
    const probability = status === 'won' ? 100 : status === 'lost' ? 0 : status === 'proposal-sent' ? Math.max(25, 70 - age * 5) : 35;
    return {
      id: quote.id || makeId('opportunity'),
      source: 'quote',
      customer: quote.customer,
      title: quote.title || 'Print quote',
      stage: status,
      valueMinor: value,
      probability,
      weightedValueMinor: Math.round(value * probability / 100),
      ageDays: age,
      channel: quote.channel || 'admin',
      quoteStatus: quote.status,
      stale: status === 'proposal-sent' && age >= CRM_SETTINGS.staleQuoteDays
    };
  });

  const manualOpps = Array.isArray(ledger.opportunities) ? ledger.opportunities : [];
  return [...quoteOpps, ...manualOpps].sort((a, b) => asNumber(b.weightedValueMinor, 0) - asNumber(a.weightedValueMinor, 0));
}

function buildFollowUps(pipeline: Store[], profiles: Store[], ledger: Store) {
  const existing = Array.isArray(ledger.followUps) ? ledger.followUps : [];
  const quoteFollowUps = pipeline
    .filter((opp) => opp.stage === 'proposal-sent' || opp.stale)
    .map((opp) => {
      const profile = profiles.find((customer) => cleanText(opp.customer).includes(cleanText(customer.organization || customer.name)) || cleanText(customer.organization || customer.name).includes(cleanText(opp.customer)));
      return {
        id: `follow-${opp.id}`,
        opportunityId: opp.id,
        customer: opp.customer,
        customerEmail: profile?.email || null,
        priority: opp.stale || asNumber(opp.valueMinor, 0) > 50000 ? 'high' : 'normal',
        reason: opp.stale ? 'Quote is stale and needs recovery.' : 'Quote sent; follow up before it goes cold.',
        dueAt: new Date(Date.now() + CRM_SETTINGS.quoteFollowUpHours * 3600000).toISOString(),
        source: 'quote-pipeline'
      };
    });
  return [...quoteFollowUps, ...existing].slice(0, 200);
}

function buildAccountAssignments(profiles: Store[], ledger: Store) {
  const existing = Array.isArray(ledger.assignments) ? ledger.assignments : [];
  return profiles.map((profile) => {
    const assignment = existing.find((item: Store) => cleanText(item.customerId) === cleanText(profile.id) || cleanText(item.customerEmail) === cleanText(profile.email));
    const manager = assignment?.accountManager || (profile.valueBand === 'high-value' ? 'Senior Account Manager' : profile.segment === 'B2B' || profile.segment === 'Enterprise' ? 'B2B Account Manager' : 'Retail Desk');
    return {
      customerId: profile.id,
      customerName: profile.name,
      organization: profile.organization,
      customerEmail: profile.email,
      accountManager: manager,
      assignmentSource: assignment ? 'manual' : 'auto',
      reason: profile.valueBand === 'high-value' ? 'High lifetime value customer.' : profile.segment === 'B2B' || profile.segment === 'Enterprise' ? 'Business account.' : 'Standard retail handling.'
    };
  });
}

function buildSalesActivityTimeline(ledger: Store, board: Store, tracking: Store) {
  const crmActivities = Array.isArray(ledger.activities) ? ledger.activities : [];
  const boardActivities = Array.isArray(board.actions) ? board.actions.filter((action: Store) => String(action.action || '').includes('customer') || String(action.action || '').includes('pricing') || String(action.action || '').includes('quote')) : [];
  const trackingActivities = Array.isArray(tracking.trackingEvents) ? tracking.trackingEvents : [];
  return [...crmActivities, ...boardActivities, ...trackingActivities]
    .map((activity) => ({
      id: activity.id || makeId('sales-activity'),
      type: activity.action || activity.type || 'activity',
      customer: activity.customer || activity.customerEmail || null,
      orderNumber: activity.orderNumber || null,
      quoteId: activity.quoteId || null,
      message: activity.note || activity.message || 'Sales activity recorded.',
      at: activity.at || nowIso(),
      source: activity.source || 'crm-sales-pipeline'
    }))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 300);
}

function buildB2BPricingIntelligence(profiles: Store[], pricing: Store, costing: Store) {
  const alerts = Array.isArray(costing.marginAlerts) ? costing.marginAlerts : [];
  return profiles
    .filter((profile) => ['B2B', 'Enterprise'].includes(String(profile.segment)))
    .map((profile) => {
      const discount = profile.segment === 'Enterprise' ? CRM_SETTINGS.enterpriseDiscountPercent : CRM_SETTINGS.b2bDiscountPercent;
      const safeDiscount = profile.marginRisk ? Math.max(0, discount - 4) : discount;
      return {
        customerId: profile.id,
        customerName: profile.name,
        organization: profile.organization,
        segment: profile.segment,
        suggestedDiscountPercent: safeDiscount,
        marginGuardPercent: CRM_SETTINGS.minimumMarginGuardPercent,
        marginRisk: profile.marginRisk,
        recommendation: profile.marginRisk ? 'Discount reduced because related jobs have margin risk.' : 'B2B pricing can be applied with margin guard.',
        pricingSource: pricing.source || 'dynamic-pricing-intelligence',
        activeMarginAlerts: alerts.length
      };
    });
}

function buildAbandonedQuoteRecovery(pipeline: Store[]) {
  return pipeline
    .filter((opp) => opp.stage === 'proposal-sent' && opp.ageDays >= CRM_SETTINGS.staleQuoteDays)
    .map((opp) => ({
      id: `recovery-${opp.id}`,
      opportunityId: opp.id,
      customer: opp.customer,
      valueMinor: opp.valueMinor,
      ageDays: opp.ageDays,
      priority: opp.valueMinor > 50000 ? 'high' : 'normal',
      suggestedMessage: `Just checking if you would like us to help move forward with ${opp.title}. We can review options, turnaround or artwork support if needed.`,
      source: 'abandoned-quote-recovery'
    }));
}

export async function getCrmSalesPipelineIntelligence(request: Request) {
  const [customers, quotes, board, tracking, pricing, costing, ledger] = await Promise.all([
    readConfigList(request, CUSTOMERS_KEY),
    readConfigList(request, QUOTES_KEY),
    readProductionBoardStore(request),
    getCustomerJobTrackingIntelligence(request).catch(() => ({})),
    getDynamicPricingIntelligence(request).catch(() => ({})),
    getProductionCostingIntelligence(request).catch(() => ({})),
    readCrmLedger(request)
  ]);

  const profiles = buildCustomerProfiles(customers, quotes, board.items || [], tracking, costing);
  const pipeline = buildPipeline(quotes, ledger);
  const followUps = buildFollowUps(pipeline, profiles, ledger);
  const accountAssignments = buildAccountAssignments(profiles, ledger);
  const salesActivityTimeline = buildSalesActivityTimeline(ledger, board, tracking);
  const b2bPricing = buildB2BPricingIntelligence(profiles, pricing, costing);
  const abandonedQuoteRecovery = buildAbandonedQuoteRecovery(pipeline);

  return {
    customers: profiles,
    pipeline,
    followUps,
    accountAssignments,
    salesActivityTimeline,
    b2bPricing,
    abandonedQuoteRecovery,
    summary: {
      customers: profiles.length,
      activeOpportunities: pipeline.filter((opp) => !['won', 'lost'].includes(String(opp.stage))).length,
      wonOpportunities: pipeline.filter((opp) => opp.stage === 'won').length,
      pipelineValueMinor: pipeline.reduce((sum, opp) => sum + asNumber(opp.valueMinor, 0), 0),
      weightedPipelineMinor: pipeline.reduce((sum, opp) => sum + asNumber(opp.weightedValueMinor, 0), 0),
      followUpsDue: followUps.length,
      staleQuotes: abandonedQuoteRecovery.length,
      highValueCustomers: profiles.filter((profile) => profile.valueBand === 'high-value').length,
      b2bAccounts: profiles.filter((profile) => ['B2B', 'Enterprise'].includes(String(profile.segment))).length
    },
    settings: CRM_SETTINGS,
    source: 'internal-crm-sales-pipeline-intelligence',
    generatedAt: nowIso()
  };
}

export async function recordSalesActivity(request: Request, input: Store) {
  const ledger = await readCrmLedger(request);
  const activity = {
    id: makeId('sales-activity'),
    type: input.type || input.action || 'sales-note',
    customer: input.customer || input.customerEmail || null,
    quoteId: input.quoteId || null,
    orderNumber: input.orderNumber || null,
    opportunityId: input.opportunityId || null,
    message: input.message || input.note || 'Sales activity recorded.',
    at: nowIso(),
    operator: input.operator || null,
    source: 'crm-sales-pipeline-intelligence'
  };
  await saveCrmLedger(request, { ...ledger, activities: [activity, ...ledger.activities].slice(0, 500) });
  await recordCrmBoardAction(request, activity.type, activity, activity.message);
  return getCrmSalesPipelineIntelligence(request);
}

export async function createSalesOpportunity(request: Request, input: Store) {
  const ledger = await readCrmLedger(request);
  const opportunity = {
    id: input.id || makeId('opportunity'),
    source: 'manual',
    customer: input.customer || 'New customer',
    title: input.title || 'Sales opportunity',
    stage: input.stage || 'lead',
    valueMinor: asNumber(input.valueMinor, 0),
    probability: asNumber(input.probability, 25),
    weightedValueMinor: Math.round(asNumber(input.valueMinor, 0) * asNumber(input.probability, 25) / 100),
    channel: input.channel || 'manual',
    createdAt: nowIso(),
    note: input.note || null
  };
  await saveCrmLedger(request, { ...ledger, opportunities: [opportunity, ...ledger.opportunities].slice(0, 500) });
  await recordCrmBoardAction(request, 'sales-opportunity-created', opportunity, `Opportunity created: ${opportunity.title}`);
  return getCrmSalesPipelineIntelligence(request);
}

export async function recordQuoteRecovery(request: Request, input: Store) {
  const ledger = await readCrmLedger(request);
  const followUp = {
    id: makeId('quote-recovery'),
    opportunityId: input.opportunityId || input.quoteId || null,
    customer: input.customer || null,
    customerEmail: input.customerEmail || null,
    priority: input.priority || 'normal',
    reason: input.reason || 'Abandoned quote recovery follow-up.',
    dueAt: input.dueAt || nowIso(),
    status: input.status || 'open',
    source: 'crm-sales-pipeline-intelligence'
  };
  await saveCrmLedger(request, { ...ledger, followUps: [followUp, ...ledger.followUps].slice(0, 300) });
  await recordCrmBoardAction(request, 'quote-recovery-created', followUp, followUp.reason);
  return getCrmSalesPipelineIntelligence(request);
}

export async function generateCrmAwareQuote(request: Request, input: Store) {
  const crm = await getCrmSalesPipelineIntelligence(request);
  const profile = crm.customers.find((customer: Store) => cleanText(customer.email) === cleanText(input.customerEmail) || cleanText(customer.organization || customer.name).includes(cleanText(input.customer)));
  const b2b = profile ? crm.b2bPricing.find((row: Store) => cleanText(row.customerId) === cleanText(profile.id)) : null;
  const quoteInput = {
    ...input,
    customer: input.customer || profile?.organization || profile?.name,
    targetMarginPercent: input.targetMarginPercent || (b2b ? Math.max(CRM_SETTINGS.minimumMarginGuardPercent, 35 - asNumber(b2b.suggestedDiscountPercent, 0)) : undefined)
  };
  const quote = await generateDynamicQuote(request, quoteInput);
  await recordSalesActivity(request, { type: 'crm-aware-quote-generated', customer: quote.customer, quoteId: quote.id, message: `CRM-aware quote generated with status ${quote.status}.` });
  return { quote, crmProfile: profile || null, b2bPricing: b2b || null, source: 'crm-aware-dynamic-quote' };
}

async function recordCrmBoardAction(request: Request, action: string, row: Store, note: string) {
  const board = await readProductionBoardStore(request);
  const actions = [{
    id: makeId('crm-action'),
    action,
    at: nowIso(),
    note,
    customer: row.customer || null,
    quoteId: row.quoteId || null,
    opportunityId: row.opportunityId || row.id || null,
    orderNumber: row.orderNumber || null,
    source: 'crm-sales-pipeline-intelligence'
  }, ...board.actions].slice(0, 400);
  await saveProductionBoardStore(request, { items: board.items, actions });
}
