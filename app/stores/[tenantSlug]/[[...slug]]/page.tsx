export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ tenantSlug: string; slug?: string[] }> };

function buildHostedThemeUrl(slug: string[] = []) {
  const path = slug.slice(1).filter(Boolean).join('/');
  return path ? `https://hosted-theme.vercel.app/${path}` : 'https://hosted-theme.vercel.app/';
}

export default async function PublicStorePage({ params }: PageProps) {
  const { slug = [] } = await params;
  const src = buildHostedThemeUrl(slug);
  return (
    <main style={{ margin: 0, padding: 0, width: '100vw', minHeight: '100vh', background: '#fff', overflow: 'hidden' }}>
      <iframe
        src={src}
        title="Holo Print Storefront"
        style={{ width: '100vw', height: '100vh', border: 0, display: 'block', background: '#fff' }}
        loading="eager"
      />
    </main>
  );
}
