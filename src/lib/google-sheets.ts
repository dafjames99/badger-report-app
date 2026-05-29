import { google } from 'googleapis';
import { getGoogleAuth } from './google-auth';

export const appendReportToSheet = async (report: any, driveLink: string) => {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID missing in environment');
  }

  try {
    // 1. Get spreadsheet metadata to find the first sheet name
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetName = spreadsheet.data.sheets?.[0]?.properties?.title || 'Sheet1';

    const values = [
      [
        new Date(report.timestamp).toISOString(),
        report.location.latitude,
        report.location.longitude,
        report.location.accuracyMeters,
        report.suitability.collectionSuitable ? 'Yes' : 'No',
        report.reporter.name || 'Anonymous',
        report.reporter.email || 'N/A',
        report.reporter.phone || 'N/A',
        driveLink,
      ],
    ];

    console.log(`[Google Sheets] Appending to sheet: "${sheetName}"`);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:I`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });
  } catch (error: any) {
    console.error('[Google Sheets Error]:', error.message);
    throw new Error(`Failed to update Google Sheet: ${error.message}`);
  }
};
