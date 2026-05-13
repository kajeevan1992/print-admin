import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { readPlannerStore } from '@/core/storefront/production-planner';
import { readProductionBoardStore, saveProductionBoardStore } from '@/core/storefront/production-board';
import { getInventoryMaterialConsumptionIntelligence, recordMaterialReplenishment } from '@/core/storefront/inventory-material-consumption-intelligence';
import { getProductionCostingIntelligence } from '@/core/storefront/production-costing-intelligence';

/**
 * v325 Smart Supplier Procurement + Purchase Order Intelligence
 *
 * Reuses live internal systems:
 * - v324 inventory/material consumption and replenishment intelligence
 * - v319 supplier cost comparison
 * - planner demand and live production queue
 * - production board operational timeline
 *
 * This is not a separate supplier demo dashboard. It is the procurement/PO
 * intelligence layer that supplier APIs and purchasing UI can wire into later.
 */

type Store = Record<string, any>;

const CONFIG_RESOURCE = 'admin-config' as any;
const PROCUREMENT_KEY = 'storefront-supplier-procurement-ledger';
const SUPPLIER_RECORD_KEYS = ['trade-suppliers', 'supplier-integrations', 'admin_suppliers_store', 'storefront-suppliers'];

const DEFAULT_SUPPLIERS = [
  { id: 'sup-paper-direct', name: 'Paper Direct', type: 'material', leadTimeDays: 2, reliabilityScore: 92, supports: ['sheet', 'SRA3', 'silk-stock', 'matt-stock'], minimumOrderMinor: 5000, deliveryCostMinor: 1200 },
  { id: 'sup-large-format', name: 'Large Format Supply Co', type: 'material', leadTimeDays: 3, reliabilityScore: 88, supports: ['roll', 'pvc-roll', 'vinyl-roll', 'board', 'rigid-board'], minimumOrderMinor: 7500, deliveryCostMinor: 1800 },
  { id: 'sup-tradeprint', name: 'Trade Print Partner', type: 'outsourced-print', leadTimeDays: 4, reliabilityScore: 85, supports: ['business-card', 'flyer', 'booklet', 'poster'], minimumOrderMinor: 2500, deliveryCostMinor: 0 },
  { id: 'sup-route1-style', name: 'Route Supplier', type: 'outsourced-print', leadTimeDays: 5, reliabilityScore: 82, supports: ['business-card', 'flyer', 'leaflet', 'booklet'], minimumOrderMinor: 3000, deliveryCostMinor: 0 }
];

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;
}

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cleanText(value: unknown) {
  return String(value || '').toLowerCase();
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + Math.max(0, Math.ceil(days)));
  return date.toISOString();
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

async function readSuppliers(request: Request) {
  for (const key of SUPPLIER_RECORD_KEYS) {
    const rows = await readConfigList(request, key);
    if (rows.length) return rows;
  }
  return DEFAULT_SUPPLIERS;
}

async function readProcurementLedger(request: Request) {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, PROCUREMENT_KEY);
    const store = (record as any)?.metadataJson?.store || {};
    return {
      purchaseOrders: Array.isArray(store.purchaseOrders) ? store.purchaseOrders : [],
      deliveryEvents: Array.isArray(store.deliveryEvents) ? store.deliveryEvents : [],
      supplierScores: Array.isArray(store.supplierScores) ? store.supplierScores : [],
      decisions: Array.isArray(store.decisions) ? store.decisions : []
    };
  } catch {
    return { purchaseOrders: [], deliveryEvents: [], supplierScores: [], decisions: [] };
  }
}

async function saveProcurementLedger(request: Request, store: Store) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: PROCUREMENT_KEY,
    slug: PROCUREMENT_KEY,
    name: 'Supplier procurement ledger',
    description: 'Purchase orders, supplier decisions, delivery events and procurement risk records.',
    metadataJson: {
      store,
      savedAt: nowIso(),
      storageKey: PROCUREMENT_KEY,
      source: 'SupplierProcurementIntelligence'
    }
  } as any);
}

function supplierSupports(supplier: Store, item: Store) {
  const text = `${item.materialName || ''} ${item.materialId || ''} ${item.materialType || ''} ${item.stockKey || ''} ${item.method || ''}`.toLowerCase();
  const supports = Array.isArray(supplier.supports) ? supplier.supports.map(cleanText) : [];
  return supports.includes('all') || supports.some((support: string) => text.includes(support));
}

function supplierScore(supplier: Store, item: Store, ledger: Store) {
  const reliability = asNumber(supplier.reliabilityScore, 75);
  const leadTime = asNumber(supplier.leadTimeDays, 5);
  const delivery = asNumber(supplier.deliveryCostMinor, 0);
  const previous = ledger.supplierScores.find((row: Store) => cleanText(row.supplierId) === cleanText(supplier.id));
  const historical = previous ? asNumber(previous.score, reliability) : reliability;
  const urgencyBoost = item.priority === 'urgent' ? Math.max(0, 10 - leadTime) : 0;
  return Math.round(historical + urgencyBoost - leadTime * 2 - delivery / 1000);
}

function chooseSupplier(item: Store, suppliers: Store[], ledger: Store) {
  const candidates = suppliers
    .filter((supplier) => supplierSupports(supplier, item))
    .map((supplier) => ({
      ...supplier,
      procurementScore: supplierScore(supplier, item, ledger),
      estimatedDeliveryAt: addDays(asNumber(supplier.leadTimeDays, 5)),
      estimatedCostMinor: Math.max(asNumber(supplier.minimumOrderMinor, 0), asNumber(item.estimatedCostMinor, 0)) + asNumber(supplier.deliveryCostMinor, 0)
    }))
    .sort((a, b) => asNumber(b.procurementScore) - asNumber(a.procurementScore) || asNumber(a.estimatedCostMinor) - asNumber(b.estimatedCostMinor));
  return candidates[0] || null;
}

function existingOpenPo(ledger: Store, item: Store) {
  return ledger.purchaseOrders.find((po: Store) => ['draft', 'sent', 'partially-received'].includes(String(po.status)) && cleanText(po.materialId) === cleanText(item.materialId));
}

function buildPurchaseOrderDrafts(inventory: Store, suppliers: Store[], ledger: Store) {
  const replenishment = Array.isArray(inventory.replenishmentPlan) ? inventory.replenishmentPlan : [];
  return replenishment.map((item: Store) => {
    const supplier = chooseSupplier(item, suppliers, ledger);
    const open = existingOpenPo(ledger, item);
    return {
      id: open?.id || makeId('po-draft'),
      status: open?.status || 'draft',
      supplierId: supplier?.id || null,
      supplierName: supplier?.name || 'No supplier matched',
      materialId: item.materialId,
      materialName: item.materialName,
      unit: item.unit,
      quantity: item.suggestedOrderQuantity,
      estimatedCostMinor: supplier ? Math.max(asNumber(supplier.minimumOrderMinor, 0), asNumber(item.estimatedCostMinor, 0)) + asNumber(supplier.deliveryCostMinor, 0) : asNumber(item.estimatedCostMinor, 0),
      estimatedDeliveryAt: supplier?.estimatedDeliveryAt || null,
      priority: item.priority,
      reason: item.reason,
      supplierScore: supplier?.procurementScore || 0,
      duplicateOpenPo: Boolean(open),
      source: 'inventory-replenishment-plan'
    };
  });
}

function buildOutsourceRecommendations(costing: Store, suppliers: Store[], ledger: Store) {
  const rows = Array.isArray(costing.supplierComparison) ? costing.supplierComparison : [];
  return rows
    .filter((row: Store) => row.cheaperSource === 'supplier')
    .map((row: Store) => {
      const item = { materialName: row.orderNumber, method: 'outsourced-print', estimatedCostMinor: row.bestSupplierMinor, priority: row.differenceMinor > 2000 ? 'urgent' : 'normal' };
      const supplier = chooseSupplier(item, suppliers, ledger);
      return {
        id: makeId('outsource-rec'),
        orderNumber: row.orderNumber,
        jobId: row.jobId,
        supplierId: supplier?.id || null,
        supplierName: supplier?.name || 'Trade supplier',
        internalCostMinor: row.internalCostMinor,
        supplierCostMinor: row.bestSupplierMinor,
        savingMinor: Math.max(0, asNumber(row.internalCostMinor) - asNumber(row.bestSupplierMinor)),
        estimatedDeliveryAt: supplier?.estimatedDeliveryAt || addDays(5),
        recommendation: row.recommendation || 'Supplier may protect margin or capacity.'
      };
    });
}

function buildDeliveryRisk(purchaseOrders: Store[], planner: Store, inventory: Store) {
  const shortages = Array.isArray(inventory.lowStockAlerts) ? inventory.lowStockAlerts.filter((alert: Store) => alert.severity === 'critical') : [];
  const openPos = purchaseOrders.filter((po: Store) => ['draft', 'sent', 'partially-received'].includes(String(po.status)));
  const activeJobs = Array.isArray(planner.jobs) ? planner.jobs.filter((job: Store) => !['completed', 'blocked'].includes(String(job.stage))) : [];
  return shortages.map((alert: Store) => {
    const po = openPos.find((item) => cleanText(item.materialId) === cleanText(alert.materialId));
    return {
      id: `delay-risk-${alert.materialId}`,
      materialId: alert.materialId,
      materialName: alert.materialName,
      severity: po ? 'watch' : 'critical',
      openPoId: po?.id || null,
      estimatedDeliveryAt: po?.estimatedDeliveryAt || null,
      affectedActiveJobs: activeJobs.length,
      message: po
        ? `${alert.materialName} is short but PO ${po.id} may prevent production delay.`
        : `${alert.materialName} is short and no open PO exists; production delay risk is high.`
    };
  });
}

function buildSupplierReliability(suppliers: Store[], ledger: Store) {
  return suppliers.map((supplier) => {
    const deliveries = ledger.deliveryEvents.filter((event: Store) => cleanText(event.supplierId) === cleanText(supplier.id));
    const onTime = deliveries.filter((event: Store) => event.onTime !== false).length;
    const score = deliveries.length ? Math.round((onTime / deliveries.length) * 100) : asNumber(supplier.reliabilityScore, 75);
    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      deliveries: deliveries.length,
      onTimeDeliveries: onTime,
      reliabilityScore: score,
      leadTimeDays: asNumber(supplier.leadTimeDays, 5),
      status: score >= 90 ? 'excellent' : score >= 80 ? 'good' : score >= 65 ? 'watch' : 'risk'
    };
  });
}

export async function getSupplierProcurementIntelligence(request: Request) {
  const [inventory, costing, suppliers, ledger, planner] = await Promise.all([
    getInventoryMaterialConsumptionIntelligence(request),
    getProductionCostingIntelligence(request),
    readSuppliers(request),
    readProcurementLedger(request),
    readPlannerStore(request).catch(() => ({}))
  ]);

  const purchaseOrderDrafts = buildPurchaseOrderDrafts(inventory, suppliers, ledger);
  const outsourceRecommendations = buildOutsourceRecommendations(costing, suppliers, ledger);
  const deliveryRisk = buildDeliveryRisk([...purchaseOrderDrafts, ...ledger.purchaseOrders], planner, inventory);
  const supplierReliability = buildSupplierReliability(suppliers, ledger);

  return {
    suppliers,
    ledger,
    purchaseOrderDrafts,
    outsourceRecommendations,
    deliveryRisk,
    supplierReliability,
    inventorySummary: inventory.summary,
    costingSummary: costing.summary,
    summary: {
      suppliers: suppliers.length,
      draftPurchaseOrders: purchaseOrderDrafts.length,
      openPurchaseOrders: ledger.purchaseOrders.filter((po: Store) => ['draft', 'sent', 'partially-received'].includes(String(po.status))).length,
      urgentPurchaseOrders: purchaseOrderDrafts.filter((po: Store) => po.priority === 'urgent').length,
      outsourceRecommendations: outsourceRecommendations.length,
      criticalDeliveryRisks: deliveryRisk.filter((risk: Store) => risk.severity === 'critical').length,
      supplierRiskCount: supplierReliability.filter((row: Store) => ['watch', 'risk'].includes(row.status)).length
    },
    source: 'internal-supplier-procurement-intelligence',
    generatedAt: nowIso()
  };
}

export async function createSupplierPurchaseOrder(request: Request, input: Store) {
  const intelligence = await getSupplierProcurementIntelligence(request);
  const ledger = await readProcurementLedger(request);
  const source = input.draftId
    ? intelligence.purchaseOrderDrafts.find((po: Store) => cleanText(po.id) === cleanText(input.draftId))
    : intelligence.purchaseOrderDrafts.find((po: Store) => cleanText(po.materialId) === cleanText(input.materialId));

  if (!source && !input.materialId) throw new Error('Purchase order requires a draftId or materialId.');

  const po = {
    id: input.poId || makeId('po'),
    status: input.status || 'sent',
    supplierId: input.supplierId || source?.supplierId || null,
    supplierName: input.supplierName || source?.supplierName || 'Supplier',
    materialId: input.materialId || source?.materialId,
    materialName: input.materialName || source?.materialName,
    unit: input.unit || source?.unit || 'sheets',
    quantity: asNumber(input.quantity, asNumber(source?.quantity, 0)),
    estimatedCostMinor: asNumber(input.estimatedCostMinor, asNumber(source?.estimatedCostMinor, 0)),
    estimatedDeliveryAt: input.estimatedDeliveryAt || source?.estimatedDeliveryAt || addDays(5),
    priority: input.priority || source?.priority || 'normal',
    reason: input.reason || source?.reason || 'Material replenishment',
    createdAt: nowIso(),
    source: 'supplier-procurement-intelligence'
  };

  const purchaseOrders = [po, ...ledger.purchaseOrders].slice(0, 800);
  const decisions = [{ id: makeId('procurement-decision'), action: 'purchase-order-created', poId: po.id, materialId: po.materialId, note: input.note || po.reason, at: nowIso(), source: 'supplier-procurement-intelligence' }, ...ledger.decisions].slice(0, 500);
  await saveProcurementLedger(request, { ...ledger, purchaseOrders, decisions });
  await recordProcurementBoardAction(request, 'purchase-order-created', po, `PO ${po.id} created for ${po.materialName}.`);
  return getSupplierProcurementIntelligence(request);
}

export async function recordSupplierDelivery(request: Request, input: Store) {
  const ledger = await readProcurementLedger(request);
  const po = ledger.purchaseOrders.find((item: Store) => cleanText(item.id) === cleanText(input.poId));
  if (!po && !input.materialId) throw new Error('Delivery requires a poId or materialId.');

  const delivery = {
    id: makeId('supplier-delivery'),
    poId: input.poId || po?.id || null,
    supplierId: input.supplierId || po?.supplierId || null,
    supplierName: input.supplierName || po?.supplierName || null,
    materialId: input.materialId || po?.materialId,
    materialName: input.materialName || po?.materialName,
    quantity: asNumber(input.quantity, asNumber(po?.quantity, 0)),
    unit: input.unit || po?.unit || 'sheets',
    receivedAt: nowIso(),
    onTime: input.onTime !== false,
    note: input.note || 'Supplier delivery recorded.',
    source: 'supplier-procurement-intelligence'
  };

  const purchaseOrders = ledger.purchaseOrders.map((item: Store) => cleanText(item.id) === cleanText(delivery.poId) ? { ...item, status: input.partial ? 'partially-received' : 'received', receivedAt: nowIso() } : item);
  const deliveryEvents = [delivery, ...ledger.deliveryEvents].slice(0, 800);
  const decisions = [{ id: makeId('procurement-decision'), action: 'supplier-delivery-recorded', poId: delivery.poId, materialId: delivery.materialId, note: delivery.note, at: nowIso(), source: 'supplier-procurement-intelligence' }, ...ledger.decisions].slice(0, 500);
  await saveProcurementLedger(request, { ...ledger, purchaseOrders, deliveryEvents, decisions });
  await recordMaterialReplenishment(request, { materialId: delivery.materialId, materialName: delivery.materialName, quantity: delivery.quantity, unit: delivery.unit, supplier: delivery.supplierName, operator: input.operator, costMinor: input.costMinor || po?.estimatedCostMinor || 0 });
  await recordProcurementBoardAction(request, 'supplier-delivery-recorded', delivery, `Delivery received for ${delivery.materialName}.`);
  return getSupplierProcurementIntelligence(request);
}

export async function recordProcurementDecision(request: Request, input: Store) {
  const ledger = await readProcurementLedger(request);
  const decision = {
    id: makeId('procurement-decision'),
    action: input.action || 'procurement-note',
    poId: input.poId || null,
    supplierId: input.supplierId || null,
    materialId: input.materialId || null,
    orderNumber: input.orderNumber || null,
    note: input.note || 'Procurement decision recorded.',
    at: nowIso(),
    operator: input.operator || null,
    source: 'supplier-procurement-intelligence'
  };
  await saveProcurementLedger(request, { ...ledger, decisions: [decision, ...ledger.decisions].slice(0, 500) });
  await recordProcurementBoardAction(request, decision.action, decision, decision.note);
  return getSupplierProcurementIntelligence(request);
}

async function recordProcurementBoardAction(request: Request, action: string, row: Store, note: string) {
  const board = await readProductionBoardStore(request);
  const actions = [{
    id: makeId('procurement-action'),
    action,
    at: nowIso(),
    note,
    poId: row?.id || row?.poId || null,
    supplierId: row?.supplierId || null,
    materialId: row?.materialId || null,
    orderNumber: row?.orderNumber || null,
    source: 'supplier-procurement-intelligence'
  }, ...board.actions].slice(0, 400);
  await saveProductionBoardStore(request, { items: board.items, actions });
}
