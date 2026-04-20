import { fail, ok } from '@/lib/api/responses';
import { createArtwork } from '@/lib/services/artwork';
import type { CreateArtworkRequest } from '@/types/api-dtos';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CreateArtworkRequest | null;

  if (!body?.tenantId || !body?.fileName || !body?.fileType) {
    return fail('INVALID_ARTWORK_INPUT', 'tenantId, fileName, and fileType are required.', 400);
  }

  const artwork = await createArtwork(body);

  return ok({
    id: artwork.id,
    tenantId: artwork.tenantId,
    status: artwork.status,
    fileName: artwork.fileName,
    fileType: artwork.fileType,
    fileSizeBytes: artwork.fileSizeBytes,
  });
}
