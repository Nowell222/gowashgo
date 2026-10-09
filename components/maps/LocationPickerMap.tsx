'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import LaundryIcons from '@/components/common/LaundryIcons';

interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  address?: string;
  onLocationSelect: (loc: { lat: number; lng: number; address: string }) => void;
  label?: string;
}

export default function LocationPickerMap({
  latitude,
  longitude,
  address = '',
  onLocationSelect,
  label = 'Pickup Location',
}: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  const [locating, setLocating] = useState(false);
  const [currentAddress, setCurrentAddress] = useState(address);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: latitude, lng: longitude });

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1Ijoibm93ZWxsMjIyIiwiYSI6ImNtcGdhM3VlZDA0cG4yc3BzOXYyZDJpNW4ifQ.J87ILbCpiz-C6E3al446eA';

  // Reverse geocoding helper using Mapbox Places API
  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<string> => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=address,poi,neighborhood,locality&limit=1`
        );
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          return data.features[0].place_name;
        }
      } catch (err) {
        console.warn('Reverse geocoding error:', err);
      }
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    },
    [token]
  );

  // Initialize Mapbox Map
  useEffect(() => {
    if (!mapContainerRef.current || !token) return;

    try {
      mapboxgl.accessToken = token;
      try {
        (mapboxgl as any).config.EVENTS_URL = null;
      } catch {}

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [longitude, latitude],
        zoom: 14.5,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

      // Create Custom Draggable Pin
      const pinEl = document.createElement('div');
      pinEl.className = 'location-picker-pin';
      pinEl.innerHTML = `
        <div style="
          width: 38px;
          height: 38px;
          background: #0E7490;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2.5px solid #FFFFFF;
          cursor: grab;
        ">
          <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
          </div>
        </div>
      `;

      const marker = new mapboxgl.Marker({
        element: pinEl,
        draggable: true,
      })
        .setLngLat([longitude, latitude])
        .addTo(map);

      markerRef.current = marker;
      mapRef.current = map;

      // Handle marker dragend
      marker.on('dragend', async () => {
        const lngLat = marker.getLngLat();
        setCoords({ lat: lngLat.lat, lng: lngLat.lng });
        const placeName = await reverseGeocode(lngLat.lat, lngLat.lng);
        setCurrentAddress(placeName);
        onLocationSelect({ lat: lngLat.lat, lng: lngLat.lng, address: placeName });
      });

      // Handle map click to place pin
      map.on('click', async (e) => {
        const { lat, lng } = e.lngLat;
        marker.setLngLat([lng, lat]);
        setCoords({ lat, lng });
        const placeName = await reverseGeocode(lat, lng);
        setCurrentAddress(placeName);
        onLocationSelect({ lat, lng, address: placeName });
      });

      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.warn('Mapbox picker init error:', err);
    }
  }, [token, latitude, longitude, reverseGeocode, onLocationSelect]);

  // Use Current GPS location button
  const handleUseCurrentLocation = async () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setCoords({ lat, lng });

        if (mapRef.current) {
          mapRef.current.flyTo({ center: [lng, lat], zoom: 15.5, essential: true });
        }

        if (markerRef.current) {
          markerRef.current.setLngLat([lng, lat]);
        }

        const placeName = await reverseGeocode(lat, lng);
        setCurrentAddress(placeName);
        onLocationSelect({ lat, lng, address: placeName });
        setLocating(false);
      },
      (err) => {
        console.warn('GPS location error:', err.message);
        alert('Could not detect your exact location. Please click or drag the pin on the map.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div
      style={{
        background: '#FAF8F5',
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 8,
        marginBottom: 16,
      }}
    >
      {/* Location Bar Header */}
      <div
        style={{
          padding: '12px 14px',
          background: '#F3EFE6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--color-primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label} • Drag Pin or Tap Map
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--color-text-dark)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: 2,
            }}
          >
            {currentAddress || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}
          </div>
        </div>

        {/* GPS Locate Me Button */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locating}
          style={{
            background: 'var(--color-primary)',
            color: '#FFFFFF',
            border: 'none',
            fontWeight: 800,
            fontSize: 11,
            padding: '6px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <LaundryIcons.Pin size={12} color="#FFFFFF" />
          <span>{locating ? 'Locating...' : 'Locate Me'}</span>
        </button>
      </div>

      {/* Map Container */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: 240,
        }}
      />
    </div>
  );
}
