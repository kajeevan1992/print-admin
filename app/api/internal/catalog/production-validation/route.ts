export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const MATERIAL_KEY = 'storefront-material-specs-foundation';
const MACHINE_KEY = 'storefront-machine-capabilities-foundation';
const VALIDATION_KEY = 'storefront-production-validation-foundation';

function responseError(error: unknown, status = 500) {
  return NextResponse.json(
    { ok: false, error: error instanceof Error ? error.message : 'Production validation request failed.' },
    { status },
  );
}

async function readRecord(request: NextRequest, key: string) {
  try {
    return await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key);
  } catch (error) {
    if ((error instanceof Error ? error.message : '').includes('was not found')) return null;
    throw error;
  }
}

async function saveValidation(request: NextRequest, items: any[], actions: any[]) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: VALIDATION_KEY,
    slug: VALIDATION_KEY,
    name: 'Production material/machine validation',
    description: 'Validates material compatibility, sheet/board size and roll width before production release.',
    metadataJson: {
      items,
      actions,
      savedAt: new Date().toISOString(),
      storageKey: VALIDATION_KEY,
      source: 'ProductionValidationFoundation',
    },
  } as any);
}

function defaultMaterials() {
  return [
    { key: 'sra3_350gsm_silk', name: '350gsm Silk SRA3', materialType: 'sheet', widthMm: 320, heightMm: 450, compatibleMachineKeys: ['digital_sra3_press'] },
    { key: 'sra2_130gsm_silk', name: '130gsm Silk SRA2', materialType: 'sheet', widthMm: 450, heightMm: 640, compatibleMachineKeys: ['offset_sra2_press'] },
    { key: 'foamex_3mm_2440x1220', name: '3mm Foamex Board 2440x1220', materialType: 'board', parentWidthMm: 2440, parentHeightMm: 1220, thicknessMm: 3, compatibleMachineKeys: ['flatbed_uv_2500x1250'] },
    { key: 'pvc_banner_510gsm_1200x50000', name: '510gsm PVC Banner Roll 1.2m x 50m', materialType: 'roll', rollWidthMm: 1200, rollLengthMm: 50000, compatibleMachineKeys: ['roll_printer_1200'] },
  ];
}

function defaultMachines() {
  return [
    { key: 'digital_sra3_press', name: 'Digital SRA3 Press', supportedMaterialTypes: ['sheet'], maxSheetWidthMm: 320, maxSheetHeightMm: 450, variableLength: false },
    { key: 'offset_sra2_press', name: 'Offset SRA2 Press', supportedMaterialTypes: ['sheet'], maxSheetWidthMm: 450, maxSheetHeightMm: 640, variableLength: false },
    { key: 'flatbed_uv_2500x1250', name: 'Flatbed UV 2500x1250', supportedMaterialTypes: ['board'], maxBoardWidthMm: 2500, maxBoardHeightMm: 1250, variableLength: false },
    { key: 'roll_printer_1200', name: 'PVC Banner Roll Printer 1.2m', supportedMaterialTypes: ['roll'], maxRollWidthMm: 1200, maxRollLengthMm: null, variableLength: true },
  ];
}

function defaultJobs() {
  return [
    { id: 'validation-job-business-cards', orderNumber: 'VAL-BC-001', materialKey: 'sra3_350gsm_silk', machineKey: 'digital_sra3_press', requestedWidthMm: 320, requestedHeightMm: 450, productionStage: 'print' },
    { id: 'validation-job-board', orderNumber: 'VAL-BRD-001', materialKey: 'foamex_3mm_2440x1220', machineKey: 'flatbed_uv_2500x1250', requestedWidthMm: 1200, requestedHeightMm: 800, productionStage: 'print' },
    { id: 'validation-job-banner', orderNumber: 'VAL-BAN-001', materialKey: 'pvc_banner_510gsm_1200x50000', machineKey: 'roll_printer_1200', requestedWidthMm: 1100, requestedHeightMm: 3000, productionStage: 'print' },
    { id: 'validation-job-invalid-roll', orderNumber: 'VAL-BAN-FAIL', materialKey: 'pvc_banner_510gsm_1200x50000', machineKey: 'roll_printer_1200', requestedWidthMm: 1400, requestedHeightMm: 3000, productionStage: 'print' },
  ];
}

function fits2d(width: number, height: number, maxWidth: number, maxHeight: number) {
  return (width <= maxWidth && height <= maxHeight) || (height <= maxWidth && width <= maxHeight);
}

function validateJob(job: any, materials: any[], machines: any[]) {
  const issues: string[] = [];
  const warnings: string[] = [];
  const material = materials.find((item) => String(item.key) === String(job.materialKey));
  const machine = machines.find((item) => String(item.key) === String(job.machineKey));

  if (!material) issues.push(`Material ${job.materialKey || 'unknown'} was not found.`);
  if (!machine) issues.push(`Machine ${job.machineKey || 'unknown'} was not found.`);

  if (material && machine) {
    const supportedTypes = Array.isArray(machine.supportedMaterialTypes) ? machine.supportedMaterialTypes.map(String) : [];
    if (!supportedTypes.includes(String(material.materialType))) issues.push(`${machine.name || machine.key} does not support ${material.materialType} materials.`);

    const compatibleMachines = Array.isArray(material.compatibleMachineKeys) ? material.compatibleMachineKeys.map(String) : [];
    if (compatibleMachines.length && !compatibleMachines.includes(String(machine.key))) issues.push(`${material.name || material.key} is not mapped as compatible with ${machine.name || machine.key}.`);

    if (material.materialType === 'sheet') {
      const width = Number(material.widthMm || job.requestedWidthMm || 0);
      const height = Number(material.heightMm || job.requestedHeightMm || 0);
      const maxWidth = Number(machine.maxSheetWidthMm || 0);
      const maxHeight = Number(machine.maxSheetHeightMm || 0);
      if (!maxWidth || !maxHeight || !fits2d(width, height, maxWidth, maxHeight)) issues.push(`Sheet ${width}x${height}mm does not fit machine limit ${maxWidth}x${maxHeight}mm.`);
    }

    if (material.materialType === 'board') {
      const width = Number(job.requestedWidthMm || material.parentWidthMm || 0);
      const height = Number(job.requestedHeightMm || material.parentHeightMm || 0);
      const parentWidth = Number(material.parentWidthMm || 0);
      const parentHeight = Number(material.parentHeightMm || 0);
      const maxWidth = Number(machine.maxBoardWidthMm || 0);
      const maxHeight = Number(machine.maxBoardHeightMm || 0);
      if (parentWidth && parentHeight && !fits2d(width, height, parentWidth, parentHeight)) issues.push(`Requested board ${width}x${height}mm exceeds parent board ${parentWidth}x${parentHeight}mm.`);
      if (!maxWidth || !maxHeight || !fits2d(width, height, maxWidth, maxHeight)) issues.push(`Board ${width}x${height}mm does not fit machine limit ${maxWidth}x${maxHeight}mm.`);
    }

    if (material.materialType === 'roll') {
      const requestedWidth = Number(job.requestedWidthMm || material.rollWidthMm || 0);
      const requestedLength = Number(job.requestedHeightMm || 0);
      const rollWidth = Number(material.rollWidthMm || 0);
      const rollLength = Number(material.rollLengthMm || 0);
      const maxRollWidth = Number(machine.maxRollWidthMm || 0);
      const maxRollLength = machine.maxRollLengthMm == null ? null : Number(machine.maxRollLengthMm || 0);
      if (rollWidth && requestedWidth > rollWidth) issues.push(`Requested roll width ${requestedWidth}mm exceeds material roll width ${rollWidth}mm.`);
      if (maxRollWidth && requestedWidth > maxRollWidth) issues.push(`Requested roll width ${requestedWidth}mm exceeds machine max width ${maxRollWidth}mm.`);
      if (!machine.variableLength && maxRollLength && requestedLength > maxRollLength) issues.push(`Requested roll length ${requestedLength}mm exceeds machine max length ${maxRollLength}mm.`);
      if (rollLength && requestedLength > rollLength) warnings.push(`Requested length ${requestedLength}mm exceeds one roll length ${rollLength}mm; split production may be required.`);
    }
  }

  const status = issues.length ? 'blocked' : 'ready';
  return {
    ...job,
    materialName: material?.name || job.materialKey,
    materialType: material?.materialType || 'unknown',
    machineName: machine?.name || job.machineKey,
    validationStatus: status,
    productionBlocked: status === 'blocked',
    issues,
    warnings,
    validatedAt: new Date().toISOString(),
  };
}

function summary(items: any[]) {
  return {
    total: items.length,
    ready: items.filter((item) => item.validationStatus === 'ready').length,
    blocked: items.filter((item) => item.validationStatus === 'blocked').length,
    warnings: items.reduce((sum, item) => sum + (Array.isArray(item.warnings) ? item.warnings.length : 0), 0),
  };
}

async function loadMaterialsAndMachines(request: NextRequest) {
  const materialRecord = await readRecord(request, MATERIAL_KEY);
  const machineRecord = await readRecord(request, MACHINE_KEY);
  const materials = Array.isArray((materialRecord as any)?.metadataJson?.items) ? (materialRecord as any).metadataJson.items : defaultMaterials();
  const machines = Array.isArray((machineRecord as any)?.metadataJson?.items) ? (machineRecord as any).metadataJson.items : defaultMachines();
  return { materials, machines };
}

export async function GET(request: NextRequest) {
  try {
    const validationRecord = await readRecord(request, VALIDATION_KEY);
    const { materials, machines } = await loadMaterialsAndMachines(request);
    let items = (validationRecord as any)?.metadataJson?.items;
    let actions = (validationRecord as any)?.metadataJson?.actions;

    if (!Array.isArray(items) || !items.length) {
      items = defaultJobs().map((job) => validateJob(job, materials, machines));
      actions = [{ id: `validation-seed-${Date.now()}`, action: 'seed-validation-demo', at: new Date().toISOString() }];
      await saveValidation(request, items, actions);
    }

    return NextResponse.json({ ok: true, source: 'internal-production-validation-db', data: { items, materials, machines, actions: actions || [], summary: summary(items) } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'validate-all');
    const { materials, machines } = await loadMaterialsAndMachines(request);
    const record = await readRecord(request, VALIDATION_KEY);
    let items = Array.isArray((record as any)?.metadataJson?.items) ? (record as any).metadataJson.items : defaultJobs();
    let actions = Array.isArray((record as any)?.metadataJson?.actions) ? (record as any).metadataJson.actions : [];

    if (action === 'add-demo-invalid-sheet') {
      items = [{ id: `validation-sheet-${Date.now()}`, orderNumber: 'VAL-SHEET-FAIL', materialKey: 'sra2_130gsm_silk', machineKey: 'digital_sra3_press', requestedWidthMm: 450, requestedHeightMm: 640, productionStage: 'print' }, ...items];
    }

    if (action === 'clear-blocks') {
      items = items.map((item: any) => ({ ...item, validationStatus: 'ready', productionBlocked: false, overrideReason: body.reason || 'Manual production validation override' }));
    } else {
      items = items.map((job: any) => validateJob(job, materials, machines));
    }

    actions = [{ id: `production-validation-${Date.now()}`, action, at: new Date().toISOString(), summary: summary(items) }, ...actions].slice(0, 100);
    await saveValidation(request, items.slice(0, 200), actions);

    return NextResponse.json({ ok: true, source: 'internal-production-validation-db', data: { items, materials, machines, actions, summary: summary(items) }, item: actions[0] });
  } catch (error) {
    return responseError(error);
  }
}
