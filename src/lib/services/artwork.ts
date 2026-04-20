import { prisma } from '@/lib/prisma';
import type { CreateArtworkRequest } from '@/types/api-dtos';

export async function createArtwork(input: CreateArtworkRequest) {
  return prisma.artwork.create({
    data: {
      tenantId: input.tenantId,
      orderId: input.orderId ?? null,
      productId: input.productId ?? null,
      fileName: input.fileName,
      fileType: input.fileType,
      fileSizeBytes: input.fileSizeBytes ?? null,
      storageKey: input.storageKey ?? null,
      note: input.note ?? null,
    },
  });
}
