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
}: LocationMapPickerProps) {
  const center: L.LatLngExpression = position
    ? [position.latitude, position.longitude]
    : initialCenter
      ? [initialCenter.latitude, initialCenter.longitude]
      : WALES_CENTER;

  const zoom = position ? SELECTED_ZOOM : initialCenter ? DEVICE_LOCATION_ZOOM : WALES_ZOOM;

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500 font-medium">Tap the map to place the report pin.</p>
      <div className="h-64 w-full rounded-xl overflow-hidden border border-zinc-700 z-0 [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-container]:bg-zinc-900">
        <MapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
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
    </div>
  );
}
