export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ tenantSlug: string; slug?: string[] }>;
};

function cleanSegment(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function hostedThemeBaseUrl() {
  return (
    process.env.HOSTED_THEME_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_HOSTED_THEME_URL ||
    'https://hosted-theme.vercel.app'
  ).replace(/\/$/, '');
}

function adminBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_ADMIN_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_PLATFORM_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    'print-admin-teal.vercel.app'
  ).replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export default async function PublicStoreThemeFrame({ params }: PageProps) {
  const { tenantSlug, slug = [] } = await params;
  const storeSlug = cleanSegment(slug[0] || 'default-store') || 'default-store';
  const themePathParts = slug.slice(1).filter(Boolean);
  const themePath = themePathParts.length ? `/${themePathParts.map(encodeURIComponent).join('/')}` : '/';

  const url = new URL(`${hostedThemeBaseUrl()}${themePath}`);
  url.searchParams.set('tenantSlug', cleanSegment(tenantSlug));
  url.searchParams.set('channelSlug', storeSlug);
  url.searchParams.set('storeSlug', storeSlug);
  url.searchParams.set('platformUrl', `https://${adminBaseUrl()}`);

  return (
    <main className="holo-public-theme-frame">
      <iframe
        title={`${tenantSlug} ${storeSlug} hosted storefront`}
        src={url.toString()}
        className="holo-public-theme-frame__iframe"
        allow="payment *; clipboard-read; clipboard-write"
      />
      <style>{`
        html, body { margin: 0 !important; padding: 0 !important; background: #ffffff !important; }
        .holo-public-theme-frame { position: fixed; inset: 0; min-height: 100vh; width: 100vw; overflow: hidden; background: #ffffff; }
        .holo-public-theme-frame__iframe { display: block; width: 100%; height: 100%; min-height: 100vh; border: 0; background: #ffffff; }
      `}</style>
    </main>
  );
}
