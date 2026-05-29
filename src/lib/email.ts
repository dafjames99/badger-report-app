import nodemailer from 'nodemailer';

export const sendReportEmail = async (report: any, driveLink: string) => {
  const host = process.env.EMAIL_SERVER_HOST;
  const port = parseInt(process.env.EMAIL_SERVER_PORT || '465');
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;
  const from = process.env.EMAIL_FROM;
  const to = process.env.EMAIL_TO;

  if (!host || !user || !pass || !from || !to) {
    console.warn('[Email] Configuration missing, skipping email alert.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const html = `
    <h1>New Badger Carcass Report</h1>
    <p><strong>Timestamp:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
    <p><strong>Location:</strong> ${report.location.latitude}, ${report.location.longitude} (±${report.location.accuracyMeters}m)</p>
    <p><strong>Suitable for Collection:</strong> ${report.suitability.collectionSuitable ? 'Yes' : 'No'}</p>
    <p><strong>Reporter:</strong> ${report.reporter.name || 'Anonymous'} (${report.reporter.email || 'N/A'})</p>
    <p><strong>Evidence Photo:</strong> <a href="${driveLink}">${driveLink}</a></p>
  `;

  await transporter.sendMail({
    from,
    to,
    subject: `Badger Report: ${new Date(report.timestamp).toLocaleDateString()}`,
    html,
  });
};
