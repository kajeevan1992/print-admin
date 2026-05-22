import { queueInternalEmail, sendInternalEmail } from '@/core/email/internal-email.service';
import { getEmailSettings, renderArtworkEmailTemplate, type ArtworkEmailTemplateKey } from '@/core/email/email-settings.service';
import type { ArtworkReviewStatus, StoredArtworkUpload } from './internal-artwork-storage';

type ArtworkNotificationInput = {
  action: ArtworkReviewStatus;
  upload: StoredArtworkUpload;
  customerEmail?: string;
  customerName?: string;
  orderNumber?: string;
  productName?: string;
  note?: string;
  sendNow?: boolean;
};

function templateKey(action: ArtworkReviewStatus): ArtworkEmailTemplateKey {
  if (action === 'approved') return 'artwork-approved';
  if (action === 'rejected') return 'artwork-rejected';
  if (action === 'pending-review') return 'artwork-pending-review';
  return 'artwork-pending-review';
}

export async function queueArtworkStatusEmail(input: ArtworkNotificationInput) {
  const settings = await getEmailSettings();
  const to = input.customerEmail || (input.upload as any).customerEmail || '';
  const rendered = renderArtworkEmailTemplate(templateKey(input.action), {
    customerName: input.customerName || (input.upload as any).customerName || 'Customer',
    orderNumber: input.orderNumber || input.upload.orderId || '',
    productName: input.productName || input.upload.productId || '',
    fileName: input.upload.originalName || '',
    note: input.note || input.upload.reviewNote || '',
    reuploadLink: (input.upload as any).reuploadLink || '',
  }, settings);

  if (!rendered.enabled) {
    return { id: `template-disabled-${input.action}`, status: 'template-disabled', to, subject: rendered.subject, body: rendered.body };
  }

  const email = await queueInternalEmail({
    type: `artwork-${input.action}`,
    to,
    subject: rendered.subject,
    body: rendered.body,
    uploadId: input.upload.id,
    orderId: input.upload.orderId,
    quoteId: input.upload.quoteId,
  });
  if (input.sendNow || settings.autoSendArtworkEmails || process.env.ARTWORK_EMAIL_AUTO_SEND === 'true') {
    return sendInternalEmail(email.id);
  }
  return email;
}
