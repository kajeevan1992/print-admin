import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';

export async function resolveProductionTenantId(request: Request) {
  const context = tenantContextFromRequest(request);
  const raw = String(context.tenantId || '').trim();

  const tenant =
    (raw && (await prisma.tenant.findUnique({ where: { id: raw }, select: { id: true } }))) ||
    (raw && (await prisma.tenant.findUnique({ where: { slug: raw }, select: { id: true } }))) ||
    (await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }));

  if (!tenant) {
    throw new Error('No tenant available for production jobs.');
  }

  return tenant.id;
}

function normalizeStatus(value: unknown) {
  const raw = String(value || 'PENDING').toUpperCase().replace(/-/g, '_');
  return ['PENDING','QUEUED','IN_PROGRESS','ON_HOLD','COMPLETE','CANCELLED'].includes(raw)
    ? raw
    : 'PENDING';
}

export function normalizeProductionJob(job: any) {
  return {
    id: job.id,
    tenantId: job.tenantId,
    orderId: job.orderId || null,
    machineId: job.machineId || null,
    machineName: job.machineName || '',
    title: job.title || '',
    status: job.status,
    priority: job.priority || 'NORMAL',
    estimatedMinutes: job.estimatedMinutes || 0,
    scheduledStartAt: job.scheduledStartAt,
    scheduledEndAt: job.scheduledEndAt,
    notes: job.notes || '',
    metadataJson: job.metadataJson || null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    source: 'internal-production-jobs-db',
  };
}

export async function listProductionJobs(request: Request, options: Record<string, any> = {}) {
  const tenantId = await resolveProductionTenantId(request);

  const jobs = await prisma.productionJob.findMany({
    where: {
      tenantId,
      ...(options.machineId ? { machineId: options.machineId } : {}),
      ...(options.status ? { status: normalizeStatus(options.status) as any } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: Math.max(1, Math.min(200, Number(options.limit || 100))),
  });

  return jobs.map(normalizeProductionJob);
}

export async function getProductionJob(request: Request, id: string) {
  const tenantId = await resolveProductionTenantId(request);

  const job = await prisma.productionJob.findFirst({
    where: { tenantId, id },
  });

  return job ? normalizeProductionJob(job) : null;
}

export async function saveProductionJob(request: Request, input: Record<string, any>) {
  const tenantId = await resolveProductionTenantId(request);
  const id = String(input.id || input.jobId || '').trim();

  const data = {
    tenantId,
    orderId: input.orderId || null,
    machineId: input.machineId || null,
    machineName: String(input.machineName || ''),
    title: String(input.title || input.name || 'Production Job'),
    status: normalizeStatus(input.status) as any,
    priority: String(input.priority || 'NORMAL').toUpperCase(),
    estimatedMinutes: Number(input.estimatedMinutes || 0),
    scheduledStartAt: input.scheduledStartAt ? new Date(input.scheduledStartAt) : null,
    scheduledEndAt: input.scheduledEndAt ? new Date(input.scheduledEndAt) : null,
    notes: String(input.notes || ''),
    metadataJson: input,
  } as any;

  const job = id
    ? await prisma.productionJob.update({ where: { id }, data })
    : await prisma.productionJob.create({ data });

  return normalizeProductionJob(job);
}
