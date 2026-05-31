import { google } from 'googleapis';
import path from 'path';

export const getGoogleAuth = () => {
  // Prefer loading from a service account JSON key file (avoids key-string parsing issues).
  // falls back to env vars if the file doesn't exist (e.g. in production environments).

  const keyFilePath = path.join(process.cwd(), 'service-account.json');
  const credentialsEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (credentialsEnv) {
    console.log('Raw env (first 100 chars):', credentialsEnv?.slice(0, 100));
    console.log('Starts with {:', credentialsEnv?.trimStart().startsWith('{'));

    const credentials = JSON.parse(credentialsEnv);
    console.log('Keys found:', Object.keys(credentials));
    console.log('private_key starts with:', credentials.private_key?.slice(0, 40));
    console.log('private_key contains literal \\n:', credentials.private_key?.includes('\\n'));
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
  }

  return new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
};
