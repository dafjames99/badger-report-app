import { NextResponse } from 'next/server';
import { appendReportToSheet } from '@/lib/google-sheets';
import { sendReportEmail, type ReportPhoto } from '@/lib/email';
import { photoNoteForSheet } from '@/lib/photo-delivery';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const metadataStr = formData.get('metadata') as string;
    const photo = formData.get('photo') as File | null;

    if (!metadataStr) {
      throw new Error('Metadata missing');
    }

    const report = JSON.parse(metadataStr);
    const hasPhoto = Boolean(photo && photo.size > 0);

    console.log('[API] Processing report:', report.id);

    let emailPhoto: ReportPhoto | undefined;
    if (hasPhoto && photo) {
      emailPhoto = {
        buffer: Buffer.from(await photo.arrayBuffer()),
        filename: `badger-${report.id}.jpg`,
        mimeType: photo.type || 'image/jpeg',
      };
    }

    // 1. Email alert (inline preview + attachment when a photo was submitted)
    let emailResult = { sent: false, skipped: true };
    try {
      console.log('[API] Sending email alert...');
      emailResult = await sendReportEmail(report, emailPhoto);
      if (emailResult.sent) {
        console.log('[API] Email sent successfully');
      } else if (emailResult.skipped) {
        console.warn('[API] Email skipped — not configured');
      }
    } catch (emailError: unknown) {
      const message = emailError instanceof Error ? emailError.message : String(emailError);
      console.warn('[API] Email notification failed (non-fatal):', message);
      emailResult = { sent: false, skipped: false };
    }

    const photoNote = photoNoteForSheet(report.id, hasPhoto, emailResult);

    // 2. Append metadata to Google Sheet (photo column is descriptive text only)
    console.log('[API] Appending to Google Sheet...');
    await appendReportToSheet(report, photoNote);
    console.log('[API] Sheet updated successfully');

    return NextResponse.json({ success: true, message: 'Report processed successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[API Error]:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
