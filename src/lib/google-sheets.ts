import { google } from 'googleapis';
import { getGoogleAuth } from './google-auth';

export const appendReportToSheet = async (report: {
  timestamp: number;
  location: { latitude: number; longitude: number; accuracyMeters: number };
  suitability: { collectionSuitable: boolean };
  reporter: { name?: string; email?: string; phone?: string };
  extraInformation?: string;
}, photoNote: string) => {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID missing in environment');
  }

  try {
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
        photoNote,
        report.extraInformation || '',
      ],
    ];

    console.log(`[Google Sheets] Appending to sheet: "${sheetName}"`);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:J`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Google Sheets Error]:', message);
    throw new Error(`Failed to update Google Sheet: ${message}`);
  }
};
