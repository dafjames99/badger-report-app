import {
  getPendingReports,
  deleteReport,
  markReportSyncing,
  resetStuckSyncingReports,
  Report,
  markReportPending,
  getDB
} from './db';

let isSyncing = false;

// syncManager.ts
export const syncPendingReports = async () => {
  if (isSyncing || !navigator.onLine) return;
  isSyncing = true;

  try {
    await resetStuckSyncingReports();

    const pending = await getPendingReports();
    console.log(`[SyncManager] Pending reports (${pending.length}):`,
      pending.map(r => ({ id: r.id, timestamp: r.timestamp, status: r.syncStatus }))
    );

    if (pending.length === 0) return;

    for (const report of pending) {
      const claimed = await markReportSyncing(report.id);
      console.log(`[SyncManager] Claim attempt for ${report.id}:`, claimed);
      if (!claimed) continue;

      try {
        console.log(`[SyncManager] Uploading ${report.id}…`);
        await uploadReport(report);
        console.log(`[SyncManager] Upload succeeded for ${report.id}, deleting…`);
        await deleteReport(report.id);

        // Verify deletion
        const db = await getDB();
        const stillExists = db ? await db.get('reports', report.id) : 'could not check';
        console.log(`[SyncManager] Post-delete check for ${report.id}:`, stillExists ?? 'GONE ✓');

      } catch (error) {
        console.error(`[SyncManager] Failed ${report.id}:`, error);
        await markReportPending(report.id);
      }
    }
  } finally {
    isSyncing = false;
    // Log final state of DB
    const db = await getDB();
    if (db) {
      const remaining = await db.getAll('reports');
      console.log(`[SyncManager] DB state after sync:`,
        remaining.map(r => ({ id: r.id, timestamp: r.timestamp, status: r.syncStatus }))
      );
    }
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