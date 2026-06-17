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

function resolveSheetUrl(): string | undefined {
  const explicit = process.env.GOOGLE_SHEET_URL;
  if (explicit) return explicit;

  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (sheetId) return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;

  return undefined;
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
  const testTo = process.env.TEST_EMAIL_TO;

  const isTest = report.reporter?.email === 'test@test.test';
  // Test reports go only to TEST_EMAIL_TO; production reports go to both.
  const recipients = isTest
    ? testTo
    : [to, testTo].filter(Boolean).join(',');

  if (!host || !user || !pass || !from || !recipients) {
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

  const html = buildReportEmailHtml(report, template, hasPhoto, resolveSheetUrl());

  await transporter.sendMail({
    from,
    to: recipients,
    subject: `Badger Report: ${new Date(report.timestamp).toLocaleDateString("en-GB", {"timeZone": "Europe/London"})} (${report.id})`,
    html,
    attachments: photoAttachments(photo),
  });

  return { sent: true, skipped: false };
};
