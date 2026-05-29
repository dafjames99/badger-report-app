import { google } from 'googleapis';
import { getGoogleAuth } from './google-auth';
import { Readable } from 'stream';

export const uploadToDrive = async (photoBlob: Blob, filename: string): Promise<string> => {
  try {
    const auth = getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID missing in environment');
    }

    // Convert Blob to Node.js Readable Stream
    const buffer = Buffer.from(await photoBlob.arrayBuffer());
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    console.log(`[Google Drive] Uploading file: ${filename} to folder: ${folderId}`);
    const response = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
      },
      media: {
        mimeType: 'image/jpeg',
        body: stream,
      },
      fields: 'id, webViewLink',
    });

    const fileId = response.data.id;
    if (!fileId) throw new Error('Drive upload failed: No file ID returned');
    
    // Make the file readable by anyone with the link
    try {
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permError: any) {
      console.warn('[Google Drive Warning] Failed to set permissions:', permError.message);
      // Continue anyway as the file is created
    }

    const fileInfo = await drive.files.get({
      fileId,
      fields: 'webViewLink',
    });

    return fileInfo.data.webViewLink!;
  } catch (error: any) {
    console.error('[Google Drive Error]:', error.message);
    throw new Error(`Failed to upload to Google Drive: ${error.message}`);
  }
};
