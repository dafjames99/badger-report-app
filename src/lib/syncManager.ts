import {
  getPendingReports,
  deleteReport,
  markReportSyncing,
  resetStuckSyncingReports,
  Report,
  markReportPending
} from './db';

let isSyncing = false;

export const syncPendingReports = async () => {
  if (isSyncing || !navigator.onLine) return;
  isSyncing = true;

  try {
    // Reset any reports stuck in 'syncing' from a previous crashed session
    await resetStuckSyncingReports();

    const pending = await getPendingReports();
    if (pending.length === 0) return;

    console.log(`[SyncManager] Syncing ${pending.length} reports…`);

    for (const report of pending) {
      // Atomically claim the report — skip if another sync beat us to it
      const claimed = await markReportSyncing(report.id);
      if (!claimed) {
        console.log(`[SyncManager] Skipping ${report.id} — already claimed`);
        continue;
      }

      try {
        await uploadReport(report);
        await deleteReport(report.id);
        console.log(`[SyncManager] Synced: ${report.id}`);
      } catch (error) {
        console.error(`[SyncManager] Failed: ${report.id}`, error);
        await markReportPending(report.id); // immediate reset of failed ones
      }
    }
  } finally {
    isSyncing = false;
  }
};

async function uploadReport(report: Report) {
  const formData = new FormData();

  const { photo, ...metadata } = report;
  formData.append('metadata', JSON.stringify(metadata));

  if (photo && photo.size > 0) {
    formData.append('photo', photo, `report-${report.id}.jpg`);
  }

  const response = await fetch('/api/reports', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Server responded with ${response.status}`);
  }

  return response.json();
}

let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export const debouncedSync = () => {
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(syncPendingReports, 2000);
};