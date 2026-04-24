import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { publicFail, publicJson } from '@/core/api/public-api-routing';
import { deleteWebhookEndpoint, updateWebhookEndpoint, type WebhookEvent } from '@/core/webhooks/webhook.service';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = requirePublicApiCredentials(request, ['webhooks:write']);
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as Partial<{ url: string; events: WebhookEvent[]; status: 'active' | 'paused' }> | null;
  if (!body) return publicFail('INVALID_WEBHOOK_INPUT', 'A JSON body is required.', 400);
  try { const endpoint = updateWebhookEndpoint({ tenantId: auth.context.tenantId, siteId: auth.context.siteId }, params.id, body); if (!endpoint) return publicFail('WEBHOOK_NOT_FOUND', 'Webhook endpoint was not found for this API tenant.', 404); return publicJson(endpoint); }
  catch (error) { return publicFail('INVALID_WEBHOOK_INPUT', error instanceof Error ? error.message : 'Invalid webhook input.', 400); }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = requirePublicApiCredentials(request, ['webhooks:write']);
  if (!auth.ok) return auth.response;
  const deleted = deleteWebhookEndpoint({ tenantId: auth.context.tenantId, siteId: auth.context.siteId }, params.id);
  if (!deleted) return publicFail('WEBHOOK_NOT_FOUND', 'Webhook endpoint was not found for this API tenant.', 404);
  return publicJson({ deleted: true });
}
