export type ArtworkUploadStatus = 'uploaded' | 'checking' | 'approved' | 'changes-requested';

export type ArtworkUploadRecord = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  uploadedAt: string;
  status: ArtworkUploadStatus;
  note: string;
};

export const artworkUploadSeed: ArtworkUploadRecord[] = [
  {
    id: 'art-1001',
    fileName: 'business-cards-front.pdf',
    fileType: 'PDF',
    fileSize: '2.4 MB',
    uploadedAt: '2026-04-17 10:05',
    status: 'approved',
    note: 'File passed preflight checks and is ready for print.'
  },
  {
    id: 'art-1002',
    fileName: 'flyer-campaign-v2.ai',
    fileType: 'AI',
    fileSize: '7.1 MB',
    uploadedAt: '2026-04-17 11:42',
    status: 'checking',
    note: 'Awaiting artwork review and print-preflight validation.'
  },
  {
    id: 'art-1003',
    fileName: 'mailer-box-dieline.pdf',
    fileType: 'PDF',
    fileSize: '4.8 MB',
    uploadedAt: '2026-04-16 16:20',
    status: 'changes-requested',
    note: 'Bleed and safe zone need adjustment before approval.'
  }
];
