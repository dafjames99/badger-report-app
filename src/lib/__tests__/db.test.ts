import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDB,
  saveReport,
  deleteReport,
  getPendingReports,
  markReportSyncing,
  markReportPending,
  resetStuckSyncingReports,
} from '@/lib/db';

// fake-indexeddb/auto is loaded in src/test/setup.ts

const baseReport = {
  timestamp: Date.now(),
  updatedAt: Date.now(),
  suitability: { collectionSuitable: true },
  location: { latitude: 51.5, longitude: -2.5, accuracyMeters: 10 },
  reporter: { name: 'Test', email: 'test@example.com', phone: '' },
};

beforeEach(async () => {
  const db = await getDB();
  if (db) await db.clear('reports');
});

describe('saveReport', () => {
  it('persists a report with syncStatus "pending"', async () => {
    const id = await saveReport(baseReport);
    const db = await getDB();
    const saved = await db!.get('reports', id);

    expect(saved).toBeDefined();
    expect(saved!.syncStatus).toBe('pending');
    expect(saved!.location.latitude).toBe(51.5);
  });

  it('generates a unique id when none is provided', async () => {
    const id1 = await saveReport(baseReport);
    const id2 = await saveReport(baseReport);

    expect(id1).not.toBe(id2);
  });
});

describe('getPendingReports', () => {
  it('returns only reports with syncStatus "pending"', async () => {
    const id = await saveReport(baseReport);
    await markReportSyncing(id);
    await saveReport(baseReport); // second report stays pending

    const pending = await getPendingReports();

    expect(pending).toHaveLength(1);
    expect(pending[0].syncStatus).toBe('pending');
  });
});

describe('deleteReport', () => {
  it('removes the report from IDB', async () => {
    const id = await saveReport(baseReport);
    await deleteReport(id);
    const db = await getDB();
    const gone = await db!.get('reports', id);

    expect(gone).toBeUndefined();
  });
});

describe('markReportSyncing', () => {
  it('transitions a pending report to "syncing"', async () => {
    const id = await saveReport(baseReport);
    await markReportSyncing(id);
    const db = await getDB();
    const report = await db!.get('reports', id);

    expect(report!.syncStatus).toBe('syncing');
  });

  it('returns true when successfully claimed', async () => {
    const id = await saveReport(baseReport);
    const claimed = await markReportSyncing(id);

    expect(claimed).toBe(true);
  });

  it('returns false if the report is already syncing', async () => {
    const id = await saveReport(baseReport);
    await markReportSyncing(id);
    const secondClaim = await markReportSyncing(id);

    expect(secondClaim).toBe(false);
  });
});

describe('markReportPending', () => {
  it('resets a syncing report back to "pending"', async () => {
    const id = await saveReport(baseReport);
    await markReportSyncing(id);
    await markReportPending(id);
    const db = await getDB();
    const report = await db!.get('reports', id);

    expect(report!.syncStatus).toBe('pending');
  });
});

describe('resetStuckSyncingReports', () => {
  it('resets syncing reports older than the threshold back to pending', async () => {
    const id = await saveReport(baseReport);
    await markReportSyncing(id);

    // Backdate the updatedAt so it looks stuck
    const db = await getDB();
    const report = await db!.get('reports', id);
    report!.updatedAt = Date.now() - 120_000; // 2 minutes ago
    await db!.put('reports', report!);

    await resetStuckSyncingReports(60_000); // 1 minute threshold
    const reset = await db!.get('reports', id);

    expect(reset!.syncStatus).toBe('pending');
  });

  it('leaves recent syncing reports untouched', async () => {
    const id = await saveReport(baseReport);
    await markReportSyncing(id);

    await resetStuckSyncingReports(60_000);
    const db = await getDB();
    const report = await db!.get('reports', id);

    expect(report!.syncStatus).toBe('syncing');
  });
});
