import { NextResponse } from 'next/server';
import { platformPrisma } from '@/core/db/platform-prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = {
  params: Promise<{ themeKey: string; slug?: string[] }>;
};

const KNOWN_UPLOADED_THEME_SOURCES: Record<string, string> = {
  'atlantis-print-hosted': 'https://hosted-theme.vercel.app',
};

function cleanSegment(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function firstUrl(...values: any[]) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (/^https?:\/\//i.test(text)) return text.replace(/\/$/, '');
  }
  return '';
}

function adminBaseUrl(request: Request) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || process.env.VERCEL_URL || 'print-admin-teal.vercel.app';
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  return `${proto}://${host.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
}

function sourceUrlFromMeta(meta: Record<string, any>) {
  const manifest = meta.manifest && typeof meta.manifest === 'object' ? meta.manifest : {};
  const upload = meta.upload && typeof meta.upload === 'object' ? meta.upload : {};
  return firstUrl(
    meta.uploadedThemeSourceUrl,
    meta.uploadedSourceUrl,
    meta.sourceUrl,
    meta.originalThemeUrl,
    meta.originalRendererUrl,
    meta.packageUrl,
    meta.staticUrl,
    manifest.uploadedThemeSourceUrl,
    manifest.uploadedSourceUrl,
    manifest.sourceUrl,
    manifest.originalThemeUrl,
    manifest.originalRendererUrl,
    manifest.packageUrl,
    manifest.staticUrl,
    upload.sourceUrl,
    upload.publicUrl,
  );
}

async function resolveThemeSource(themeKey: string) {
  try {
    const rows = await platformPrisma.$queryRawUnsafe<Array<{ metadataJson: any }>>(
      'SELECT "metadataJson" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND resource=$2 AND slug=$3 LIMIT 1',
      'platform',
      'platform-themes',
      themeKey,
    );
    const meta = rows[0]?.metadataJson || {};
    const source = sourceUrlFromMeta(meta);
    if (source) return source;
  } catch {
    // Fall through to known uploaded source mapping.
  }
  return KNOWN_UPLOADED_THEME_SOURCES[themeKey] || '';
}

function rewriteHtml(html: string, sourceBase: string, request: Request, themeKey: string, themePath: string) {
  const source = new URL(sourceBase);
  const origin = source.origin;
  const platformUrl = adminBaseUrl(request);
  const url = new URL(request.url);
  const tenantSlug = url.searchParams.get('tenantSlug') || '';
  const tenantId = url.searchParams.get('tenantId') || '';
  const channelSlug = url.searchParams.get('channelSlug') || url.searchParams.get('storeSlug') || 'default-store';

  let next = html
    .replace(/(src|href)="\/(assets\/[^"#?]+(?:\?[^"#]*)?)/g, `$1="${origin}/$2`)
    .replace(/(src|href)="\/(images\/[^"#?]+(?:\?[^"#]*)?)/g, `$1="${origin}/$2`)
    .replace(/(src|href)="\/(favicon[^"#?]*|site\.webmanifest|manifest\.json)/g, `$1="${origin}/$2`);

  const bridge = `
<script id="print-admin-uploaded-theme-context">
(function(){
  window.__PRINT_ADMIN_UPLOADED_THEME__ = true;
  window.__PRINT_ADMIN_THEME_KEY__ = ${JSON.stringify(themeKey)};
  window.__PRINT_ADMIN_THEME_PATH__ = ${JSON.stringify(themePath)};
  window.__STORE_FRONT_INTERNAL_BASE_URL__ = ${JSON.stringify(platformUrl)};
  window.__SAAS_INTERNAL_BASE_URL__ = ${JSON.stringify(platformUrl)};
  window.__HOLO_TENANT_SLUG = ${JSON.stringify(tenantSlug)};
  window.__HOLO_TENANT_ID = ${JSON.stringify(tenantId)};
  window.__HOLO_CHANNEL_SLUG = ${JSON.stringify(channelSlug)};
  var targetPath = ${JSON.stringify(themePath)} || '/';
  if (targetPath !== '/' && window.location.pathname !== targetPath) {
    try { window.history.replaceState({}, '', targetPath + window.location.search); } catch (e) {}
  }
  function postPath(path) {
    try {
      var text = String(path || window.location.pathname || '/');
      if (text.charAt(0) !== '/') text = '/' + text;
      window.parent && window.parent.postMessage({ type: 'holo-storefront:navigate', path: text }, '*');
    } catch (e) {}
  }
  var push = history.pushState;
  var replace = history.replaceState;
  history.pushState = function(){ var result = push.apply(this, arguments); postPath(arguments[2] || location.pathname); return result; };
  history.replaceState = function(){ var result = replace.apply(this, arguments); postPath(arguments[2] || location.pathname); return result; };
  window.addEventListener('popstate', function(){ postPath(location.pathname); });
  setTimeout(function(){ postPath(location.pathname); }, 300);
})();
</script>`;

  if (next.includes('</head>')) return next.replace('</head>', `${bridge}</head>`);
  return `${bridge}${next}`;
}

export async function GET(request: Request, { params }: Params) {
  const { themeKey: rawThemeKey, slug = [] } = await params;
  const themeKey = cleanSegment(rawThemeKey);
  const sourceBase = await resolveThemeSource(themeKey);

  if (!themeKey || !sourceBase) {
    return new NextResponse('Uploaded theme source is not configured for this theme.', { status: 404 });
  }

  const themePath = slug.length ? `/${slug.map(encodeURIComponent).join('/')}` : '/';
  const sourceUrl = new URL(`${sourceBase}${themePath}`);
  const upstream = await fetch(sourceUrl.toString(), { cache: 'no-store' });
  const contentType = upstream.headers.get('content-type') || '';
  const body = await upstream.text();

  if (!contentType.includes('text/html')) {
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        'content-type': contentType || 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }

  return new NextResponse(rewriteHtml(body, sourceBase, request, themeKey, themePath), {
    status: upstream.status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
