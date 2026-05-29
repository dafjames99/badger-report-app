const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : null;
const spreadsheetId = process.env.GOOGLE_SHEET_ID;

console.log('EMAIL:', email);
console.log('KEY LENGTH:', privateKey ? privateKey.length : 0);
console.log('SHEET ID:', spreadsheetId);

if (!email || !privateKey || !spreadsheetId) {
    console.error('Missing credentials');
    process.exit(1);
}

const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function test() {
    try {
        console.log('Fetching spreadsheet metadata...');
        const res = await sheets.spreadsheets.get({ spreadsheetId });
        console.log('Title:', res.data.properties.title);
        const sheetName = res.data.sheets[0].properties.title;
        console.log('First Sheet Name:', sheetName);
        
        console.log('Testing append to:', sheetName);
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${sheetName}!A:I`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [['Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test']],
            },
        });
        console.log('✅ Success!');
    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.response) console.error('Details:', err.response.data);
    }
}

test();
