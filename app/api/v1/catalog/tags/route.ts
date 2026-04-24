import { publicCatalogList } from '@/core/api/public-api-routing';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return publicCatalogList(request, 'tags');
}
