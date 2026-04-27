import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { ADMIN_NAVIGATION_REGISTRY, validateAdminNavigationRegistry } from '@/config/admin-navigation';

export const dynamic = 'force-dynamic';

type AuditStatus = 'connected' | 'partial' | 'placeholder' | 'unknown';

type PageAuditItem = {
  label: string;
  href: string;
  pageFile: string;
  inRegistry: boolean;
  registeredSurfaces: string[];
  apiRoutes: string[];
  status: AuditStatus;
  evidence: string[];
  nextAction: string;
};

function walkFiles(dir: string, matcher: (file: string) => boolean, collected: string[] = []) {
  if (!fs.existsSync(dir)) return collected;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
      walkFiles(full, matcher, collected);
    } else if (matcher(full)) {
      collected.push(full);
    }
  }
  return collected;
}

function hrefFromPageFile(appDir: string, file: string) {
  const rel = path.relative(appDir, file).replace(/\\/g, '/');
  const dir = rel.replace(/\/page\.(tsx|ts|jsx|js)$/, '');
  if (dir === 'page') return '/';
  return '/' + dir.replace(/\/page$/, '').replace(/\(dashboard\)\//g, '').replace(/\(dashboard\)/g, '').replace(/\/\(.*?\)/g, '').replace(/\/+/g, '/');
}

function routeHrefFromRouteFile(appDir: string, file: string) {
  const rel = path.relative(appDir, file).replace(/\\/g, '/');
  const dir = rel.replace(/\/route\.(tsx|ts|jsx|js)$/, '');
  return '/' + dir.replace(/\/+/g, '/');
}

function titleFromHref(href: string) {
  if (href === '/') return 'Dashboard';
  return href
    .split('/')
    .filter(Boolean)
    .pop()!
    .replace(/\[|\]/g, '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function inferStatus(source: string, apiRoutes: string[]): { status: AuditStatus; evidence: string[]; nextAction: string } {
  const evidence: string[] = [];
  const lower = source.toLowerCase();

  if (apiRoutes.length) evidence.push('matching internal API route found');
  if (source.includes('fetch(')) evidence.push('page performs fetch call');
  if (source.includes('/api/internal/')) evidence.push('uses internal API');
  if (source.includes('localStorage')) evidence.push('has browser localStorage fallback or legacy storage');
  if (source.includes('DB/API') || source.includes('database') || source.includes('Database')) evidence.push('contains DB/API status wording');
  if (lower.includes('placeholder') || lower.includes('coming soon') || lower.includes('demo data')) evidence.push('placeholder/demo wording detected');

  if (source.includes('/api/internal/') || apiRoutes.length) {
    return {
      status: source.includes('localStorage') ? 'partial' : 'connected',
      evidence,
      nextAction: source.includes('localStorage')
        ? 'Confirm DB/API save path and remove fallback once stable.'
        : 'Run manual save/edit/refresh test.'
    };
  }

  if (lower.includes('placeholder') || lower.includes('coming soon') || lower.includes('demo data')) {
    return {
      status: 'placeholder',
      evidence,
      nextAction: 'Replace placeholder/demo state with internal API + DB storage.'
    };
  }

  return {
    status: 'unknown',
    evidence,
    nextAction: 'Audit manually: check whether page saves to internal API and persists after refresh.'
  };
}

function relatedApiRoutes(href: string, apiRoutes: string[]) {
  const last = href.split('/').filter(Boolean).pop() ?? '';
  if (!last) return [];
  const normalized = last.replace(/-/g, '');
  return apiRoutes.filter((route) => route.replace(/-/g, '').toLowerCase().includes(normalized.toLowerCase()));
}

export async function GET() {
  const appDir = path.join(process.cwd(), 'app');
  const pageFiles = walkFiles(appDir, (file) => /\/page\.(tsx|ts|jsx|js)$/.test(file));
  const routeFiles = walkFiles(appDir, (file) => /\/route\.(tsx|ts|jsx|js)$/.test(file));
  const apiRoutes = routeFiles.map((file) => routeHrefFromRouteFile(appDir, file)).sort();

  const registeredByHref = new Map<string, typeof ADMIN_NAVIGATION_REGISTRY>();
  for (const item of ADMIN_NAVIGATION_REGISTRY) {
    const group = registeredByHref.get(item.href) ?? [];
    group.push(item);
    registeredByHref.set(item.href, group);
  }

  const pages: PageAuditItem[] = pageFiles
    .map((file) => {
      const href = hrefFromPageFile(appDir, file);
      const source = fs.readFileSync(file, 'utf8');
      const routeMatches = relatedApiRoutes(href, apiRoutes);
      const registered = registeredByHref.get(href) ?? [];
      const inferred = inferStatus(source, routeMatches);
      return {
        label: registered[0]?.label ?? titleFromHref(href),
        href,
        pageFile: path.relative(process.cwd(), file).replace(/\\/g, '/'),
        inRegistry: registered.length > 0,
        registeredSurfaces: registered.map((item) => item.surface ?? 'sidebar'),
        apiRoutes: routeMatches,
        status: inferred.status,
        evidence: inferred.evidence,
        nextAction: inferred.nextAction
      };
    })
    .sort((a, b) => a.href.localeCompare(b.href));

  const summary = {
    pages: pages.length,
    apiRoutes: apiRoutes.length,
    registeredNavigationItems: ADMIN_NAVIGATION_REGISTRY.length,
    connected: pages.filter((item) => item.status === 'connected').length,
    partial: pages.filter((item) => item.status === 'partial').length,
    placeholder: pages.filter((item) => item.status === 'placeholder').length,
    unknown: pages.filter((item) => item.status === 'unknown').length,
    notInRegistry: pages.filter((item) => !item.inRegistry && !item.href.startsWith('/api')).length
  };

  const priority = pages.filter((item) => item.status !== 'connected' || !item.inRegistry).slice(0, 80);
  const navValidation = validateAdminNavigationRegistry();

  return NextResponse.json({
    ok: navValidation.ok,
    source: 'internal-core',
    data: {
      summary,
      pages,
      priority,
      apiRoutes,
      navValidation,
      guidance: 'Use this dashboard as the phase checkpoint: page exists, navigation visibility, internal API evidence, DB/API readiness, and next manual action.'
    }
  });
}
