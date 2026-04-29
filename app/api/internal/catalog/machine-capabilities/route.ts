export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const MACHINE_KEY = 'storefront-machine-capabilities-foundation';
function responseError(error: unknown, status = 500) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Machine capabilities request failed.' }, { status }); }
async function readRecord(request: NextRequest, key: string) { try { return await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key); } catch (error) { if ((error instanceof Error ? error.message : '').includes('was not found')) return null; throw error; } }
async function saveItems(request: NextRequest, items: any[]) { return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, { id: MACHINE_KEY, slug: MACHINE_KEY, name: 'Machine print capabilities', description: 'Machine capability rules for sheet, board and roll-fed materials.', metadataJson: { items, savedAt: new Date().toISOString(), storageKey: MACHINE_KEY, source: 'MachineCapabilitiesFoundation' } } as any); }
function defaults() { return [
  { key: 'digital_sra3_press', name: 'Digital SRA3 Press', supportedMaterialTypes: ['sheet'], maxSheetWidthMm: 320, maxSheetHeightMm: 450, variableLength: false, description: 'SRA3 sheet-fed press.' },
  { key: 'offset_sra2_press', name: 'Offset SRA2 Press', supportedMaterialTypes: ['sheet'], maxSheetWidthMm: 450, maxSheetHeightMm: 640, variableLength: false, description: 'SRA2 sheet press.' },
  { key: 'flatbed_uv_2500x1250', name: 'Flatbed UV 2500x1250', supportedMaterialTypes: ['board'], maxBoardWidthMm: 2500, maxBoardHeightMm: 1250, variableLength: false, description: 'Board printer for parent board sizes.' },
  { key: 'roll_printer_1200', name: 'PVC Banner Roll Printer 1.2m', supportedMaterialTypes: ['roll'], maxRollWidthMm: 1200, maxRollLengthMm: null, variableLength: true, description: 'Roll-fed printer supports 1.2m width and variable length.' },
]; }
function summary(items: any[]) { return { machineCount: items.length, sheetCapable: items.filter(i=>i.supportedMaterialTypes?.includes('sheet')).length, boardCapable: items.filter(i=>i.supportedMaterialTypes?.includes('board')).length, rollCapable: items.filter(i=>i.supportedMaterialTypes?.includes('roll')).length, variableLengthCount: items.filter(i=>i.variableLength).length }; }
export async function GET(request: NextRequest) { try { const record = await readRecord(request, MACHINE_KEY); let items = (record as any)?.metadataJson?.items; if (!Array.isArray(items) || !items.length) { items = defaults(); await saveItems(request, items); } return NextResponse.json({ ok: true, source: 'internal-machine-capabilities-foundation-db', data: { items, summary: summary(items) } }); } catch (error) { return responseError(error); } }
export async function POST(request: NextRequest) { try { const body = await request.json().catch(()=>({})); const record = await readRecord(request, MACHINE_KEY); const items = Array.isArray((record as any)?.metadataJson?.items) ? (record as any).metadataJson.items : defaults(); if (body?.key) items.unshift({ ...body, updatedAt: new Date().toISOString() }); await saveItems(request, items.slice(0, 200)); return NextResponse.json({ ok: true, source: 'internal-machine-capabilities-foundation-db', data: { items, summary: summary(items) }, item: { action: body.action || 'saved', key: body.key || null } }); } catch (error) { return responseError(error); } }
