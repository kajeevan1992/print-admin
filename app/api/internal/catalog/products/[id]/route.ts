import { handleCatalogItemDelete, handleCatalogItemWrite } from '@/core/catalog/internal-catalog-http';

export const dynamic = 'force-dynamic';

const resource = 'products' as const;

type RouteContext = { params: { id: string } };

export async function PUT(request: Request, context: RouteContext) {
  return handleCatalogItemWrite(request, resource, context.params.id);
}

export async function PATCH(request: Request, context: RouteContext) {
  return handleCatalogItemWrite(request, resource, context.params.id);
}

export async function DELETE(request: Request, context: RouteContext) {
  return handleCatalogItemDelete(request, resource, context.params.id);
}
