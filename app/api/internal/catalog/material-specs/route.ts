export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const MATERIAL_KEY = 'storefront-material-specs-foundation';
const MACHINE_KEY = 'storefront-machine-capabilities-foundation';

function responseError(error: unknown, status = 500) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Material specs request failed.' }, { status }); }
async function readRecord(request: NextRequest, key: string) { try { return await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key); } catch (error) { if ((error instanceof Error ? error.message : '').includes('was not found')) return null; throw error; } }
async function saveItems(request: NextRequest, key: string, name: string, description: string, items: any[], source: string) { return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, { id: key, slug: key, name, description, metadataJson: { items, savedAt: new Date().toISOString(), storageKey: key, source } } as any); }
function defaults() { return [
  { key: 'sra3_350gsm_silk', name: '350gsm Silk SRA3', materialType: 'sheet', widthMm: 320, heightMm: 450, gsm: 350, compatibleMachineKeys: ['digital_sra3_press'], description: 'Sheet stock with exact SRA3 size and machine mapping.' },
  { key: 'sra2_130gsm_silk', name: '130gsm Silk SRA2', materialType: 'sheet', widthMm: 450, heightMm: 640, gsm: 130, compatibleMachineKeys: ['guillotine_cut_to_sra3','offset_sra2_press'], description: 'SRA2 parent sheet can be cut to SRA3 for digital production.' },
  { key: 'foamex_3mm_2440x1220', name: '3mm Foamex Board 2440x1220', materialType: 'board', parentWidthMm: 2440, parentHeightMm: 1220, thicknessMm: 3, compatibleMachineKeys: ['flatbed_uv_2500x1250'], description: 'Board material stores parent board size and flatbed compatibility.' },
  { key: 'pvc_banner_510gsm_1200x50000', name: '510gsm PVC Banner Roll 1.2m x 50m', materialType: 'roll', rollWidthMm: 1200, rollLengthMm: 50000, compatibleMachineKeys: ['roll_printer_1200'], description: 'Roll material stores width and total roll length for banner production.' },
]; }
function summary(items: any[]) { return { materialCount: items.length, sheetCount: items.filter(i=>i.materialType==='sheet').length, boardCount: items.filter(i=>i.materialType==='board').length, rollCount: items.filter(i=>i.materialType==='roll').length, mappedCount: items.filter(i=>Array.isArray(i.compatibleMachineKeys)&&i.compatibleMachineKeys.length).length }; }
export async function GET(request: NextRequest) { try { const record = await readRecord(request, MATERIAL_KEY); let items = (record as any)?.metadataJson?.items; if (!Array.isArray(items) || !items.length) { items = defaults(); await saveItems(request, MATERIAL_KEY, 'Physical material specs', 'Sheet, board and roll material records with machine compatibility.', items, 'MaterialSpecsFoundation'); } return NextResponse.json({ ok: true, source: 'internal-material-specs-foundation-db', data: { items, summary: summary(items) } }); } catch (error) { return responseError(error); } }
export async function POST(request: NextRequest) { try { const body = await request.json().catch(()=>({})); const record = await readRecord(request, MATERIAL_KEY); const items = Array.isArray((record as any)?.metadataJson?.items) ? (record as any).metadataJson.items : defaults(); if (body?.key) items.unshift({ ...body, updatedAt: new Date().toISOString() }); await saveItems(request, MATERIAL_KEY, 'Physical material specs', 'Sheet, board and roll material records with machine compatibility.', items.slice(0, 200), 'MaterialSpecsFoundation'); return NextResponse.json({ ok: true, source: 'internal-material-specs-foundation-db', data: { items, summary: summary(items) }, item: { action: body.action || 'saved', key: body.key || null } }); } catch (error) { return responseError(error); } }
