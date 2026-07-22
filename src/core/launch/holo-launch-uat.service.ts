import crypto from 'node:crypto';
import { platformPrisma } from '@/core/db/platform-prisma';
import { HOLO_LAUNCH_DEFAULTS, HOLO_LAUNCH_UAT_TASKS, type LaunchUatStatus } from './holo-launch-uat-catalog';

type Actor = { id: string; label: string };
type TenantScope = { canonicalTenantId: string; tenantSlug: string; tenantIds: string[] };
type StoreOption = { slug: string; name: string };
type StateRow = Record<string, any>;
type SignoffRow = Record<string, any>;

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function uniq(values: string[]) { return Array.from(new Set(values.map(clean).filter(Boolean))); }
function iso(value: unknown) { if (!value) return ''; const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? '' : date.toISOString(); }
function safeNote(value: unknown, maximum = 2_000) { return clean(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ').slice(0, maximum); }
function safeEvidenceUrl(value: unknown) {
  const next = clean(value);
  if (!next) return '';
  if (next.startsWith('/') && !next.startsWith('//')) return next.slice(0, 1_000);
  try { const parsed = new URL(next); if (parsed.protocol === 'https:') return parsed.toString().slice(0, 1_000); } catch {}
  throw new Error('Evidence URL must be an internal path or HTTPS URL.');
}

async function ensureTables() {
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "LaunchUatTaskState" (
    "id" TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "tenantSlug" TEXT NOT NULL,
    "storeSlug" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    note TEXT NOT NULL DEFAULT '',
    "evidenceUrl" TEXT NOT NULL DEFAULT '',
    "reviewedBy" TEXT NOT NULL DEFAULT '',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await platformPrisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "LaunchUatTaskState_scope_task_uq" ON "LaunchUatTaskState"("tenantId","storeSlug","taskId")');
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "LaunchUatTaskState_scope_idx" ON "LaunchUatTaskState"("tenantId","storeSlug","updatedAt")');
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "LaunchUatEvent" (
    "id" TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "tenantSlug" TEXT NOT NULL,
    "storeSlug" TEXT NOT NULL,
    "taskId" TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL DEFAULT '',
    "toStatus" TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    "evidenceUrl" TEXT NOT NULL DEFAULT '',
    "actorId" TEXT NOT NULL DEFAULT '',
    "actorLabel" TEXT NOT NULL DEFAULT '',
    "metadataJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "LaunchUatEvent_scope_time_idx" ON "LaunchUatEvent"("tenantId","storeSlug","occurredAt")');
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "LaunchUatSignoffEvent" (
    "id" TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "tenantSlug" TEXT NOT NULL,
    "storeSlug" TEXT NOT NULL,
    decision TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    "readinessJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "actorId" TEXT NOT NULL DEFAULT '',
    "actorLabel" TEXT NOT NULL DEFAULT '',
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await platformPrisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "LaunchUatSignoffEvent_scope_time_idx" ON "LaunchUatSignoffEvent"("tenantId","storeSlug","signedAt")');
}

async function resolveTenantScope(tenantSlugOrId: string): Promise<TenantScope> {
  const requested = clean(tenantSlugOrId);
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug: string; defaultSubdomain: string }>>(
    'SELECT id,slug,"defaultSubdomain" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1', requested,
  ).catch(() => []);
  const tenant = rows[0];
  if (!tenant) throw new Error('Tenant was not found for launch UAT.');
  return { canonicalTenantId: tenant.id, tenantSlug: tenant.slug, tenantIds: uniq([requested, tenant.id, tenant.slug, tenant.defaultSubdomain]) };
}

async function listStores(scope: TenantScope): Promise<StoreOption[]> {
  const placeholders = scope.tenantIds.map((_, index) => `$${index + 1}`).join(',');
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ slug: string; metadataJson: Record<string, any> | null }>>(
    `SELECT slug,"metadataJson" FROM "CoreCatalogRecord" WHERE resource='storefront-stores' AND "tenantId" IN (${placeholders}) ORDER BY "updatedAt" DESC`,
    ...scope.tenantIds,
  ).catch(() => []);
  const options = rows.map((row) => {
    const metadata = row.metadataJson || {};
    const storeSlug = slug(metadata.storeSlug || metadata.slug || metadata.storeId || row.slug);
    return { slug: storeSlug, name: clean(metadata.name || metadata.storeName || metadata.label) || storeSlug };
  }).filter((item) => item.slug);
  const unique = new Map<string, StoreOption>();
  for (const item of options) if (!unique.has(item.slug)) unique.set(item.slug, item);
  return Array.from(unique.values());
}

async function resolveStore(scope: TenantScope, requestedStoreSlug: string) {
  const stores = await listStores(scope);
  const requested = slug(requestedStoreSlug) || HOLO_LAUNCH_DEFAULTS.storeSlug;
  const selected = stores.find((store) => store.slug === requested) || stores.find((store) => store.slug === HOLO_LAUNCH_DEFAULTS.storeSlug) || stores[0];
  if (!selected) throw new Error('Storefront store not found for this tenant.');
  return { stores, selected };
}

function taskSummary(items: Array<Record<string, any>>) {
  const required = items.filter((item) => item.requiredForPublic);
  return {
    total: items.length,
    pass: items.filter((item) => item.status === 'pass').length,
    fail: items.filter((item) => item.status === 'fail').length,
    pending: items.filter((item) => item.status === 'pending').length,
    na: items.filter((item) => item.status === 'na').length,
    requiredTotal: required.length,
    requiredPass: required.filter((item) => item.status === 'pass').length,
    requiredFail: required.filter((item) => item.status === 'fail').length,
    requiredPending: required.filter((item) => item.status === 'pending' || item.status === 'na').length,
  };
}

function serialiseSignoff(row?: SignoffRow) {
  if (!row) return null;
  return { id: row.id, decision: clean(row.decision), note: clean(row.note), actorLabel: clean(row.actorLabel), signedAt: iso(row.signedAt), readiness: row.readinessJson || {} };
}

async function snapshot(scope: TenantScope, storeSlug: string, stores: StoreOption[]) {
  await ensureTables();
  const [states, signoffs, events] = await Promise.all([
    platformPrisma.$queryRawUnsafe<StateRow[]>('SELECT * FROM "LaunchUatTaskState" WHERE "tenantId"=$1 AND "storeSlug"=$2', scope.canonicalTenantId, storeSlug),
    platformPrisma.$queryRawUnsafe<SignoffRow[]>('SELECT * FROM "LaunchUatSignoffEvent" WHERE "tenantId"=$1 AND "storeSlug"=$2 ORDER BY "signedAt" DESC LIMIT 10', scope.canonicalTenantId, storeSlug),
    platformPrisma.$queryRawUnsafe<StateRow[]>('SELECT * FROM "LaunchUatEvent" WHERE "tenantId"=$1 AND "storeSlug"=$2 ORDER BY "occurredAt" DESC LIMIT 80', scope.canonicalTenantId, storeSlug),
  ]);
  const stateByTask = new Map(states.map((row) => [clean(row.taskId), row]));
  const items = HOLO_LAUNCH_UAT_TASKS.map((definition) => {
    const state = stateByTask.get(definition.id);
    return {
      ...definition,
      status: clean(state?.status) || 'pending',
      note: clean(state?.note),
      evidenceUrl: clean(state?.evidenceUrl),
      reviewedBy: clean(state?.reviewedBy),
      reviewedAt: iso(state?.reviewedAt),
      updatedAt: iso(state?.updatedAt),
    };
  });
  const summary = taskSummary(items);
  return {
    tenantSlug: scope.tenantSlug,
    storeSlug,
    stores,
    defaults: HOLO_LAUNCH_DEFAULTS,
    items,
    summary,
    readyForPublicSignoff: summary.requiredPass === summary.requiredTotal && summary.fail === 0,
    latestSignoff: serialiseSignoff(signoffs[0]),
    signoffs: signoffs.map(serialiseSignoff),
    events: events.map((row) => ({ id: row.id, taskId: clean(row.taskId), action: clean(row.action), fromStatus: clean(row.fromStatus), toStatus: clean(row.toStatus), note: clean(row.note), evidenceUrl: clean(row.evidenceUrl), actorLabel: clean(row.actorLabel), occurredAt: iso(row.occurredAt) })),
  };
}

export async function readHoloLaunchUat(tenantSlugOrId: string, requestedStoreSlug: string) {
  const scope = await resolveTenantScope(tenantSlugOrId);
  const { stores, selected } = await resolveStore(scope, requestedStoreSlug);
  return snapshot(scope, selected.slug, stores);
}

export async function updateHoloLaunchUatTask(tenantSlugOrId: string, requestedStoreSlug: string, input: Record<string, any>, actor: Actor) {
  const scope = await resolveTenantScope(tenantSlugOrId);
  const { stores, selected } = await resolveStore(scope, requestedStoreSlug);
  await ensureTables();
  const taskId = clean(input.taskId);
  const definition = HOLO_LAUNCH_UAT_TASKS.find((task) => task.id === taskId);
  if (!definition) throw new Error('Launch UAT task was not found.');
  const status = clean(input.status).toLowerCase() as LaunchUatStatus;
  if (!['pending', 'pass', 'fail', 'na'].includes(status)) throw new Error('Choose a valid launch UAT status.');
  if (definition.requiredForPublic && status === 'na') throw new Error('Required public-launch tasks cannot be marked not applicable.');
  const note = safeNote(input.note);
  const evidenceUrl = safeEvidenceUrl(input.evidenceUrl);
  if ((status === 'pass' || status === 'fail') && !note) throw new Error('Add an evidence note before passing or failing a launch task.');
  const currentRows = await platformPrisma.$queryRawUnsafe<StateRow[]>('SELECT * FROM "LaunchUatTaskState" WHERE "tenantId"=$1 AND "storeSlug"=$2 AND "taskId"=$3 LIMIT 1', scope.canonicalTenantId, selected.slug, taskId);
  const current = currentRows[0];
  const id = current?.id || `launch-uat-${crypto.randomUUID()}`;
  const reviewedAt = status === 'pending' ? null : new Date();
  await (platformPrisma as any).$transaction(async (tx: any) => {
    if (current) {
      await tx.$executeRawUnsafe('UPDATE "LaunchUatTaskState" SET status=$1,note=$2,"evidenceUrl"=$3,"reviewedBy"=$4,"reviewedAt"=$5,"updatedAt"=NOW() WHERE id=$6 AND "tenantId"=$7', status, note, evidenceUrl, clean(actor.label), reviewedAt, id, scope.canonicalTenantId);
    } else {
      await tx.$executeRawUnsafe('INSERT INTO "LaunchUatTaskState" (id,"tenantId","tenantSlug","storeSlug","taskId",status,note,"evidenceUrl","reviewedBy","reviewedAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())', id, scope.canonicalTenantId, scope.tenantSlug, selected.slug, taskId, status, note, evidenceUrl, clean(actor.label), reviewedAt);
    }
    await tx.$executeRawUnsafe('INSERT INTO "LaunchUatEvent" (id,"tenantId","tenantSlug","storeSlug","taskId",action,"fromStatus","toStatus",note,"evidenceUrl","actorId","actorLabel","metadataJson","occurredAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,NOW())', `launch-uat-event-${crypto.randomUUID()}`, scope.canonicalTenantId, scope.tenantSlug, selected.slug, taskId, 'task-updated', clean(current?.status || 'pending'), status, note, evidenceUrl, clean(actor.id), clean(actor.label), JSON.stringify({ label: definition.label, requiredForPublic: definition.requiredForPublic }));
  });
  return snapshot(scope, selected.slug, stores);
}

export async function signOffHoloLaunchUat(tenantSlugOrId: string, requestedStoreSlug: string, input: Record<string, any>, actor: Actor) {
  const scope = await resolveTenantScope(tenantSlugOrId);
  const { stores, selected } = await resolveStore(scope, requestedStoreSlug);
  const current = await snapshot(scope, selected.slug, stores);
  const decision = clean(input.decision).toLowerCase();
  if (!['blocked', 'soft-launch', 'public-launch'].includes(decision)) throw new Error('Choose blocked, soft-launch or public-launch.');
  const confirmation = clean(input.confirmation).toUpperCase();
  const expected = decision === 'public-launch' ? 'PUBLIC LAUNCH HOLO PRINT' : decision === 'soft-launch' ? 'SOFT LAUNCH HOLO PRINT' : 'BLOCK HOLO PRINT';
  if (confirmation !== expected) throw new Error(`Type ${expected} to record this decision.`);
  if (decision === 'public-launch' && !current.readyForPublicSignoff) throw new Error('All required UAT tasks must pass before public-launch sign-off.');
  const readiness = input.readiness && typeof input.readiness === 'object' ? input.readiness : {};
  if (decision === 'public-launch' && Number(readiness.hardBlockers || 0) > 0) throw new Error('Final readiness still reports hard blockers.');
  const note = safeNote(input.note);
  if (!note) throw new Error('Add a sign-off note.');
  await ensureTables();
  await platformPrisma.$executeRawUnsafe(
    'INSERT INTO "LaunchUatSignoffEvent" (id,"tenantId","tenantSlug","storeSlug",decision,note,"readinessJson","actorId","actorLabel","signedAt") VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,NOW())',
    `launch-signoff-${crypto.randomUUID()}`, scope.canonicalTenantId, scope.tenantSlug, selected.slug, decision, note, JSON.stringify({ ...readiness, uatSummary: current.summary }), clean(actor.id), clean(actor.label),
  );
  await platformPrisma.$executeRawUnsafe(
    'INSERT INTO "LaunchUatEvent" (id,"tenantId","tenantSlug","storeSlug","taskId",action,"fromStatus","toStatus",note,"evidenceUrl","actorId","actorLabel","metadataJson","occurredAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,NOW())',
    `launch-uat-event-${crypto.randomUUID()}`, scope.canonicalTenantId, scope.tenantSlug, selected.slug, '', 'signoff-recorded', '', decision, note, '', clean(actor.id), clean(actor.label), JSON.stringify({ readiness, uatSummary: current.summary }),
  );
  return snapshot(scope, selected.slug, stores);
}
