import nodemailer from 'nodemailer';

const EVIDENCE_CID = 'evidence-photo';

export interface ReportPhoto {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

export interface EmailResult {
  sent: boolean;
  skipped: boolean;
}

export const sendReportEmail = async (
  report: {
    id: string;
    timestamp: number;
    location: { latitude: number; longitude: number; accuracyMeters: number };
    suitability: { collectionSuitable: boolean };
    reporter: { name?: string; email?: string; phone?: string };
  },
  photo?: ReportPhoto
): Promise<EmailResult> => {
  const host = process.env.EMAIL_SERVER_HOST;
  const port = parseInt(process.env.EMAIL_SERVER_PORT || '465');
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;
  const from = process.env.EMAIL_FROM;
  const to = process.env.EMAIL_TO;

  if (!host || !user || !pass || !from || !to) {
    console.warn('[Email] Configuration missing, skipping email alert.');
    return { sent: false, skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const photoSection = photo
    ? `<p><strong>Evidence photo:</strong> attached to this message (preview below).</p>
       <p><img src="cid:${EVIDENCE_CID}" alt="Evidence photo" style="max-width:100%;height:auto;border-radius:8px;" /></p>`
    : '<p><strong>Evidence photo:</strong> none submitted.</p>';

  const html = `
    <h1>New Badger Carcass Report</h1>
    <p><strong>Report ID:</strong> ${report.id}</p>
    <p><strong>Timestamp:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
    <p><strong>Location:</strong> ${report.location.latitude}, ${report.location.longitude} (±${report.location.accuracyMeters}m)</p>
    <p><strong>Suitable for Collection:</strong> ${report.suitability.collectionSuitable ? 'Yes' : 'No'}</p>
    <p><strong>Reporter:</strong> ${report.reporter.name || 'Anonymous'} (${report.reporter.email || 'N/A'})</p>
    ${photoSection}
  `;

  const attachments = photo
    ? [
        {
          filename: photo.filename,
          content: photo.buffer,
          contentType: photo.mimeType,
          cid: EVIDENCE_CID,
        },
      ]
    : undefined;

  await transporter.sendMail({
    from,
    to,
    subject: `Badger Report: ${new Date(report.timestamp).toLocaleDateString()} (${report.id})`,
    html,
    attachments,
  });

  return { sent: true, skipped: false };
};
