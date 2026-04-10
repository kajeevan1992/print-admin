export const dynamic = 'force-dynamic';

import { ThemeDetailPage } from '@/modules/themes/pages/theme-detail-page';

export default function Page({ params }: { params: { id: string } }) {
  return <ThemeDetailPage id={params.id} />;
}
