import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null;
  error: string | null;
  loading: boolean;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    error: null,
    loading: true,
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

    const options: PositionOptions = {
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
          errorMessage = 'Location access denied. Please enable GPS and allow the app to access your location in browser settings.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location information is unavailable. Ensure you have a clear view of the sky.';
          break;
        case error.TIMEOUT:
          errorMessage = 'Location request timed out. Please try refreshing or ensuring GPS is enabled.';
          break;
      }
      setState({
        coords: null,
        error: errorMessage,
        loading: false,
      });
    };

    navigator.geolocation.getCurrentPosition(success, handleError, options);
  }, []);

  useEffect(() => {
    getPosition();
  }, [getPosition]);

  return { ...state, retry: getPosition };
};
