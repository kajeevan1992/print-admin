import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';

export type SeoRedirectStatus = 301 | 302 | 307 | 308 | 410;

export type SeoRedirectRecord = {
  id: string;
  slug: string;
  fromPath: string;
  toPath: string;
  statusCode: SeoRedirectStatus;
  isActive: boolean;
  note?: string;
  hitCount: number;
  lastHitAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type CoreCatalogRow = {
  id: string;
  tenantId: string;
  resource: string;
  slug: string;
  name: string;
  description: string | null;
  metadataJson: any;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const RESOURCE = 'seo-redirects';

function now() {
  return new Date().toISOString();
}

function iso(value: Date | string | undefined) {
  return value ? new Date(value).toISOString() : now();
}

function cleanPath(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return '/';
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      return `${url.pathname || '/'}${url.search || ''}`;
    } catch {
      return '/';
    }
  }
  const [path, query = ''] = raw.split('?');
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${clean.replace(/\/+/g, '/')}${query ? `?${query}` : ''}`;
}

function slugifyPath(path: string) {
  return cleanPath(path)
    .toLowerCase()
    .replace(/^\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'home';
}

function parseJson(value: any) {
  if (!value) return {};
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return {}; }
  }
  return value;
}

async function ensureRedirectStorage() {
  await (prisma as any).$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CoreCatalogRecord" (
      "id" TEXT PRIMARY KEY,
      "tenantId" TEXT NOT NULL,
      "resource" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT NOT NULL DEFAULT '',
      "metadataJson" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await (prisma as any).$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "CoreCatalogRecord_tenantId_resource_slug_key" ON "CoreCatalogRecord" ("tenantId", "resource", "slug")');
  await (prisma as any).$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CoreCatalogRecord_tenantId_resource_idx" ON "CoreCatalogRecord" ("tenantId", "resource")');
}

function validateStatus(value: unknown): SeoRedirectStatus {
  const code = Number(value || 301);
  if ([301, 302, 307, 308, 410].includes(code)) return code as SeoRedirectStatus;
  return 301;
}

function toRecord(row: CoreCatalogRow): SeoRedirectRecord {
  const meta = parseJson(row.metadataJson);
  const statusCode = validateStatus(meta.statusCode);
  return {
    id: row.id,
    slug: row.slug,
    fromPath: cleanPath(meta.fromPath || row.name || row.slug),
    toPath: statusCode === 410 ? '' : cleanPath(meta.toPath || row.description || '/'),
    statusCode,
    isActive: meta.isActive !== false,
    note: meta.note || '',
    hitCount: Number(meta.hitCount || 0),
    lastHitAt: meta.lastHitAt || undefined,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export async function listSeoRedirects(request: Request, filters: { search?: string; active?: string } = {}) {
  await ensureRedirectStorage();
  const ctx = tenantContextFromRequest(request);
  const rows = await (prisma as any).$queryRaw<CoreCatalogRow[]>`
    SELECT * FROM "CoreCatalogRecord"
    WHERE "tenantId" = ${ctx.tenantId} AND "resource" = ${RESOURCE}
    ORDER BY "updatedAt" DESC
  `;
  let items = rows.map(toRecord);
  if (filters.active === 'true') items = items.filter((item) => item.isActive);
  if (filters.active === 'false') items = items.filter((item) => !item.isActive);
  const q = String(filters.search || '').trim().toLowerCase();
  if (q) items = items.filter((item) => [item.fromPath, item.toPath, item.note].join(' ').toLowerCase().includes(q));
  return {
    items,
    summary: {
      total: items.length,
      active: items.filter((item) => item.isActive).length,
      inactive: items.filter((item) => !item.isActive).length,
      gone: items.filter((item) => item.statusCode === 410).length,
      hits: items.reduce((sum, item) => sum + item.hitCount, 0),
    },
    resource: RESOURCE,
  };
}

export async function saveSeoRedirect(request: Request, input: Partial<SeoRedirectRecord>) {
  await ensureRedirectStorage();
  const ctx = tenantContextFromRequest(request);
  const fromPath = cleanPath(input.fromPath);
  const statusCode = validateStatus(input.statusCode);
  const toPath = statusCode === 410 ? '' : cleanPath(input.toPath || '/');
  if (fromPath === '/') throw new Error('Do not redirect the homepage. Use a specific old URL.');
  if (toPath && fromPath === toPath) throw new Error('Redirect source and target cannot be the same.');
  const slug = slugifyPath(fromPath);
  const id = String(input.id || `redir-${slug}`);
  const meta: SeoRedirectRecord = {
    id,
    slug,
    fromPath,
    toPath,
    statusCode,
    isActive: input.isActive !== false,
    note: input.note || '',
    hitCount: Number(input.hitCount || 0),
    lastHitAt: input.lastHitAt,
    createdAt: input.createdAt || now(),
    updatedAt: now(),
  };
  const rows = await (prisma as any).$queryRaw<CoreCatalogRow[]>`
    INSERT INTO "CoreCatalogRecord" ("id", "tenantId", "resource", "slug", "name", "description", "metadataJson", "createdAt", "updatedAt")
    VALUES (${id}, ${ctx.tenantId}, ${RESOURCE}, ${slug}, ${fromPath}, ${toPath || ''}, ${JSON.stringify(meta)}::jsonb, NOW(), NOW())
    ON CONFLICT ("tenantId", "resource", "slug") DO UPDATE SET
      "name" = EXCLUDED."name",
      "description" = EXCLUDED."description",
      "metadataJson" = EXCLUDED."metadataJson",
      "updatedAt" = NOW()
    RETURNING *
  `;
  return toRecord(rows[0]);
}

export async function deleteSeoRedirect(request: Request, idOrSlugOrPath: string) {
  await ensureRedirectStorage();
  const ctx = tenantContextFromRequest(request);
  const slug = slugifyPath(idOrSlugOrPath);
  const path = cleanPath(idOrSlugOrPath);
  const rows = await (prisma as any).$queryRaw<CoreCatalogRow[]>`
    SELECT * FROM "CoreCatalogRecord"
    WHERE "tenantId" = ${ctx.tenantId}
      AND "resource" = ${RESOURCE}
      AND ("id" = ${idOrSlugOrPath} OR "slug" = ${slug} OR "name" = ${path})
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return { ok: true, deleted: 0 };
  await (prisma as any).$executeRaw`DELETE FROM "CoreCatalogRecord" WHERE "id" = ${row.id}`;
  return { ok: true, deleted: 1, item: toRecord(row) };
}

export async function resolveSeoRedirect(request: Request, pathValue: string, trackHit = true) {
  await ensureRedirectStorage();
  const ctx = tenantContextFromRequest(request);
  const path = cleanPath(pathValue);
  const slug = slugifyPath(path);
  const rows = await (prisma as any).$queryRaw<CoreCatalogRow[]>`
    SELECT * FROM "CoreCatalogRecord"
    WHERE "tenantId" = ${ctx.tenantId}
      AND "resource" = ${RESOURCE}
      AND ("slug" = ${slug} OR "name" = ${path})
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  const redirect = toRecord(row);
  if (!redirect.isActive) return null;
  if (trackHit) {
    const nextMeta = { ...parseJson(row.metadataJson), hitCount: redirect.hitCount + 1, lastHitAt: now() };
    await (prisma as any).$executeRaw`
      UPDATE "CoreCatalogRecord"
      SET "metadataJson" = ${JSON.stringify(nextMeta)}::jsonb, "updatedAt" = NOW()
      WHERE "id" = ${row.id}
    `;
  }
  return { ...redirect, hitCount: redirect.hitCount + (trackHit ? 1 : 0), lastHitAt: trackHit ? now() : redirect.lastHitAt };
}
