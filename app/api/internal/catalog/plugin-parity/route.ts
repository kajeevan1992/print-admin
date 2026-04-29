export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const PARITY_KEY = 'plugin-core-parity-audit';

const PLUGIN_PARITY_ITEMS = [
  { key: 'product-config-engine', label: 'Product configuration engine', pluginStatus: 'done', saasStatus: 'partial', priority: 'critical', note: 'Option groups, templates and dependency rules exist; must keep ppc_config-compatible structure for plugin parity.' },
  { key: 'conditional-logic', label: 'Product-level conditional logic', pluginStatus: 'done', saasStatus: 'partial', priority: 'critical', note: 'Show/hide and force-selection rules must work per product, for cases like Foil requiring Soft Touch.' },
  { key: 'material-finish-registry', label: 'Controlled material / finish registry', pluginStatus: 'done', saasStatus: 'needs-hardening', priority: 'critical', note: 'No free text. Product builder must use controlled material keys and finish keys only.' },
  { key: 'pricing-engine', label: 'Pricing engine', pluginStatus: 'done', saasStatus: 'done-foundation', priority: 'critical', note: 'SRA3 sheet, sqm, matrix, finishing, margin and VAT pricing are present; do not duplicate logic.' },
  { key: 'manufacturing-resolver', label: 'Manufacturing resolver', pluginStatus: 'done', saasStatus: 'partial', priority: 'critical', note: 'Must resolve sheets, ups, waste, material, machine and finishing instructions from config.' },
  { key: 'artwork-rules', label: 'Product artwork rules', pluginStatus: 'done', saasStatus: 'partial', priority: 'critical', note: 'Must store profile, expected pages, trim, bleed, file types, PDF-only and max upload size per product.' },
  { key: 'requested-artwork-spec', label: 'Requested artwork spec capture', pluginStatus: 'done', saasStatus: 'partial', priority: 'critical', note: 'Store requested trim width/height, pages and bleed from storefront cart through order.' },
  { key: 'preflight-compare', label: 'Preflight expected vs requested comparison', pluginStatus: 'done', saasStatus: 'new-v280', priority: 'critical', note: 'Compare page count and trim size. Store pass/fail plus issue list.' },
  { key: 'production-blocking', label: 'Block production on failed preflight', pluginStatus: 'not-built', saasStatus: 'new-v280-foundation', priority: 'critical', note: 'Production can be flagged blocked when preflight fails; later builds should enforce this in planner actions.' },
  { key: 'real-pdf-inspection', label: 'Real PDF inspection', pluginStatus: 'not-built', saasStatus: 'not-built', priority: 'high', note: 'Later: parse uploaded PDF page count, dimensions and bleed instead of trusting requested specs.' },
  { key: 'trade-supplier-adapters', label: 'Trade supplier adapter layer', pluginStatus: 'not-built', saasStatus: 'not-built', priority: 'high', note: 'Later: map internal material/size/finish/qty to Tradeprint or other supplier API fields.' },
  { key: 'automation-workflows', label: 'Automation workflows', pluginStatus: 'not-built', saasStatus: 'partial', priority: 'medium', note: 'Later: auto status changes, notifications and blocks from engine events.' },
];

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Plugin parity request failed.' }, { status });
}

async function readSavedAudit(request: NextRequest) {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, PARITY_KEY);
    const items = (record as any)?.metadataJson?.items;
    const history = (record as any)?.metadataJson?.history;
    return { items: Array.isArray(items) ? items : PLUGIN_PARITY_ITEMS, history: Array.isArray(history) ? history : [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return { items: PLUGIN_PARITY_ITEMS, history: [] };
    throw error;
  }
}

function summarise(items: any[]) {
  return {
    total: items.length,
    critical: items.filter((item) => item.priority === 'critical').length,
    complete: items.filter((item) => String(item.saasStatus || '').startsWith('done')).length,
    partial: items.filter((item) => ['partial', 'needs-hardening', 'done-foundation', 'new-v280', 'new-v280-foundation'].includes(String(item.saasStatus || ''))).length,
    missing: items.filter((item) => String(item.saasStatus || '') === 'not-built').length,
  };
}

export async function GET(request: NextRequest) {
  try {
    const saved = await readSavedAudit(request);
    return NextResponse.json({ ok: true, source: 'plugin-core-parity-audit', data: { items: saved.items, history: saved.history, summary: summarise(saved.items) } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'snapshot').trim();
    const saved = await readSavedAudit(request);
    const now = new Date().toISOString();
    const historyEntry = { id: `parity-${Date.now()}`, action, at: now, note: 'Plugin v2.40.0 parity audit snapshot for unified-core SaaS.' };
    await upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
      id: PARITY_KEY,
      slug: PARITY_KEY,
      name: 'Plugin core parity audit',
      description: 'Tracks Print Platform Core plugin engine parity requirements for the unified-core SaaS.',
      metadataJson: { items: saved.items, history: [historyEntry, ...saved.history].slice(0, 20), savedAt: now, source: 'PluginParityAudit' },
    } as any);
    return NextResponse.json({ ok: true, source: 'plugin-core-parity-audit', data: { items: saved.items, history: [historyEntry, ...saved.history].slice(0, 20), summary: summarise(saved.items) }, item: historyEntry });
  } catch (error) {
    return responseError(error);
  }
}
