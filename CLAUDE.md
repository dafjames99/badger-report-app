# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # dev server (webpack, no service worker)
npm run pwa:dev      # dev server with service worker active (Turbopack)
npm run build        # production build (webpack)
npm run pwa:build    # production build (Turbopack, used by Vercel)
npm run start        # serve production build

npm test             # unit tests (Vitest, single run)
npm run test:watch   # unit tests in watch mode
npm run test:e2e     # Playwright E2E (chromium + webkit)

npx vitest run src/lib/__tests__/syncManager.test.ts   # run a single test file
npx playwright test --project=webkit                   # run E2E on one browser only
npx tsc --noEmit     # type-check
npm run lint
```

`--webpack` is required for `dev` and `build` because Turbopack does not support the Serwist plugin. Use `pwa:dev` / `pwa:build` only when you need to test service worker behaviour.

## Architecture

### Data flow

```
ReportForm → submitReport() → IndexedDB (pending)
                           → fetch POST /api/reports  ← immediate if online
                                    ↓
                           Google Sheets row + email alert (with photo attachment)
```

Photos are delivered **only via email** — they are not stored on the server, in the sheet, or in any cloud storage. The sheet's Photo column contains descriptive text only.

### Offline-first sync layer

`src/lib/syncManager.ts` is the single entry point for form submission:

- **`submitReport(reportData)`** — saves to IndexedDB with `syncStatus: 'pending'`, then immediately attempts `uploadReport()` if `navigator.onLine`. Returns `'uploaded'` (server confirmed) or `'queued'` (offline or request failed). This is what `ReportForm` calls on submit.
- **`syncPendingReports()`** — iterates pending IDB entries and uploads them. Called by `debouncedSync()` on page load and when the browser comes back online, to flush any reports that were queued during an offline session.
- **`uploadReport()`** — private. POSTs a `Report` object as multipart FormData to `/api/reports`.

`src/lib/db.ts` owns all IndexedDB operations via the `idb` library. The DB is named `badger-reports`, single object store `reports`, indexed by `syncStatus`.

The service worker (`src/app/sw.ts` → compiled `public/sw.js`) is built by Serwist and handles precaching and runtime caching for offline asset delivery. It does **not** intercept POST requests — sync is handled entirely in the main thread via `syncManager.ts`.

### API route

`src/app/api/reports/route.ts` (POST only):
1. Parses multipart FormData — `metadata` (JSON string) + optional `photo` (File)
2. Sends email alert via Nodemailer (`src/lib/email.ts`) — non-fatal if unconfigured
3. Appends a row to Google Sheets (`src/lib/google-sheets.ts`) — the photo column gets a text note, not a file

Auth to Google APIs uses a service account (`src/lib/google-auth.ts`). Credentials come from `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` env vars.

### Testing

**Unit tests** (`src/lib/__tests__/`) use Vitest + happy-dom + `fake-indexeddb`. The setup file (`src/test/setup.ts`) patches the global `indexedDB` before any test runs.

**E2E tests** (`e2e/`) use Playwright. The **webkit project is the Safari proxy** — run it to catch Safari-engine bugs without a real device. All tests mock `/api/reports` via `page.route()` so no real credentials are needed.

**CI** (`.github/workflows/ci.yml`):
- `push` / `pull_request` → unit tests only
- `deployment_status` → E2E against the Vercel preview URL (`github.event.deployment_status.target_url`)

Vercel Deployment Protection is active on preview URLs. Playwright bypasses it by sending `x-vercel-protection-bypass: <secret>` as an HTTP header (`playwright.config.ts` → `extraHTTPHeaders`). The secret must be set as `VERCEL_AUTOMATION_BYPASS_SECRET` in both Vercel project settings and GitHub Actions secrets.
