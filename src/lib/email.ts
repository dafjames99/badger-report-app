import 'server-only';

import nodemailer from 'nodemailer';
import {
  buildReportEmailHtml,
  photoAttachments,
  type EmailTemplateId,
  type ReportEmailData,
  type ReportPhoto,
} from './email-templates';

export type { ReportPhoto } from './email-templates';

export interface EmailResult {
  sent: boolean;
  skipped: boolean;
}

const DEFAULT_TEMPLATE: EmailTemplateId = 'table';

function resolveTemplate(): EmailTemplateId {
  const fromEnv = process.env.EMAIL_TEMPLATE;
  if (fromEnv === 'table' || fromEnv === 'card' || fromEnv === 'classic') {
    return fromEnv;
  }
  return DEFAULT_TEMPLATE;
}

export const sendReportEmail = async (
  report: ReportEmailData,
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

  const template = resolveTemplate();
  const hasPhoto = Boolean(photo);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const html = buildReportEmailHtml(report, template, hasPhoto);

  await transporter.sendMail({
    from,
    to,
    subject: `Badger Report: ${new Date(report.timestamp).toLocaleDateString()} (${report.id})`,
    html,
    attachments: photoAttachments(photo),
  });

  return { sent: true, skipped: false };
};
