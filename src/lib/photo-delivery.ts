import type { EmailResult } from './email';

/** Text stored in the sheet Photo column — photos are not persisted server-side. */
export const photoNoteForSheet = (
  reportId: string,
  hasPhoto: boolean,
  email: EmailResult
): string => {
  if (!hasPhoto) return 'No photo';
  if (email.sent) return `See alert email (${reportId})`;
  if (email.skipped) return `Photo not sent — email not configured (${reportId})`;
  return `Photo not sent — email delivery failed (${reportId})`;
};
