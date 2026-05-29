# Project Specification: Roadside Badger Carcass Reporting PWA

An offline-first, single-purpose Progressive Web App (PWA) optimized for low/no-connectivity field use. This document serves as the high-level initialization context and execution blueprint for autonomous AI agents within Google Antigravity.

---

## 1. Executive Summary & Strategic Rationale

### Vision & Problem Statement
Wildlife conservation agencies, local councils, and research initiatives rely on citizen and field-worker telemetry to track and manage roadside animal mortalities. However, incidents often occur in remote, rural areas with minimal or non-existent cellular coverage. 

Most existing web forms fail catastrophically when offline—losing user data, failing to capture critical sensors, or stalling on asset uploads. Native applications solve this but introduce high friction (app store downloads, account authentication, permissions overhead) for what is fundamentally a **"one-shot" utility**—a user finding a carcass once and wanting to report it immediately.

### The PWA Solution
This application leverages a Progressive Web App (PWA) architecture to bridge the gap:
1. **Zero-Install Discovery:** Accessible instantly via a web URL.
2. **Native Asset Mimicry:** Add-to-homescreen capabilities, offline asset caching, and direct hardware API access.
3. **Resilient Sync Architecture:** Uses **IndexedDB** as a high-capacity client side outbox, combined with standard service worker lifecycle hooks to automatically dispatch queued reports when a telemetry handshake is re-established.

---

## 2. Structural & Architectural Design

The application is split into a client-side persistent shell and a lightweight backend processing layer.


              [CLIENT-SIDE DOMAIN (OFFLINE-RESILIENT)]

+───────────────────────────────────────────────────────────────────────+
│                                                                       │
│  +──────────────────+       Form Submit       +────────────────────+  │
│  │                  │ ──────────────────────> │                    │  │
│  │ Next.js UI Form  │                         │ IndexedDB Storage  │  │
│  │  (Tailwind CSS)  │ <────────────────────── │     (idb lib)      │  │
│  +──────────────────+      Sync Success       +────────────────────+  │
│           ▲                                             │             │
│           │                                             │             │
│    Hardware Signal                               Network Reconnect    │
│           │                                             │             │
│  +──────────────────+                                   ▼             │
│  │ HTML5 GPS Sensor │                        +────────────────────+  │
│  +──────────────────+                        │ Serwist Background │  │
│                                              │   Sync Engine      │  │
│                                              +────────────────────+  │
+─────────────────────────────────────────────────────────────────│─────+
│
POST Full Payload
(Multipart/Form)
│
▼
[SERVERLESS BACKEND DOMAIN]


                                            +────────────────────+
                                            │ Next.js API Route  │
                                            │ (or FastAPI Layer) │
                                            +────────────────────+
                                                       │
                    +──────────────────────────────────┼──────────────────────────────────+
                    │                                  │                                  │
                    ▼                                  ▼                                  ▼
         +────────────────────+             +────────────────────+             +────────────────────+
         │  Google Drive API  │             │  Google Sheets API │             │   Mailing Engine   │
         │ (Binary Target Dir)│             │ (Metadata Logging) │             │ (Structured Email) │
         +────────────────────+             +────────────────────+             +────────────────────+

### Architectural Component Specifications

* **Frontend Framework:** Next.js (App Router) + TypeScript. Provides rigid structural boundaries, explicit type-safety, and optimized build pipelines.
* **Service Worker Engine:** `Serwist` (the modern, modular successor to Workbox/next-pwa, explicitly engineered for Next.js App Router stability). It intercepts network fetches, handles core asset pre-caching, and hooks into synchronization hooks.
* **Client-Side Database:** `IndexedDB` abstracted via the lightweight `idb` promise-based wrapper. This circumvents the volatile `5MB` synchronous limit of `LocalStorage`, allowing structural storage of multiple megabyte-scale image `Blob` objects concurrently.
* **Backend Processing Tier:** Next.js Serverless API Route (or FastAPI). Receives standard `multipart/form-data` payloads, handles external API handshakes, streams assets, and cleanly terminates without keeping long-running state.

---

## 3. Core Functional Requirements

The MVP must implement precisely four high-level criteria within a single-page, fluid interface:

| Ref | Feature | Type | Behavioral Rule |
| :--- | :--- | :--- | :--- |
| **F-01** | **Photo Capture / Upload** | *Optional* | Standard input (`type="file"`, `accept="image/*"`). Must compress images client-side before committing to local IndexedDB storage to limit resource overhead. |
| **F-02** | **Location Capture** | **REQUIRED** | Implicitly queries `navigator.geolocation.getCurrentPosition`. **Rule:** If offline, do not render a broken map frame. Provide a clear, textual status confirmation showing resolved coordinates and accuracy bounds (e.g., `±15m`). |
| **F-03** | **Collection Suitability** | **REQUIRED** | A single toggle or checkbox explicit input indicating whether the carcass is intact (`true`/`false`), signaling collection viability to workers. |
| **F-04** | **Reporter Metadata** | *Optional* | Text input fields capturing `Name`, `Email`, and `Phone`. Persisted locally across sessions via a secondary configuration object for ease of repeatable entry. |

---

## 4. Engineering Solutions for Deep-Offline Constraints

### 4.1 Geolocation Hardware Behavior
The HTML5 Geolocation API communicates directly with the host device's internal GPS receiver. It requires **no network connectivity** to triangulate latitude and longitude coordinates. The application must request high accuracy explicitly:
```typescript
{ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }

```

### 4.2 Storage Mechanics (Blob Serialization)

Images are preserved within IndexedDB as structured, raw binary `Blob` configurations.

* **Key Lifecycle:** The raw image file object is processed, structurally validated, and injected directly into an object store configuration keyed by a unique `UUIDv4`.
* **Stringification Avoidance:** Under no circumstances should images be converted to heavy Base64 strings within IndexedDB, as this introduces a 33% calculation payload overhead and causes execution main-thread stutter during database read/writes.

### 4.3 Network Re-handshake & Outbox Sync Loop

1. When the interaction loop fires the submit action, the code evaluates the online state (`navigator.onLine`).
2. **If Offline:** The payload structure is stamped with `syncStatus = "pending"` and saved to the IndexedDB `outbox` table. The interface changes to show a reassuring offline success message.
3. **If Online (or Upon Reconnection):** A custom event controller captures `window.addEventListener('online', triggerSync)`.
4. The system executes a queue-drain algorithm:
* Retrieves all `pending` items from IndexedDB.
* Compiles elements into a clean `Multipart/FormData` request wrapper.
* Issues an atomic `POST` request to the backend validation gateway.
* Upon receipt of a verified HTTP `200 OK` structure from the server, the specific record ID is purged cleanly from the local IndexedDB system to conserve client disk memory.



---

## 5. Technical Data Contract

All operations must conform exactly to this explicit JSON scheme definition for inter-service communications:

```json
{
  "reportId": "d3b07384-d113-4a12-b529-688a29fb4625",
  "timestamp": 1779983803,
  "suitability": {
    "collectionSuitable": true
  },
  "location": {
    "latitude": 53.959412,
    "longitude": -1.082154,
    "accuracyMeters": 12.5
  },
  "reporter": {
    "name": "Alex Mercer",
    "email": "alex.mercer@example.org",
    "phone": "+447123456789"
  }
}

```

*Note: During multi-part transit, the structural fields are submitted as a stringified JSON property field (`metadata`), while the image field occupies an independent binary boundary key named `photo`.*

---

## 6. Implementation Phase Blueprint

This phase layout maps directly to sequential execution instructions for Google Antigravity agents.

### Phase 1: PWA Core Shell Setup & Storage Architecture

* **Task 1.1:** Initialize a standard Next.js TypeScript boilerplate using Tailwind CSS layout systems. Set up a rigid, semantic project layout.
* **Task 1.2:** Establish the base native configuration file `app/manifest.ts` providing name, theme, orientations, and icon profiles matching standard application behaviors.
* **Task 1.3:** Configure `@serwist/next` into the build layout. Build a functional service worker script capable of executing static asset pre-caching (`/_next/static/*`, layout elements, assets) and enforcing a seamless offline fallback view.
* **Task 1.4:** Construct a clean database module using the `idb` engine layer. Export concrete asynchronous methods: `saveReport(report)`, `getPendingReports()`, and `deleteReport(id)`. Ensure explicit error mapping handles storage constraints gracefully.

### Phase 2: Form Interaction & Hardware API Layer

* **Task 2.1:** Implement a simple, responsive form using Tailwind CSS. Style form elements to be easily tappable on mobile devices in outdoor, bright-light settings.
* **Task 2.2:** Build a robust React custom hook (`useGeolocation`) wrapping `navigator.geolocation`. Incorporate state machines to track `loading`, `error`, and `success` status patterns. Capture hardware details safely, processing error codes cleanly (e.g., user denied permissions).
* **Task 2.3:** Implement a local image change controller. Build a quick canvas compression engine that scales oversized source images down to a manageable size (e.g., max width of `1600px`, JPEG encoding factor `0.85`) prior to IndexedDB storage optimization.

### Phase 3: Synchronous Network State Controller

* **Task 3.1:** Construct the client-side synchronization orchestration system (`syncManager.ts`). Implement a clear, non-blocking check routine testing network interface routes.
* **Task 3.2:** Wire up event interceptors watching `window.addEventListener('online')` and application mount lifecycles to trigger a secure queue-draining loop.
* **Task 3.3:** Code the network dispatcher logic. Transform target metadata and the stored raw image `Blob` configuration into an explicit `FormData` instance. Use standard `fetch()` API calls to send payloads to the ingestion pipeline. Ensure client database items are deleted **only** after receiving verification from the server.

### Phase 4: Integrations Ingest Pipeline & External APIs

* **Task 4.1:** Establish the ingestion route handler. Parse multi-part request contents safely, verifying the payload layout structure against the system's strict schema rules.
* **Task 4.2:** Integrate Google Drive integration paths using **Google Cloud Service Account** JWT authentication keys. Stream incoming binary file data directly into a dedicated folder directory. Return the permanent, publicly resolvable viewing reference URL string.
* **Task 4.3:** Integrate Google Sheets updates via service account pathways. Map report fields, timestamps, location numbers, and the newly generated Google Drive file access link string into a new row insertion sequence.
* **Task 4.4:** Configure an automated email dispatch routine using a standard transaction tool (e.g., Resend, SendGrid, or NodeMailer/aiosmtplib). Build a semantic markdown layout summary that sends automated alerts out immediately upon submission.

---

## 7. Open Architectural Considerations & Guardrails

To prevent scope creep and design errors during the autonomous development phase, agents must adhere to the following guardrails:

1. **Authentication Boundary:** To maintain zero-friction access for one-time users, the frontend app has **no user authentication layer**. Data submission paths use rate-limiting controls to prevent spam. Backend access to Google APIs must be securely handled using an isolated Google Cloud Service Account with scoped permissions, rather than a fragile user OAuth token flow.
2. **Concurrent Request Batches:** If multiple submissions occur offline, the sync engine must process uploads **sequentially** using an array-reduce chain, rather than executing a simultaneous `Promise.all()`. This prevents performance drops on low-bandwidth rural networks and avoids triggering timeout limits on serverless endpoints.
3. **Map Caching Boundaries:** For the initial MVP, map tile pre-caching is completely skipped. The interface will prioritize clear, text-based coordinate validation to ensure the application bundle remains small, fast, and optimized for field deployment.