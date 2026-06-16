'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker assets when bundled (Next.js)
const icon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/** Geographic centre of Wales — default when device location is unavailable */
const WALES_CENTER: L.LatLngExpression = [52.25, -3.75];
/** Fits all of Wales in view */
const WALES_ZOOM = 8;
/** When we have the user's approximate position */
const DEVICE_LOCATION_ZOOM = 13;
const SELECTED_ZOOM = 15;

export interface MapPosition {
  latitude: number;
  longitude: number;
}

interface LocationMapPickerProps {
  position: MapPosition | null;
  onPositionChange: (position: MapPosition) => void;
  /** Optional center when no pin is placed yet */
  initialCenter?: MapPosition;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

function MapSizeInvalidator({ isFullscreen }: { isFullscreen: boolean }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 50);
    return () => clearTimeout(timer);
  }, [isFullscreen, map]);
  return null;
}

function MapClickHandler({ onPositionChange }: { onPositionChange: (position: MapPosition) => void }) {
  useMapEvents({
    click(e) {
      onPositionChange({
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      });
    },
  });
  return null;
}

function MapViewController({
  position,
  initialCenter,
}: {
  position: MapPosition | null;
  initialCenter?: MapPosition;
}) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView([position.latitude, position.longitude], SELECTED_ZOOM, { animate: true });
      return;
    }
    if (initialCenter) {
      map.setView([initialCenter.latitude, initialCenter.longitude], DEVICE_LOCATION_ZOOM, {
        animate: false,
      });
    }
  }, [map, position, initialCenter]);

  return null;
}

export default function LocationMapPicker({
  position,
  onPositionChange,
  initialCenter,
  isFullscreen = false,
  onToggleFullscreen,
}: LocationMapPickerProps) {
  const center: L.LatLngExpression = position
    ? [position.latitude, position.longitude]
    : initialCenter
      ? [initialCenter.latitude, initialCenter.longitude]
      : WALES_CENTER;

  const zoom = position ? SELECTED_ZOOM : initialCenter ? DEVICE_LOCATION_ZOOM : WALES_ZOOM;

  return (
    <div className={isFullscreen ? 'flex-1 min-h-0 flex flex-col gap-2' : 'space-y-2'}>
      <p className="text-xs text-text-placeholder font-medium shrink-0">
        Tap the map to place the report pin.
      </p>
      {/* relative wrapper: button sits over map without being clipped by overflow-hidden */}
      <div className={`relative ${isFullscreen ? 'flex-1 min-h-0' : 'h-64'}`}>
        <div className="h-full w-full rounded-xl overflow-hidden border border-border-base z-0 [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-container]:bg-surface-bg">
          <MapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <MapSizeInvalidator isFullscreen={isFullscreen} />
            <MapClickHandler onPositionChange={onPositionChange} />
            <MapViewController position={position} initialCenter={initialCenter} />
            {position && (
              <Marker
                position={[position.latitude, position.longitude]}
                icon={icon}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const { lat, lng } = e.target.getLatLng();
                    onPositionChange({ latitude: lat, longitude: lng });
                  },
                }}
              />
            )}
          </MapContainer>
        </div>
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Expand map'}
            className="absolute top-2 right-2 z-[1000] w-8 h-8 rounded-lg bg-white/90 border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:bg-white hover:text-gray-700 transition-all active:scale-95"
          >
            {isFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
