# Badger Report PWA

An offline-first Progressive Web App for reporting roadside badger carcass telemetry.

## Architecture

Reports flow from the device → `/api/reports` → **email alert** + **Google Sheet row**.

| Data | Where it lives after sync |
|------|---------------------------|
| Metadata (location, suitability, reporter) | Google Sheet |
| Optional photo | **Email only** (inline preview + JPEG attachment). Not stored on the server, in Google Drive, or in the sheet. |
| Offline queue | IndexedDB on the device until sync succeeds, then removed |

The sheet’s **Photo** column holds short text (for example `See alert email (<report-id>)` or `No photo`), not a file URL. Operators must use the configured inbox to view evidence images. Email size limits apply (typically on the order of 10–25 MB per message).

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
4. Create a Service Account and download the **JSON Key** — rename to *service-account.json* and move to the root of the project.
5. Copy `client_email` to `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `private_key` to `GOOGLE_PRIVATE_KEY` in your `.env.local`.
6. Enable the **Google Sheets API** for your project (Drive API is not required).

### 3. Google Sheets Setup
1. Create a new Google Sheet.
2. Share the sheet with your Service Account email with **Editor** permissions.
3. Copy the Sheet ID from the URL and paste it into `GOOGLE_SHEET_ID`.
4. Ensure the first row has the following headers: `Timestamp`, `Latitude`, `Longitude`, `Accuracy`, `Suitable`, `Reporter Name`, `Reporter Email`, `Reporter Phone`, `Photo`.

### 4. Email Setup
Photos are delivered only via the alert email. Configure SMTP (or your provider’s SMTP relay):

1. Set `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`, and `EMAIL_SERVER_PASSWORD` in `.env.local`.
2. Set `EMAIL_FROM` (sender) and `EMAIL_TO` (recipient inbox that will receive photos).
3. Set `EMAIL_TEMPLATE` to `classic`, `table`, or `card` (defaults to `table` if unset).
3. If email is not configured, reports still append to the sheet; rows with photos will note that email was not sent.

### 5. Development
```bash
npm install
npm run dev -- --webpack
```

### 6. Production Build
```bash
npm run build -- --webpack
```
