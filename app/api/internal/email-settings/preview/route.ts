import { NextResponse } from 'next/server';
import { getEmailSettings, renderArtworkEmailTemplate, type ArtworkEmailTemplateKey } from '@/core/email/email-settings.service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const settings = await getEmailSettings();
    const key = String(body.key || 'artwork-reupload-request') as ArtworkEmailTemplateKey;
    const preview = renderArtworkEmailTemplate(key, {
      customerName: body.customerName || 'Customer',
      orderNumber: body.orderNumber || 'HP-2026-0001',
      productName: body.productName || 'Business Cards',
      fileName: body.fileName || 'artwork.pdf',
      note: body.note || 'Please re-upload with 3mm bleed and embedded fonts.',
      reuploadLink: body.reuploadLink || `${settings.storefrontUrl || 'https://your-storefront.example'}/artwork-reupload/?token=example`,
    }, settings);
    return NextResponse.json({ ok: true, source: 'internal-email-template-preview', data: preview });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to preview email template.' }, { status: 500 });
  }
}
