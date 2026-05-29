# Badger Report PWA

An offline-first Progressive Web App for reporting roadside badger carcass telemetry.

## Setup Instructions

### 1. Environment Variables
Copy `.env.template` to `.env.local` and fill in the required values.

```bash
cp .env.template .env.local
```

### 2. Google Cloud Service Account
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Navigate to **IAM & Admin > Service Accounts**.
4. Create a Service Account and download the **JSON Key** - rename to *service-account.json* and move to the root of the project.
5. Copy `client_email` to `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `private_key` to `GOOGLE_PRIVATE_KEY` in your `.env.local`.
6. Enable the **Google Drive API** and **Google Sheets API** for your project.

### 3. Google Drive Setup
1. Create a folder in Google Drive.
2. Share the folder with your Service Account email with **Editor** permissions.
3. Copy the Folder ID from the URL and paste it into `GOOGLE_DRIVE_FOLDER_ID`.

### 4. Google Sheets Setup
1. Create a new Google Sheet.
2. Share the sheet with your Service Account email with **Editor** permissions.
3. Copy the Sheet ID from the URL and paste it into `GOOGLE_SHEET_ID`.
4. Ensure the first row has the following headers: `Timestamp`, `Latitude`, `Longitude`, `Accuracy`, `Suitable`, `Reporter Name`, `Reporter Email`, `Reporter Phone`, `Photo Link`.

### 5. Resend Setup
1. Go to [Resend](https://resend.com).
2. Create an account.
3. Copy the API key to `EMAIL_SERVER_PASSWORD` in your `.env.local`.
4. Copy the domain to `EMAIL_FROM` in your `.env.local` (use *onboarding@resend.dev* for dev)
5. Copy the email address to `EMAIL_TO` in your `.env.local`.

### 6. Development
```bash
npm install
npm run dev -- --webpack
```

### 7. Production Build
```bash
npm run build -- --webpack
```


