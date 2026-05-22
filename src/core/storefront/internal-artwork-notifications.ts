import { queueInternalEmail, sendInternalEmail } from '@/core/email/internal-email.service';
import type { ArtworkReviewStatus, StoredArtworkUpload } from './internal-artwork-storage';

type ArtworkNotificationInput = {
  action: ArtworkReviewStatus;
  upload: StoredArtworkUpload;
  customerEmail?: string;
  customerName?: string;
  orderNumber?: string;
  note?: string;
  sendNow?: boolean;
};

function customerLine(name?: string) {
  return `Hello${name ? ` ${name}` : ''},`;
}

function subjectFor(action: ArtworkReviewStatus, orderNumber?: string) {
  const suffix = orderNumber ? ` for order ${orderNumber}` : '';
  if (action === 'approved') return `Artwork approved${suffix}`;
  if (action === 'rejected') return `Artwork rejected${suffix}`;
  if (action === 'pending-review') return `Artwork received and pending review${suffix}`;
  return `Artwork update${suffix}`;
}

function bodyFor(action: ArtworkReviewStatus, input: ArtworkNotificationInput) {
  const file = input.upload.originalName || 'your artwork';
  const note = input.note || input.upload.reviewNote || '';
  if (action === 'approved') {
    return [
      customerLine(input.customerName),
      '',
      `Good news — your artwork (${file}) has been approved for production.`,
      '',
      'Our team will now continue with the next production step.',
      '',
      'Thank you.',
    ].join('\n');
  }
  if (action === 'rejected') {
    return [
      customerLine(input.customerName),
      '',
      `We have reviewed your artwork (${file}) and it has been rejected for production.`,
      note ? `Reason: ${note}` : '',
      '',
      'Please contact us or wait for a replacement upload link if one has not already been sent.',
      '',
      'Thank you.',
    ].filter((line) => line !== '').join('\n');
  }
  return [
    customerLine(input.customerName),
    '',
    `Your replacement artwork (${file}) has been received and is now pending review.`,
    '',
    'We will check the file before production continues.',
    '',
    'Thank you.',
  ].join('\n');
}

export async function queueArtworkStatusEmail(input: ArtworkNotificationInput) {
  const to = input.customerEmail || (input.upload as any).customerEmail || '';
  const email = await queueInternalEmail({
    type: `artwork-${input.action}`,
    to,
    subject: subjectFor(input.action, input.orderNumber),
    body: bodyFor(input.action, input),
    uploadId: input.upload.id,
    orderId: input.upload.orderId,
    quoteId: input.upload.quoteId,
  });
  if (input.sendNow || process.env.ARTWORK_EMAIL_AUTO_SEND === 'true') {
    return sendInternalEmail(email.id);
  }
  return email;
}
