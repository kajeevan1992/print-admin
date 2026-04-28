export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const PRODUCTION_FLOW_KEY = 'storefront-production-flow';

type ProductionJobRecord = Record<string, any> & {
  id: string;
  jobNumber?: string;
  orderNumber?: string;
  status?: string;
  productionStage?: string;
  items?: any[];
  customer?: any;
  totals?: any;
  deliveryEstimate?: any;
  turnaround?: any;
  auditTrail?: any[];
};

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Production handoff request failed.' }, { status });
}

async function readProductionJobs(request: NextRequest): Promise<ProductionJobRecord[]> {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, PRODUCTION_FLOW_KEY);
    const items = (record as any)?.metadataJson?.items;
    return Array.isArray(items) ? items : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return [];
    throw error;
  }
}

function itemArtwork(item: any) {
  const uploads = item?.artworkUploads || item?.artwork?.uploads || [];
  return Array.isArray(uploads) ? uploads : [];
}

function handoffChecklist(job: ProductionJobRecord) {
  const items = Array.isArray(job.items) ? job.items : [];
  const artworkCount = items.reduce((sum, item) => sum + itemArtwork(item).length, 0);
  const hasPricing = items.every((item) => Boolean(item.pricing) || Number(item.grossTotalMinor || 0) > 0);
  const hasOptions = items.every((item) => item.selections && Object.keys(item.selections || {}).length > 0);
  const hasCustomer = Boolean(job.customer?.name && job.customer?.email);
  const hasDelivery = Boolean(job.deliveryEstimate || job.turnaround);
  const checklist = [
    { key: 'customer', label: 'Customer details attached', ok: hasCustomer },
    { key: 'options', label: 'Selected options attached', ok: hasOptions },
    { key: 'pricing', label: 'Pricing and totals attached', ok: hasPricing },
    { key: 'artwork', label: 'Artwork metadata attached', ok: artworkCount > 0 },
    { key: 'delivery', label: 'Turnaround / delivery estimate attached', ok: hasDelivery },
  ];
  const ready = checklist.every((item) => item.ok);
  return { ready, artworkCount, checklist };
}

function nextAction(job: ProductionJobRecord, ready: boolean) {
  const status = String(job.status || 'production-ready');
  const stage = String(job.productionStage || 'prepress-queue');
  if (!ready) return 'Resolve missing handoff data before production.';
  if (status === 'production-ready' || stage === 'prepress-queue') return 'Start prepress.';
  if (status === 'in-production' || stage === 'prepress-active') return 'Complete prepress check.';
  if (status === 'prepress-complete' || stage === 'print-queue') return 'Move to print production.';
  if (status === 'on-hold' || stage === 'awaiting-customer') return 'Review hold reason and contact customer.';
  if (status === 'completed') return 'Production completed.';
  return 'Review production job.';
}

export async function GET(request: NextRequest) {
  try {
    const jobs = await readProductionJobs(request);
    const packets = jobs.map((job) => {
      const checklist = handoffChecklist(job);
      return {
        id: job.id,
        jobNumber: job.jobNumber,
        orderNumber: job.orderNumber,
        status: job.status || 'production-ready',
        productionStage: job.productionStage || 'prepress-queue',
        customer: job.customer || null,
        totals: job.totals || null,
        deliveryEstimate: job.deliveryEstimate || null,
        turnaround: job.turnaround || null,
        itemCount: Array.isArray(job.items) ? job.items.length : 0,
        artworkCount: checklist.artworkCount,
        checklist: checklist.checklist,
        handoffReady: checklist.ready,
        nextAction: nextAction(job, checklist.ready),
        auditTrail: Array.isArray(job.auditTrail) ? job.auditTrail.slice(-5) : [],
        updatedAt: job.updatedAt || job.createdAt || null,
      };
    });

    return NextResponse.json({
      ok: true,
      source: 'internal-production-handoff-db',
      data: {
        items: packets,
        summary: {
          total: packets.length,
          ready: packets.filter((item) => item.handoffReady).length,
          blocked: packets.filter((item) => !item.handoffReady).length,
        },
      },
    });
  } catch (error) {
    return responseError(error);
  }
}
