import { NextResponse } from 'next/server';
import { uploadToDrive } from '@/lib/google-drive';
import { appendReportToSheet } from '@/lib/google-sheets';
import { sendReportEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const metadataStr = formData.get('metadata') as string;
    const photo = formData.get('photo') as File | null;

    if (!metadataStr) {
      throw new Error('Metadata missing');
    }

    const report = JSON.parse(metadataStr);
    let driveLink = 'No Photo';

    console.log('[API] Processing report:', report.id);

    // 1. Upload to Google Drive if photo exists
    if (photo) {
      console.log('[API] Uploading photo to Drive...');
      const photoBlob = new Blob([await photo.arrayBuffer()], { type: photo.type });
      driveLink = await uploadToDrive(photoBlob, `badger-${report.id}.jpg`);
      console.log('[API] Photo uploaded:', driveLink);
    }

    // 2. Append metadata to Google Sheet
    console.log('[API] Appending to Google Sheet...');
    await appendReportToSheet(report, driveLink);
    console.log('[API] Sheet updated successfully');

    // 3. Send Email Notification (best-effort — do not fail the request if email is misconfigured)
    try {
      console.log('[API] Sending email alert...');
      await sendReportEmail(report, driveLink);
      console.log('[API] Email sent successfully');
    } catch (emailError: any) {
      console.warn('[API] Email notification failed (non-fatal):', emailError.message);
    }

    return NextResponse.json({ success: true, message: 'Report processed successfully' });
  } catch (error: any) {
    console.error('[API Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
