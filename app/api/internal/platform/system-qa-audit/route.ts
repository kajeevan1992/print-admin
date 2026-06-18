import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { adminNavigationRegistry } from '@/config/admin-navigation';

const ADMIN_NAVIGATION_REGISTRY = adminNavigationRegistry;
function validateAdminNavigationRegistry() {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const item of ADMIN_NAVIGATION_REGISTRY) {
    if (!item.href || !item.label) errors.push(`Navigation item missing label or href: ${item.label || item.href}`);
    if (seen.has(item.href)) errors.push(`Duplicate navigation href: ${item.href}`);
    seen.add(item.href);
  }
  return { ok: errors.length === 0, errors, warnings: [] as string[] };
}

export const dynamic = 'force-dynamic';

type AuditStatus = 'connected' | 'partial' | 'placeholder' | 'unknown';
type RepairBucket = 'ready' | 'missing-navigation' | 'needs-db-api' | 'placeholder-cleanup' | 'manual-review';
type PageAuditItem = { label: string; href: string; pageFile: string; inRegistry: boolean; registeredSurfaces: string[]; apiRoutes: string[]; status: AuditStatus; repairBucket: RepairBucket; priorityScore: number; evidence: string[]; nextAction: string };

function walkFiles(dir: string, matcher: (file: string) => boolean, collected: string[] = []) { if (!fs.existsSync(dir)) return collected; for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) { if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue; walkFiles(full, matcher, collected); } else if (matcher(full)) { collected.push(full); } } return collected; }
function hrefFromPageFile(appDir: string, file: string) { const rel = path.relative(appDir, file).replace(/\\/g, '/'); const dir = rel.replace(/\/page\.(tsx|ts|jsx|js)$/, ''); if (dir === 'page') return '/'; return '/' + dir.replace(/\/page$/, '').replace(/\(dashboard\)\//g, '').replace(/\(dashboard\)/g, '').replace(/\/\(.*?\)/g, '').replace(/\/+/g, '/'); }
function routeHrefFromRouteFile(appDir: string, file: string) { const rel = path.relative(appDir, file).replace(/\\/g, '/'); const dir = rel.replace(/\/route\.(tsx|ts|jsx|js)$/, ''); return '/' + dir.replace(/\/+/g, '/'); }
function titleFromHref(href: string) { if (href === '/') return 'Dashboard'; return href.split('/').filter(Boolean).pop()!.replace(/\[|\]/g, '').split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '); }
function inferStatus(source: string, apiRoutes: string[]): { status: AuditStatus; evidence: string[]; nextAction: string } { const evidence: string[] = []; const lower = source.toLowerCase(); if (apiRoutes.length) evidence.push('matching internal API route found'); if (source.includes('fetch(')) evidence.push('page performs fetch call'); if (source.includes('/api/internal/')) evidence.push('uses internal API'); if (source.includes('localStorage')) evidence.push('has browser localStorage fallback or legacy storage'); if (source.includes('DB/API') || source.includes('database') || source.includes('Database')) evidence.push('contains DB/API status wording'); if (lower.includes('placeholder') || lower.includes('coming soon') || lower.includes('demo data')) evidence.push('placeholder/demo wording detected'); if (source.includes('/api/internal/') || apiRoutes.length) return { status: source.includes('localStorage') ? 'partial' : 'connected', evidence, nextAction: source.includes('localStorage') ? 'Confirm DB/API save path and remove fallback once stable.' : 'Run manual save/edit/refresh test.' }; if (lower.includes('placeholder') || lower.includes('coming soon') || lower.includes('demo data')) return { status: 'placeholder', evidence, nextAction: 'Replace placeholder/demo state with internal API + DB storage.' }; return { status: 'unknown', evidence, nextAction: 'Audit manually: check whether page saves to internal API and persists after refresh.' }; }
function repairBucketFor(item: Omit<PageAuditItem, 'repairBucket' | 'priorityScore'>): { repairBucket: RepairBucket; priorityScore: number } { if (!item.inRegistry) return { repairBucket: 'missing-navigation', priorityScore: 90 }; if (item.status === 'placeholder') return { repairBucket: 'placeholder-cleanup', priorityScore: 80 }; if (item.status === 'partial') return { repairBucket: 'needs-db-api', priorityScore: 70 }; if (item.status === 'unknown') return { repairBucket: 'manual-review', priorityScore: 50 }; return { repairBucket: 'ready', priorityScore: 10 }; }
function buildRepairGroups(pages: PageAuditItem[]) { const definitions: { key: RepairBucket; label: string; description: string }[] = [{ key: 'missing-navigation', label: 'Missing navigation', description: 'Page exists but is not registered in sidebar/topbar registry.' }, { key: 'needs-db-api', label: 'Needs DB/API verification', description: 'Page has internal API evidence but still uses fallback/local state or needs persistence cleanup.' }, { key: 'placeholder-cleanup', label: 'Placeholder cleanup', description: 'Page still looks like demo/placeholder and should be wired or replaced.' }, { key: 'manual-review', label: 'Manual review', description: 'Page status could not be inferred confidently from source scan.' }, { key: 'ready', label: 'Ready/connected', description: 'Page has navigation and DB/API evidence. Still needs manual smoke test.' }]; return definitions.map((definition) => { const groupPages = pages.filter((page) => page.repairBucket === definition.key).sort((a, b) => b.priorityScore - a.priorityScore || a.href.localeCompare(b.href)); return { ...definition, count: groupPages.length, pages: groupPages.slice(0, 25) }; }); }
function relatedApiRoutes(href: string, apiRoutes: string[]) { const last = href.split('/').filter(Boolean).pop() ?? ''; if (!last) return []; const normalized = last.replace(/-/g, ''); return apiRoutes.filter((route) => route.replace(/-/g, '').toLowerCase().includes(normalized.toLowerCase())); }

export async function GET() {
  const appDir = path.join(process.cwd(), 'app');
  const pageFiles = walkFiles(appDir, (file) => /\/page\.(tsx|ts|jsx|js)$/.test(file));
  const routeFiles = walkFiles(appDir, (file) => /\/route\.(tsx|ts|jsx|js)$/.test(file));
  const apiRoutes = routeFiles.map((file) => routeHrefFromRouteFile(appDir, file)).sort();
  const registeredByHref = new Map<string, typeof ADMIN_NAVIGATION_REGISTRY>();
  for (const item of ADMIN_NAVIGATION_REGISTRY) { const group = registeredByHref.get(item.href) ?? []; group.push(item); registeredByHref.set(item.href, group); }
  const pages: PageAuditItem[] = pageFiles.map((file) => { const href = hrefFromPageFile(appDir, file); const source = fs.readFileSync(file, 'utf8'); const routeMatches = relatedApiRoutes(href, apiRoutes); const registered = registeredByHref.get(href) ?? []; const inferred = inferStatus(source, routeMatches); const baseItem = { label: registered[0]?.label ?? titleFromHref(href), href, pageFile: path.relative(process.cwd(), file).replace(/\\/g, '/'), inRegistry: registered.length > 0, registeredSurfaces: registered.map((item) => item.surface ?? 'sidebar'), apiRoutes: routeMatches, status: inferred.status, evidence: inferred.evidence, nextAction: inferred.nextAction }; const repair = repairBucketFor(baseItem); return { ...baseItem, ...repair }; }).sort((a, b) => a.href.localeCompare(b.href));
  const summary = { pages: pages.length, apiRoutes: apiRoutes.length, registeredNavigationItems: ADMIN_NAVIGATION_REGISTRY.length, connected: pages.filter((item) => item.status === 'connected').length, partial: pages.filter((item) => item.status === 'partial').length, placeholder: pages.filter((item) => item.status === 'placeholder').length, unknown: pages.filter((item) => item.status === 'unknown').length, notInRegistry: pages.filter((item) => !item.inRegistry && !item.href.startsWith('/api')).length, repairQueue: pages.filter((item) => item.repairBucket !== 'ready').length };
  const priority = pages.filter((item) => item.repairBucket !== 'ready').sort((a, b) => b.priorityScore - a.priorityScore || a.href.localeCompare(b.href)).slice(0, 80);
  const repairGroups = buildRepairGroups(pages);
  const nextBuildRecommendation = priority.slice(0, 12);
  const navValidation = validateAdminNavigationRegistry();
  return NextResponse.json({ ok: navValidation.ok, source: 'internal-core', data: { summary, pages, priority, repairQueue: priority, repairGroups, nextBuildRecommendation, apiRoutes, navValidation, guidance: 'Use this dashboard as the phase checkpoint: page exists, navigation visibility, internal API evidence, DB/API readiness, repair bucket, and next manual action.' } });
}
