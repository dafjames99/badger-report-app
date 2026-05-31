import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface Report {
  id: string;
  timestamp: number;
  suitability: {
    collectionSuitable: boolean | null;
  };
  location: {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
  };
  reporter: {
    name?: string;
    email?: string;
    phone?: string;
  };
  extraInformation?: string;
  photo?: Blob;
  syncStatus: SyncStatus;
  updatedAt: number;
}

interface BadgerDB extends DBSchema {
  reports: {
    key: string;
    value: Report;
    indexes: { 'by-status': string };
  };
}

let dbPromise: Promise<IDBPDatabase<BadgerDB>> | null = null;

export const getDB = () => {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<BadgerDB>('badger-reports', 1, {
      upgrade(db) {
        const store = db.createObjectStore('reports', {
          keyPath: 'id',
        });
        store.createIndex('by-status', 'syncStatus');
      },
    });
  }
  return dbPromise;
};

export const markReportSyncing = async (id: string) => {
  const db = await getDB();
  if (!db) return;
  const report = await db.get('reports', id);
  if (report && report.syncStatus === 'pending') {
    report.syncStatus = 'syncing';
    report.updatedAt = Date.now();
    await db.put('reports', report);
    return true; // claimed it
  }
  return false; // someone else got there first
};

export const resetStuckSyncingReports = async (olderThanMs = 60_000) => {
  const db = await getDB();
  if (!db) return;
  const all = await db.getAll('reports');
  const now = Date.now();
  for (const report of all) {
    if (
      report.syncStatus === 'syncing' &&
      now - (report.updatedAt ?? 0) > olderThanMs
    ) {
      report.syncStatus = 'pending';
      await db.put('reports', report);
    }
  }
};
export const saveReport = async (reportData: Omit<Report, 'id' | 'syncStatus'> & { id?: string }) => {
  const db = await getDB();
  if (!db) throw new Error('IndexedDB not available');

  const report: Report = {
    ...reportData,
    id: reportData.id || uuidv4(),
    syncStatus: 'pending',
  };

  // Check if we're overwriting something
  const existing = await db.get('reports', report.id);
  if (existing) {
    console.warn(`[DB] saveReport is overwriting existing record:`, existing);
  }

  console.log(`[DB] Saving report ${report.id} with status pending`);
  await db.put('reports', report);
  return report.id;
};

export const markReportPending = async (id: string) => {
  const db = await getDB();
  if (!db) return;
  const report = await db.get('reports', id);
  if (report) {
    report.syncStatus = 'pending';
    report.updatedAt = Date.now();
    await db.put('reports', report);
  }
};

export const getPendingReports = async () => {
  const db = await getDB();
  if (!db) return [];
  return db.getAllFromIndex('reports', 'by-status', 'pending');
};

export const markReportSynced = async (id: string) => {
  const db = await getDB();
  if (!db) return;
  const report = await db.get('reports', id);
  if (report) {
    report.syncStatus = 'synced';
    await db.put('reports', report);
  }
};

export const deleteReport = async (id: string) => {
  const db = await getDB();
  if (!db) return;
  await db.delete('reports', id);
};
