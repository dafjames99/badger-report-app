import { getPendingReports, markReportSynced, deleteReport, Report } from './db';

let isSyncing = false;

export const syncPendingReports = async () => {
  if (isSyncing || !navigator.onLine) return;
  
  const pending = await getPendingReports();
  if (pending.length === 0) return;

  isSyncing = true;
  console.log(`[SyncManager] Starting sync for ${pending.length} reports...`);

  for (const report of pending) {
    try {
      await uploadReport(report);
      // Delete from IDB after successful upload
      await deleteReport(report.id);
      console.log(`[SyncManager] Successfully synced report: ${report.id}`);
    } catch (error) {
      console.error(`[SyncManager] Failed to sync report ${report.id}:`, error);
      // Keep in IDB to retry later
    }
  }

  isSyncing = false;
  console.log('[SyncManager] Sync cycle complete.');
};

async function uploadReport(report: Report) {
  const formData = new FormData();
  
  // Clean report object for metadata
  const { photo, ...metadata } = report;
  formData.append('metadata', JSON.stringify(metadata));

  if (photo) {
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
