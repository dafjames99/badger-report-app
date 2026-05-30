import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';

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
  syncStatus: 'pending' | 'synced' | 'failed';
}

interface BadgerDB extends DBSchema {
  reports: {
    key: string;
    value: Report;
    indexes: { 'by-status': string };
  };
}

let dbPromise: Promise<IDBPDatabase<BadgerDB>> | null = null;

const getDB = () => {
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

export const saveReport = async (reportData: Omit<Report, 'id' | 'syncStatus'> & { id?: string }) => {
  const db = await getDB();
  if (!db) throw new Error('IndexedDB not available');

  const report: Report = {
    ...reportData,
    id: reportData.id || uuidv4(),
    syncStatus: 'pending',
  };

  await db.put('reports', report);
  return report.id;
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
