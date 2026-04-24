import { handleCatalogDelete, handleCatalogGet, handleCatalogWrite } from '@/core/catalog/internal-catalog-http';

export const dynamic = 'force-dynamic';

const resource = 'production-routing-rules' as const;

export async function GET(request: Request) {
  return handleCatalogGet(request, resource);
}

export async function POST(request: Request) {
  return handleCatalogWrite(request, resource);
}

export async function PUT(request: Request) {
  return handleCatalogWrite(request, resource);
}

export async function PATCH(request: Request) {
  return handleCatalogWrite(request, resource);
}

export async function DELETE(request: Request) {
  return handleCatalogDelete(request, resource);
}
