import { useState, useEffect, useCallback } from 'react';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface GeolocationState {
  coords: LocationCoords | null;
  error: string | null;
  loading: boolean;
}

interface UseGeolocationOptions {
  /** When true, requests GPS on mount. Default false — call `retry` explicitly. */
  autoFetch?: boolean;
}

export const useGeolocation = (options: UseGeolocationOptions = {}) => {
  const { autoFetch = false } = options;
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    error: null,
    loading: false,
  });

  const getPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        loading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const positionOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 0,
    };

    const success = (position: GeolocationPosition) => {
      setState({
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        },
        error: null,
        loading: false,
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      let errorMessage = 'An unknown error occurred';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage =
            'Location access denied. Please enable GPS and allow the app to access your location in browser settings.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location information is unavailable. Ensure you have a clear view of the sky.';
          break;
        case error.TIMEOUT:
          errorMessage = 'Location request timed out. Please try again with GPS enabled.';
          break;
      }
      setState({
        coords: null,
        error: errorMessage,
        loading: false,
      });
    };

    navigator.geolocation.getCurrentPosition(success, handleError, positionOptions);
  }, []);

  const clearCoords = useCallback(() => {
    setState({ coords: null, error: null, loading: false });
  }, []);

  useEffect(() => {
    if (autoFetch) {
      getPosition();
    }
  }, [autoFetch, getPosition]);

  return { ...state, retry: getPosition, clearCoords };
};
