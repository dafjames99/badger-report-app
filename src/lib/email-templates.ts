const EVIDENCE_CID = 'evidence-photo';

export type EmailTemplateId = 'classic' | 'table' | 'card';

export interface ReportEmailData {
  id: string;
  timestamp: number;
  location: { latitude: number; longitude: number; accuracyMeters: number };
  suitability: { collectionSuitable: boolean };
  reporter: { name?: string; email?: string; phone?: string };
  extraInformation?: string;
}

export interface ReportPhoto {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatExtraInformation(extraInformation?: string): string {
  if (!extraInformation?.trim()) return 'None provided.';
  return escapeHtml(extraInformation.trim()).replace(/\n/g, '<br />');
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function formatLocation(location: ReportEmailData['location']): string {
  return `${location.latitude}, ${location.longitude} (±${location.accuracyMeters}m)`;
}

function formatReporter(reporter: ReportEmailData['reporter']): string {
  return `${reporter.name || 'Anonymous'} (${reporter.email || 'N/A'})`;
}

function mapLink(location: ReportEmailData['location']): string {
  const { latitude, longitude } = location;
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

function photoSectionClassic(hasPhoto: boolean): string {
  if (hasPhoto) {
    return `<p><strong>Evidence photo:</strong> attached to this message (preview below).</p>
       <p><img src="cid:${EVIDENCE_CID}" alt="Evidence photo" style="max-width:100%;height:auto;border-radius:8px;" /></p>`;
  }
  return '<p><strong>Evidence photo:</strong> none submitted.</p>';
}

function photoSectionTable(hasPhoto: boolean): string {
  if (hasPhoto) {
    return `<tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;vertical-align:top;">Evidence photo</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">
          Attached (preview below)<br />
          <img src="cid:${EVIDENCE_CID}" alt="Evidence photo" style="max-width:100%;height:auto;border-radius:8px;margin-top:8px;" />
        </td>
      </tr>`;
  }
  return `<tr>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Evidence photo</td>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;">None submitted</td>
    </tr>`;
}

function photoSectionCard(hasPhoto: boolean): string {
  if (hasPhoto) {
    return `<div style="margin:0 0 20px;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <img src="cid:${EVIDENCE_CID}" alt="Evidence photo" style="display:block;width:100%;height:auto;" />
        <p style="margin:0;padding:10px 14px;font-size:12px;color:#6b7280;background:#f9fafb;">Evidence photo attached</p>
      </div>`;
  }
  return `<div style="margin:0 0 20px;padding:14px;border-radius:12px;background:#f9fafb;border:1px dashed #d1d5db;color:#6b7280;font-size:14px;">
      No evidence photo submitted
    </div>`;
}

function buildClassicTemplate(report: ReportEmailData, hasPhoto: boolean): string {
  return `
    <h1>New Badger Report</h1>
    <p><strong>Report ID:</strong> ${report.id}</p>
    <p><strong>Timestamp:</strong> ${formatTimestamp(report.timestamp)}</p>
    <p><strong>Location:</strong> ${formatLocation(report.location)}</p>
    <p><strong>Suitable for Collection:</strong> ${report.suitability.collectionSuitable ? 'Yes' : 'No'}</p>
    <p><strong>Reporter:</strong> ${formatReporter(report.reporter)}</p>
    <p><strong>Extra information:</strong> ${formatExtraInformation(report.extraInformation)}</p>
    ${photoSectionClassic(hasPhoto)}
  `;
}

function buildTableTemplate(report: ReportEmailData, hasPhoto: boolean): string {
  const suitable = report.suitability.collectionSuitable;
  return `
    <h1 style="font-family:Arial,sans-serif;font-size:22px;margin:0 0 16px;">New Badger Report</h1>
    <table style="border-collapse:collapse;width:100%;max-width:640px;font-family:Arial,sans-serif;font-size:14px;color:#111827;">
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;width:34%;">Report ID</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-family:monospace;">${report.id}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Timestamp</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">${formatTimestamp(report.timestamp)}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Location</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">
          ${formatLocation(report.location)}<br />
          <a href="${mapLink(report.location)}" style="color:#2563eb;">Open in Google Maps</a>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Suitable for collection</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">
          <span style="display:inline-block;padding:2px 10px;border-radius:999px;font-weight:600;color:${suitable ? '#065f46' : '#991b1b'};background:${suitable ? '#d1fae5' : '#fee2e2'};">
            ${suitable ? 'Yes' : 'No'}
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Reporter</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">${formatReporter(report.reporter)}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;vertical-align:top;">Extra information</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">${formatExtraInformation(report.extraInformation)}</td>
      </tr>
      ${photoSectionTable(hasPhoto)}
    </table>
  `;
}

function buildCardTemplate(report: ReportEmailData, hasPhoto: boolean): string {
  const suitable = report.suitability.collectionSuitable;
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;color:#111827;">
      <div style="padding:18px 20px;border-radius:12px 12px 0 0;background:linear-gradient(135deg,#1d4ed8,#059669);color:#ffffff;">
        <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">WVSC Badger Report</p>
        <h1 style="margin:0;font-size:24px;">New report received</h1>
        <p style="margin:8px 0 0;font-size:14px;opacity:0.95;">${formatTimestamp(report.timestamp)} · ID ${report.id}</p>
      </div>
      <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;background:#ffffff;">
        ${photoSectionCard(hasPhoto)}
        <div style="display:block;margin-bottom:16px;">
          <span style="display:inline-block;padding:6px 12px;border-radius:999px;font-size:13px;font-weight:700;color:${suitable ? '#065f46' : '#991b1b'};background:${suitable ? '#d1fae5' : '#fee2e2'};">
            ${suitable ? 'Suitable for collection' : 'Not suitable for collection'}
          </span>
        </div>
        <div style="margin-bottom:14px;padding:14px;border-radius:10px;background:#f9fafb;border:1px solid #e5e7eb;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">Location</p>
          <p style="margin:0 0 6px;font-size:16px;font-weight:600;">${formatLocation(report.location)}</p>
          <p style="margin:0;"><a href="${mapLink(report.location)}" style="color:#2563eb;font-size:14px;">View on map →</a></p>
        </div>
        <div style="margin-bottom:14px;padding:14px;border-radius:10px;border:1px solid #e5e7eb;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">Reporter</p>
          <p style="margin:0;font-size:15px;">${formatReporter(report.reporter)}</p>
        </div>
        <div style="padding:14px;border-radius:10px;border:1px solid #e5e7eb;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">Extra Information</p>
          <p style="margin:0;font-size:15px;line-height:1.5;">${formatExtraInformation(report.extraInformation)}</p>
        </div>
      </div>
    </div>
  `;
}

export function buildReportEmailHtml(
  report: ReportEmailData,
  template: EmailTemplateId,
  hasPhoto: boolean
): string {
  switch (template) {
    case 'table':
      return buildTableTemplate(report, hasPhoto);
    case 'card':
      return buildCardTemplate(report, hasPhoto);
    case 'classic':
    default:
      return buildClassicTemplate(report, hasPhoto);
  }
}

export function photoAttachments(photo?: ReportPhoto) {
  if (!photo) return undefined;

  return [
    {
      filename: photo.filename,
      content: photo.buffer,
      contentType: photo.mimeType,
      cid: EVIDENCE_CID,
    },
  ];
}

export { EVIDENCE_CID };
