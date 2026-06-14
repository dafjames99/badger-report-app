import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module so these tests focus purely on submitReport logic
vi.mock('@/lib/db', () => ({
  saveReport: vi.fn(),
  deleteReport: vi.fn(),
  getDB: vi.fn(),
  getPendingReports: vi.fn(),
  markReportSyncing: vi.fn(),
  markReportPending: vi.fn(),
  resetStuckSyncingReports: vi.fn(),
}));

import { submitReport } from '@/lib/syncManager';
import * as db from '@/lib/db';

const mockReport = {
  id: 'test-id',
  timestamp: Date.now(),
  updatedAt: Date.now(),
  syncStatus: 'pending' as const,
  suitability: { collectionSuitable: true },
  location: { latitude: 51.5, longitude: -2.5, accuracyMeters: 10 },
  reporter: { name: 'Test', email: 'test@example.com', phone: '' },
};

const reportData = {
  timestamp: mockReport.timestamp,
  updatedAt: mockReport.updatedAt,
  suitability: mockReport.suitability,
  location: mockReport.location,
  reporter: mockReport.reporter,
};

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, writable: true, configurable: true });
}

function mockFetchSuccess() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  }));
}

function mockFetchNetworkError() {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
}

function mockFetchServerError(status = 500) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: false,
    status,
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.saveReport).mockResolvedValue('test-id');
  vi.mocked(db.deleteReport).mockResolvedValue(undefined);
  vi.mocked(db.getDB).mockResolvedValue({
    get: vi.fn().mockResolvedValue(mockReport),
  } as any);
});

describe('submitReport', () => {
  describe('when online and fetch succeeds', () => {
    it('returns "uploaded"', async () => {
      setOnline(true);
      mockFetchSuccess();

      const result = await submitReport(reportData);

      expect(result).toBe('uploaded');
    });

    it('deletes the report from IDB after successful upload', async () => {
      setOnline(true);
      mockFetchSuccess();

      await submitReport(reportData);

      expect(db.deleteReport).toHaveBeenCalledWith('test-id');
    });

    it('POSTs to /api/reports', async () => {
      setOnline(true);
      mockFetchSuccess();

      await submitReport(reportData);

      expect(fetch).toHaveBeenCalledWith('/api/reports', expect.objectContaining({ method: 'POST' }));
    });
  });

  describe('when online but fetch throws a network error', () => {
    it('returns "queued"', async () => {
      setOnline(true);
      mockFetchNetworkError();

      const result = await submitReport(reportData);

      expect(result).toBe('queued');
    });

    it('does not delete the report from IDB', async () => {
      setOnline(true);
      mockFetchNetworkError();

      await submitReport(reportData);

      expect(db.deleteReport).not.toHaveBeenCalled();
    });
  });

  describe('when online but server returns an error', () => {
    it('returns "queued"', async () => {
      setOnline(true);
      mockFetchServerError(500);

      const result = await submitReport(reportData);

      expect(result).toBe('queued');
    });

    it('does not delete the report from IDB', async () => {
      setOnline(true);
      mockFetchServerError(500);

      await submitReport(reportData);

      expect(db.deleteReport).not.toHaveBeenCalled();
    });
  });

  describe('when offline', () => {
    it('returns "queued" without attempting a fetch', async () => {
      setOnline(false);
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      const result = await submitReport(reportData);

      expect(result).toBe('queued');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('still saves the report to IDB', async () => {
      setOnline(false);

      await submitReport(reportData);

      expect(db.saveReport).toHaveBeenCalledWith(reportData);
    });
  });

  it('always saves to IDB before attempting upload', async () => {
    setOnline(true);
    mockFetchSuccess();

    await submitReport(reportData);

    expect(db.saveReport).toHaveBeenCalledWith(reportData);
  });
});
