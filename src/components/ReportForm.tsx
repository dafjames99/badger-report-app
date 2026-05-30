'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useGeolocation } from '@/hooks/useGeolocation';
import { compressImage } from '@/lib/image-utils';
import { saveReport } from '@/lib/db';
import { syncPendingReports } from '@/lib/syncManager';
import type { MapPosition } from '@/components/LocationMapPicker';

const LocationMapPicker = dynamic(() => import('@/components/LocationMapPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-xl border border-border-base bg-surface-card flex items-center justify-center text-text-placeholder text-sm">
      Loading map…
    </div>
  ),
});

type LocationMode = 'gps' | 'map';
type LocationSource = 'gps' | 'map';

interface ReportLocation {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  source: LocationSource;
}

const MAP_ACCURACY_METERS = 25;

export default function ReportForm() {
  const { coords: gpsCoords, error: geoError, loading: geoLoading, retry: retryGeo, clearCoords: clearGps } =
    useGeolocation();
  const [locationMode, setLocationMode] = useState<LocationMode | null>(null);
  const [reportLocation, setReportLocation] = useState<ReportLocation | null>(null);
  const [mapPosition, setMapPosition] = useState<MapPosition | null>(null);
  const [mapInitialCenter, setMapInitialCenter] = useState<MapPosition | undefined>(undefined);

  const [photo, setPhoto] = useState<File | null>(null);
  const [collectionSuitable, setCollectionSuitable] = useState(true);
  const [reporter, setReporter] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [extraInformation, setExtraInformation] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('reporter-info');
    if (saved) {
      setReporter(JSON.parse(saved));
    }

    syncPendingReports();

    const handleOnline = () => {
      setIsOnline(true);
      syncPendingReports();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (locationMode === 'gps' && gpsCoords) {
      setReportLocation({
        latitude: gpsCoords.latitude,
        longitude: gpsCoords.longitude,
        accuracyMeters: gpsCoords.accuracy,
        source: 'gps',
      });
    }
  }, [locationMode, gpsCoords]);

  const selectGpsMode = useCallback(() => {
    setLocationMode('gps');
    setMapPosition(null);
    setReportLocation(null);
    retryGeo();
  }, [retryGeo]);

  const selectMapMode = useCallback(() => {
    setLocationMode('map');
    clearGps();
    setReportLocation(null);
    setMapPosition(null);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMapInitialCenter({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {
          setMapInitialCenter(undefined);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
      );
    }
  }, [clearGps]);

  const handleMapPositionChange = useCallback((position: MapPosition) => {
    setMapPosition(position);
    setReportLocation({
      latitude: position.latitude,
      longitude: position.longitude,
      accuracyMeters: MAP_ACCURACY_METERS,
      source: 'map',
    });
  }, []);

  const handleReporterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updated = { ...reporter, [name]: value };
    setReporter(updated);
    localStorage.setItem('reporter-info', JSON.stringify(updated));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportLocation) {
      setMessage('Location required to submit report.');
      return;
    }

    setStatus('submitting');
    try {
      let compressedPhoto: Blob | undefined;
      if (photo) {
        compressedPhoto = await compressImage(photo);
      }

      await saveReport({
        timestamp: Date.now(),
        suitability: { collectionSuitable },
        location: {
          latitude: reportLocation.latitude,
          longitude: reportLocation.longitude,
          accuracyMeters: reportLocation.accuracyMeters,
        },
        reporter,
        extraInformation: extraInformation.trim() || undefined,
        photo: compressedPhoto,
      });

      setStatus('success');
      setMessage(
        isOnline ? 'Report submitted successfully!' : 'Offline: Report saved locally and will sync when online.'
      );
      setPhoto(null);
      setExtraInformation('');

      if (isOnline) {
        syncPendingReports();
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage('Failed to save report. Please try again.');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg mx-auto p-6 space-y-8 bg-root text-text-base min-h-screen selection:bg-action-hover/30"
    >
      <header className="space-y-2 pt-4">
        <h1 className="text-4xl font-surface-bg tracking-tight bg-gradient-to-r from-brand-start via-brand-mid to-brand-end bg-clip-text text-transparent animate-gradient-x">
          WVSC Badger Report
        </h1>
        <p className="text-text-description text-sm font-medium">
          If you find a dead badger, report it to us using the form below. Please include as much information as
          possible.
        </p>
      </header>

      {!isOnline && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-status-offline-bg border border-status-offline-border text-status-offline text-xs font-semibold animate-pulse">
          <span className="h-2 w-2 rounded-full bg-status-offline" />
          OFFLINE MODE: Reports will be saved locally
        </div>
      )}

      <section className="p-5 rounded-2xl border border-border-muted bg-surface-card hover:bg-surface-element-hover shadow-sm group space-y-4 transition-all">
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-placeholder group-hover:text-brand-start transition-colors">
          Report location
        </h2>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={selectGpsMode}
            className={`py-3 px-3 rounded-xl text-xs font-bold uppercase tracking-wide border transition-all active:scale-95 ${locationMode === 'gps'
              ? 'bg-action-primary border-action-hover text-text-enabled shadow-lg shadow-action-glow'
              : 'bg-surface-card border-border-base text-text-description hover:border-text-placeholder hover:text-text-muted'
              }`}
          >
            Use current location
          </button>
          <button
            type="button"
            onClick={selectMapMode}
            className={`py-3 px-3 rounded-xl text-xs font-bold uppercase tracking-wide border transition-all active:scale-95 ${locationMode === 'map'
              ? 'bg-success-primary border-success-hover text-text-enabled shadow-lg shadow-success-bg'
              : 'bg-surface-card border-border-base text-text-description hover:border-text-placeholder hover:text-text-muted'
              }`}
          >
            Select on map
          </button>
        </div>

        {locationMode === 'gps' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-placeholder">GPS</span>
              <div className="flex items-center gap-2">
                {geoLoading && (
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-start animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-start animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-start animate-bounce" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={retryGeo}
                  disabled={geoLoading}
                  className="text-[10px] font-surface-bg uppercase tracking-tighter px-2 py-1 bg-surface-element hover:bg-surface-element-hover rounded border border-border-base transition-colors active:scale-95 disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>
            </div>
            {geoError ? (
              <div className="space-y-3">
                <p className="text-status-error text-sm leading-relaxed">{geoError}</p>
                <button
                  type="button"
                  onClick={retryGeo}
                  className="text-xs font-bold px-4 py-2 bg-surface-element hover:bg-surface-element-hover rounded-full transition-all active:scale-95 border border-border-base"
                >
                  Retry GPS
                </button>
              </div>
            ) : reportLocation?.source === 'gps' ? (
              <LocationSummary location={reportLocation} />
            ) : !geoLoading ? (
              <p className="text-text-placeholder text-sm">Waiting for GPS fix…</p>
            ) : null}
          </div>
        )}

        {locationMode === 'map' && (
          <div className="space-y-3">
            <LocationMapPicker
              position={mapPosition}
              onPositionChange={handleMapPositionChange}
              initialCenter={mapInitialCenter}
            />
            {reportLocation?.source === 'map' ? (
              <LocationSummary location={reportLocation} />
            ) : (
              <p className="text-text-placeholder text-xs font-medium">No pin placed yet — tap the map to set the location.</p>
            )}
          </div>
        )}

        {locationMode === null && (
          <p className="text-text-placeholder text-sm">Choose how to set the report location.</p>
        )}
      </section>

      <section className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-widest text-text-placeholder">Evidence Photo</label>
        <div className="relative group overflow-hidden rounded-2xl border border-border-muted bg-surface-element transition-all hover:border-action-hover/50">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setPhoto(e.target.files?.[0] || null)}
            className="absolute inset-0 opacity-0 z-10 cursor-pointer"
          />
          <div className="p-8 text-center space-y-2">
            <div className="mx-auto w-10 h-10 rounded-full bg-surface-element flex items-center justify-center group-hover:bg-action-hover/50 group-hover:text-brand-start transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.107-1.107A2 2 0 0010.192 3H9.808a2 2 0 00-1.414.586L7.287 4.707A1 1 0 016.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-text-description">{photo ? photo.name : 'Tap to capture photo'}</p>
          </div>
          {photo && (
            <div className="h-1 bg-action-hover w-full animate-shimmer bg-gradient-to-r from-action-hover via-success-hover to-action-primary bg-[length:200%_100%]" />
          )}
        </div>
      </section>

      <section className="flex items-center justify-between p-5 rounded-2xl border border-border-muted bg-surface-card shadow-sm transition-all hover:bg-surface-element-hover">
        <div>
          <h3 className="font-bold text-text-muted">Intact Carcass?</h3>
          <p className="text-xs text-text-placeholder font-medium">Suitable for scientific collection</p>
        </div>
        <button
          type="button"
          onClick={() => setCollectionSuitable(!collectionSuitable)}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-action-hover focus:ring-offset-2 focus:ring-offset-surface-bg ${collectionSuitable ? 'bg-success-primary shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-button-disabled'
            }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-text-base shadow-sm transition-transform duration-300 ${collectionSuitable ? 'translate-x-6' : 'translate-x-1'
              }`}
          />
        </button>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-placeholder">
          Reporter Details
          <span className="ml-2 text-xs font-medium text-text-placeholder opacity-70">(optional)</span>
        </h2>
        <div className="grid gap-3">
          <input
            type="text"
            name="name"
            placeholder="Your Name"
            value={reporter.name}
            onChange={handleReporterChange}
            className="w-full bg-surface-card border border-border-muted rounded-xl p-4 text-sm focus:ring-2 focus:ring-action-hover/50 focus:border-action-hover outline-none transition-all placeholder:text-text-disabled "
          />
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={reporter.email}
            onChange={handleReporterChange}
            className="w-full bg-surface-card border border-border-muted rounded-xl p-4 text-sm focus:ring-2 focus:ring-action-hover/50 focus:border-action-hover outline-none transition-all placeholder:text-text-disabled "
          />
          <input
            type="tel"
            name="phone"
            placeholder="Phone Number"
            value={reporter.phone}
            onChange={handleReporterChange}
            className="w-full bg-surface-card border border-border-muted rounded-xl p-4 text-sm focus:ring-2 focus:ring-action-hover/50 focus:border-action-hover outline-none transition-all placeholder:text-text-disabled "
          />
        </div>
      </section>

      <section className="space-y-3">
        <label
          htmlFor="extra-information"
          className="block text-xs font-bold uppercase tracking-widest text-text-placeholder"
        >
          Extra Information
          <span className="ml-2 text-xs font-medium text-text-placeholder opacity-70">(optional)</span>
        </label>
        <textarea
          id="extra-information"
          name="extraInformation"
          rows={5}
          value={extraInformation}
          onChange={(e) => setExtraInformation(e.target.value)}
          placeholder={`- Is the badger roadside, in a field, or in woodland?
- Is the location rough or exact?
- Are you certain this is a badger?`}
          className="w-full bg-surface-card border border-border-muted rounded-xl p-4 text-sm focus:ring-2 focus:ring-action-hover/50 focus:border-action-hover outline-none transition-all placeholder:text-text-disabled resize-y min-h-[8rem]"
        />
      </section>

      <div className="pt-6 pb-12">
        <button
          type="submit"
          disabled={status === 'submitting' || !reportLocation}
          className="w-full relative group overflow-hidden py-5 px-6 rounded-2xl bg-action-primary font-surface-bg text-sm uppercase tracking-widest text-text-enabled shadow-2xl shadow-action-glow active:scale-95 transition-all disabled:opacity-30 disabled:active:scale-100 disabled:text-text-disabled"
        >
          <span className="relative z-10">
            {status === 'submitting' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Saving...
              </span>
            ) : (
              'Dispatch Report'
            )}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-success-primary to-success-hover via-brand-end opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {message && (
          <div
            className={`mt-6 p-4 rounded-xl text-center text-sm font-bold animate-in fade-in slide-in-from-top-2 ${status === 'success'
                ? 'bg-sucess-bg text-brand-end border border-sucess-border'
                : 'bg-status-error-bg text-status-error border border-status-error-border'
              }`}
          >
            {message}
          </div>
        )}
      </div>
    </form>
  );
}

function LocationSummary({ location }: { location: ReportLocation }) {
  const sourceLabel = location.source === 'map' ? 'Map selection' : 'GPS';
  const accuracyNote =
    location.source === 'map' ? 'approx. (manual pin)' : `±${location.accuracyMeters.toFixed(1)}m`;

  return (
    <div className="space-y-1">
      <p className="text-lg font-mono text-brand-end flex items-baseline gap-1">
        {location.latitude.toFixed(6)}
        <span className="text-text-disabled text-xs">,</span> {location.longitude.toFixed(6)}
      </p>
      <p className="text-text-placeholder text-xs font-medium">
        {sourceLabel} · Accuracy {accuracyNote}
      </p>
    </div>
  );
}
