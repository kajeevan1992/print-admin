import { NextResponse } from 'next/server';
import { platformPrisma } from '@/core/db/platform-prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ tenantSlug: string; slug?: string[] }> };
type StoreMatch = { tenantId: string; metadataJson: Record<string, any> };

const KNOWN_THEME_SOURCES: Record<string, string> = { 'atlantis-print-hosted': 'https://hosted-theme.vercel.app' };
const STORE_RESOURCES = ['store-channels', 'hosted-theme-settings', 'store-domain-bindings', 'storefront-stores', 'storefront-store', 'store-channel', 'tenant-stores'];

function clean(value: string) { return String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function uniq(values: string[]) { return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean))); }
function tenantCandidates(input: string) { const slug = clean(input); const list = [slug, slug ? `tenant-${slug}` : '']; if (slug === 'holo-print-sidcup') list.push('holo-print', 'tenant-holo-print'); return list; }
function firstUrl(...values: any[]) { for (const value of values) { const text = String(value || '').trim(); if (/^https?:\/\//i.test(text)) return text.replace(/\/$/, ''); } return ''; }
function selectedThemeKey(meta: Record<string, any>) { return clean(String(meta.themeKey || meta.themeId || meta.selectedThemeKey || meta.selectedThemeId || meta.theme || 'atlantis-print-hosted')); }
function sourceUrlFromMeta(meta: Record<string, any>) { const manifest = meta.manifest && typeof meta.manifest === 'object' ? meta.manifest : {}; const upload = meta.upload && typeof meta.upload === 'object' ? meta.upload : {}; return firstUrl(meta.uploadedThemeSourceUrl, meta.uploadedSourceUrl, meta.sourceUrl, meta.originalThemeUrl, meta.originalRendererUrl, meta.packageUrl, meta.staticUrl, manifest.uploadedThemeSourceUrl, manifest.uploadedSourceUrl, manifest.sourceUrl, manifest.originalThemeUrl, manifest.originalRendererUrl, manifest.packageUrl, manifest.staticUrl, upload.sourceUrl, upload.publicUrl); }

async function tenantIds(tenantSlugInput: string) {
  const baseCandidates = tenantCandidates(tenantSlugInput);
  const tenantSlug = clean(tenantSlugInput);
  try {
    const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug?: string; defaultSubdomain?: string }>>('SELECT id,slug,"defaultSubdomain" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1', tenantSlug);
    const row = rows[0];
    return uniq([...baseCandidates, row?.id || '', row?.slug || '', row?.defaultSubdomain || '']);
  } catch { return uniq(baseCandidates); }
}

async function findStore(ids: string[], storeSlug: string): Promise<StoreMatch | null> {
  for (const tenantId of ids) {
    for (const resource of STORE_RESOURCES) {
      try {
        const rows = await platformPrisma.$queryRawUnsafe<Array<{ tenantId: string; metadataJson: any }>>('SELECT "tenantId","metadataJson" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND slug=$2 AND resource=$3 LIMIT 1', tenantId, storeSlug, resource);
        if (rows[0]?.tenantId) return { tenantId: rows[0].tenantId || tenantId, metadataJson: rows[0].metadataJson || {} };
      } catch {}
    }
  }
  if (storeSlug === 'default-store' && ids[0]) return { tenantId: ids[0], metadataJson: { slug: 'default-store', themeKey: 'atlantis-print-hosted' } };
  return null;
}

async function resolveThemeSource(themeKey: string) {
  try {
    const rows = await platformPrisma.$queryRawUnsafe<Array<{ metadataJson: any }>>('SELECT "metadataJson" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND resource=$2 AND slug=$3 LIMIT 1', 'platform', 'platform-themes', themeKey);
    const source = sourceUrlFromMeta(rows[0]?.metadataJson || {});
    if (source) return source;
  } catch {}
  return KNOWN_THEME_SOURCES[themeKey] || '';
}

function normaliseMenuItem(raw: any, index: number) {
  const label = String(raw?.label || raw?.name || raw?.title || raw?.path || `Menu ${index + 1}`);
  const path = String(raw?.path || raw?.href || raw?.url || '/');
  return { ...raw, id: String(raw?.id || raw?.slug || label), slug: clean(String(raw?.slug || label)), label, path: path.startsWith('/') || /^https?:|mailto:|tel:/i.test(path) ? path : `/${path}`, enabled: raw?.enabled !== false && raw?.status !== 'hidden' && raw?.status !== 'disabled', order: Number(raw?.order || raw?.sortOrder || index + 1), parentId: String(raw?.parentId || raw?.parent || raw?.parentKey || ''), parentSlug: clean(String(raw?.parentSlug || raw?.parentLabel || '')), description: String(raw?.description || ''), imageUrl: String(raw?.imageUrl || raw?.image || '') };
}

async function loadMenuItems(ids: string[]) {
  for (const tenantId of ids) {
    try {
      const rows = await platformPrisma.$queryRawUnsafe<Array<{ metadataJson: any }>>('SELECT "metadataJson" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND resource=$2 AND slug=$3 LIMIT 1', tenantId, 'admin-config', 'storefront-menu-builder');
      const items = Array.isArray(rows[0]?.metadataJson?.items) ? rows[0].metadataJson.items.map(normaliseMenuItem).filter((item: any) => item.enabled && item.label && item.path).sort((a: any, b: any) => a.order - b.order) : [];
      if (items.length) return items;
    } catch {}
  }
  return [];
}

function contentTypeFor(pathname: string, upstreamType: string) { if (upstreamType) return upstreamType; if (pathname.endsWith('.js')) return 'application/javascript; charset=utf-8'; if (pathname.endsWith('.css')) return 'text/css; charset=utf-8'; if (pathname.endsWith('.svg')) return 'image/svg+xml'; if (pathname.endsWith('.png')) return 'image/png'; if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'image/jpeg'; if (pathname.endsWith('.webp')) return 'image/webp'; return 'application/octet-stream'; }
function rewriteJavaScript(js: string) { return js.replace(/window\.location\.pathname/g, '(window.__PRINT_ADMIN_THEME_PATH__||window.location.pathname)').replace(/(?<!window\.)location\.pathname/g, '(window.__PRINT_ADMIN_THEME_PATH__||location.pathname)'); }
function rewriteCss(css: string, storeBase: string) { return css.replace(/url\(\/images\//g, `url(${storeBase}/__theme-assets/images/`).replace(/url\(\/assets\//g, `url(${storeBase}/__theme-assets/assets/`); }

function rewriteHtml(html: string, storeBase: string, themePath: string, tenantSlug: string, tenantId: string, channelSlug: string, menuItems: any[]) {
  const bridgeParams = new URLSearchParams({ tenantSlug, tenantId, channelSlug });
  const menuJson = JSON.stringify(menuItems).replace(/</g, '\\u003c');
  const next = html.replace(/(src|href)="\/(assets\/[^"#?]+(?:\?[^"#]*)?)/g, `$1="${storeBase}/__theme-assets/$2`).replace(/(src|href)="\/(images\/[^"#?]+(?:\?[^"#]*)?)/g, `$1="${storeBase}/__theme-assets/$2`).replace(/(src|href)="\/(favicon[^"#?]*|site\.webmanifest|manifest\.json)/g, `$1="${storeBase}/__theme-assets/$2`).replace(/(src|href)="(https?:\/\/[^"/]+)?\/(assets\/[^"#?]+(?:\?[^"#]*)?)/g, `$1="${storeBase}/__theme-assets/$3`).replace(/(src|href)="(https?:\/\/[^"/]+)?\/(images\/[^"#?]+(?:\?[^"#]*)?)/g, `$1="${storeBase}/__theme-assets/$3`);

  const boot = `
<style id="print-admin-no-old-nav">header nav{visibility:hidden!important}header nav[data-pa-menu-labels]{visibility:visible!important}</style>
<script id="print-admin-store-runtime">
(function(){
  var STORE_BASE=${JSON.stringify(storeBase)};
  var THEME_PATH=${JSON.stringify(themePath)};
  window.__PRINT_ADMIN_MENU_ITEMS__=${menuJson};
  window.__PRINT_ADMIN_STORE_BASE__=STORE_BASE;
  window.__PRINT_ADMIN_THEME_PATH__=THEME_PATH;
  window.__HOLO_TENANT_SLUG=${JSON.stringify(tenantSlug)};
  window.__HOLO_TENANT_ID=${JSON.stringify(tenantId)};
  window.__HOLO_CHANNEL_SLUG=${JSON.stringify(channelSlug)};
  function normalise(path){var text=String(path||'/');try{if(/^https?:\/\//i.test(text))text=new URL(text).pathname||'/';}catch(e){}if(text.charAt(0)!=='/')text='/'+text;return text;}
  function toThemePath(path){var text=normalise(path);return text.indexOf(STORE_BASE)===0?(text.slice(STORE_BASE.length)||'/'):text;}
  function toStorePath(path){var text=normalise(path);if(text.indexOf(STORE_BASE)===0)return text;return text==='/'?STORE_BASE:STORE_BASE+text;}
  function sync(){window.__PRINT_ADMIN_THEME_PATH__=toThemePath(location.pathname);}
  var push=history.pushState;var replace=history.replaceState;
  history.pushState=function(state,title,url){var next=url==null?url:toStorePath(url);var result=push.call(this,state,title,next);sync();return result;};
  history.replaceState=function(state,title,url){var next=url==null?url:toStorePath(url);var result=replace.call(this,state,title,next);sync();return result;};
  addEventListener('popstate',sync);sync();
})();
</script>
<script src="/api/internal/storefront/theme-menu-fast" defer></script>
<script src="/api/internal/storefront/theme-menu-bridge?${bridgeParams.toString()}" defer></script>`;
  return next.includes('</head>') ? next.replace('</head>', `${boot}</head>`) : `${boot}${next}`;
}

export async function GET(request: Request, { params }: Params) {
  const { tenantSlug, slug = [] } = await params;
  const cleanTenantSlug = clean(tenantSlug);
  const storeSlug = clean(slug[0] || '');
  if (!cleanTenantSlug || !storeSlug) return new NextResponse('Not found', { status: 404 });
  const ids = await tenantIds(cleanTenantSlug);
  const store = await findStore(ids, storeSlug);
  if (!store) return new NextResponse('Store not found', { status: 404 });
  const themeKey = selectedThemeKey(store.metadataJson || {});
  const sourceBase = await resolveThemeSource(themeKey);
  if (!sourceBase) return new NextResponse(`Uploaded theme source is not configured for ${themeKey}.`, { status: 404 });
  const rest = slug.slice(1).filter(Boolean);
  const storeBase = `/stores/${cleanTenantSlug}/${storeSlug}`;
  const isAsset = rest[0] === '__theme-assets';
  const sourcePath = isAsset ? `/${rest.slice(1).map(encodeURIComponent).join('/')}` : (rest.length ? `/${rest.map(encodeURIComponent).join('/')}` : '/');
  const themePath = isAsset ? '/' : sourcePath;
  const sourceUrl = new URL(`${sourceBase}${sourcePath}`);
  const upstream = await fetch(sourceUrl.toString(), { cache: 'no-store' });
  const upstreamType = upstream.headers.get('content-type') || '';
  const finalType = contentTypeFor(sourcePath, upstreamType);
  if (isAsset) {
    if (finalType.includes('javascript') || sourcePath.endsWith('.js')) return new NextResponse(rewriteJavaScript(await upstream.text()), { status: upstream.status, headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store' } });
    if (finalType.includes('text/css') || sourcePath.endsWith('.css')) return new NextResponse(rewriteCss(await upstream.text(), storeBase), { status: upstream.status, headers: { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'no-store' } });
    return new NextResponse(await upstream.arrayBuffer(), { status: upstream.status, headers: { 'content-type': finalType, 'cache-control': 'public, max-age=300' } });
  }
  const html = await upstream.text();
  if (!finalType.includes('text/html')) return new NextResponse(html, { status: upstream.status, headers: { 'content-type': finalType, 'cache-control': 'no-store' } });
  const menuItems = await loadMenuItems(ids);
  return new NextResponse(rewriteHtml(html, storeBase, themePath, cleanTenantSlug, store.tenantId || ids[0] || cleanTenantSlug, storeSlug, menuItems), { status: upstream.status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
