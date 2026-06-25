import { NextResponse } from 'next/server';
import { platformPrisma } from '@/core/db/platform-prisma';
import { getPublicHostedThemeSettings } from '@/core/themes/hosted-theme-editor.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function cleanHost(value: string) {
  return String(value || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '').replace(/^www\./, '');
}
function esc(value: unknown) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
async function tenantIdFromSlug(slug: string) {
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM "Tenant" WHERE slug=$1 OR "defaultSubdomain"=$1 LIMIT 1', slug);
  return rows[0]?.id || slug || 'holo-print';
}
async function domainBinding(hostInput: string) {
  const host = cleanHost(hostInput);
  if (!host) return null;
  const rows = await platformPrisma.$queryRawUnsafe<any[]>('SELECT "tenantId","metadataJson" FROM "CoreCatalogRecord" WHERE resource=$1 AND (slug=$2 OR slug=$3 OR lower("metadataJson"::text) LIKE lower($4)) ORDER BY "updatedAt" DESC LIMIT 1', 'store-domain-bindings', host, `www.${host}`, `%"domain":"${host}"%`);
  const row = rows[0];
  if (!row) return null;
  const meta = row.metadataJson || {};
  return { tenantId: String(row.tenantId || meta.tenantId || ''), channelSlug: String(meta.channelSlug || meta.storeSlug || 'default-store'), host };
}
function sectionHtml(section: any, brand: any) {
  const type = section?.type || 'text-image';
  const title = esc(section?.title || (type === 'hero' ? brand.brandName : 'Section'));
  const subtitle = esc(section?.subtitle || '');
  if (type === 'hero') return `<section class="hero"><div class="wrap"><p class="eyebrow">${esc(section?.eyebrow || brand.brandName || 'Store')}</p><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ''}${section?.buttonLabel ? `<a class="btn" href="${esc(section.buttonHref || '/products')}">${esc(section.buttonLabel)}</a>` : ''}</div></section>`;
  if (type === 'product-grid') { const slugs = Array.isArray(section?.productSlugs) && section.productSlugs.length ? section.productSlugs : ['standard-business-cards', 'a5-leaflets']; return `<section><div class="wrap"><h2>${title}</h2><div class="grid">${slugs.map((slug: string) => `<a class="card" href="/product/${esc(slug)}"><strong>${esc(String(slug).replace(/-/g, ' '))}</strong><span>View product</span></a>`).join('')}</div></div></section>`; }
  if (type === 'contact-cta') return `<section><div class="wrap"><div class="cta"><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div></div></section>`;
  return `<section><div class="wrap"><div class="panel"><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div></div></section>`;
}
export async function GET(request: Request) {
  const url = new URL(request.url);
  const binding = await domainBinding(url.searchParams.get('host') || request.headers.get('host') || '');
  const tenantId = binding?.tenantId || await tenantIdFromSlug(url.searchParams.get('tenantSlug') || 'holo-print');
  const channelSlug = binding?.channelSlug || url.searchParams.get('channelSlug') || 'default-store';
  const data = await getPublicHostedThemeSettings(tenantId, channelSlug);
  const brand = { brandName: 'Print Store', primary: '#18a7d0', accent: '#111827', background: '#ffffff', text: '#111827', ...(data.brand || {}) };
  const sections = Array.isArray(data.sections) ? data.sections.filter((item: any) => item?.enabled !== false) : [];
  const body = sections.length ? sections.map((section: any) => sectionHtml(section, brand)).join('') : sectionHtml({ type: 'hero', title: brand.brandName, subtitle: 'Hosted storefront is ready.' }, brand);
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(brand.brandName)}</title><style>:root{--p:${esc(brand.primary)};--a:${esc(brand.accent)};--bg:${esc(brand.background)};--t:${esc(brand.text)}}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--t);font-family:Inter,Arial,sans-serif}.wrap{max-width:1180px;margin:0 auto;padding:28px 20px}.hero{padding:38px 0;background:linear-gradient(135deg,#f8fafc,#fff)}.hero .wrap,.panel,.card,.cta{border:1px solid #e5e7eb;border-radius:28px;background:#fff;box-shadow:0 18px 44px rgba(15,23,42,.06)}.hero .wrap,.panel,.cta{padding:34px}.eyebrow{text-transform:uppercase;letter-spacing:.18em;font-size:12px;font-weight:800;color:var(--p)}h1{font-size:clamp(38px,6vw,72px);line-height:.98;margin:10px 0 14px;font-weight:900;letter-spacing:-.06em}h2{font-size:30px;margin:0 0 12px;font-weight:900;letter-spacing:-.04em}p{font-size:16px;line-height:1.7;opacity:.75}.btn{display:inline-flex;margin-top:18px;border-radius:999px;background:var(--p);color:#fff;text-decoration:none;font-weight:800;padding:13px 20px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px}.card{display:flex;flex-direction:column;gap:8px;padding:22px;color:var(--t);text-decoration:none;text-transform:capitalize}.card span{font-size:13px;opacity:.65}.cta{background:linear-gradient(135deg,var(--p),var(--a));color:#fff}</style></head><body>${body}</body></html>`;
  return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'x-print-tenant': tenantId, 'x-print-store': channelSlug } });
}
