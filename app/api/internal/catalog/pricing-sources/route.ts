export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const PRICING_SOURCE_KEY = 'storefront-pricing-sources-foundation';
function responseError(error: unknown, status = 500) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Pricing sources request failed.' }, { status }); }
async function readRecord(request: NextRequest, key: string) { try { return await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key); } catch (error) { if ((error instanceof Error ? error.message : '').includes('was not found')) return null; throw error; } }
async function saveItems(request: NextRequest, items: any[]) { return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, { id: PRICING_SOURCE_KEY, slug: PRICING_SOURCE_KEY, name: 'Product pricing source selector', description: 'Controls whether product price comes from internal engine, supplier API or Excel/matrix upload.', metadataJson: { items, savedAt: new Date().toISOString(), storageKey: PRICING_SOURCE_KEY, source: 'PricingSourcesFoundation' } } as any); }
function defaults() { return [
  { key: 'internal', label: 'Internal cost-based engine', description: 'Material + machine + labour + electricity + ink + finishing + margin + VAT.' },
  { key: 'supplier_api', label: 'Trade supplier API price', description: 'Supplier personalized price feed plus global/product markup.' },
  { key: 'excel_matrix', label: 'Excel / matrix upload price', description: 'Route1-style matrix by quantity, sides, material, finishing and turnaround.' },
]; }
export async function GET(request: NextRequest) { try { const record = await readRecord(request, PRICING_SOURCE_KEY); let items = (record as any)?.metadataJson?.items; if (!Array.isArray(items) || !items.length) { items = defaults(); await saveItems(request, items); } return NextResponse.json({ ok: true, source: 'internal-pricing-sources-foundation-db', data: { items, allowedValues: items.map((i:any)=>i.key), summary: { sourceCount: items.length } } }); } catch (error) { return responseError(error); } }
export async function POST(request: NextRequest) { try { const body = await request.json().catch(()=>({})); const record = await readRecord(request, PRICING_SOURCE_KEY); const items = Array.isArray((record as any)?.metadataJson?.items) ? (record as any).metadataJson.items : defaults(); if (body?.key) items.unshift({ key: String(body.key), label: String(body.label || body.key), description: String(body.description || ''), updatedAt: new Date().toISOString() }); await saveItems(request, items.slice(0, 50)); return NextResponse.json({ ok: true, source: 'internal-pricing-sources-foundation-db', data: { items, allowedValues: items.map((i:any)=>i.key) }, item: { action: body.action || 'saved' } }); } catch (error) { return responseError(error); } }
