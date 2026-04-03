import { RoutePlaceholderPage } from '@/components/placeholders/route-placeholder-page';

export default function Page({ params }: { params: { slug: string[] } }) {
  return <RoutePlaceholderPage slug={params.slug} />;
}
