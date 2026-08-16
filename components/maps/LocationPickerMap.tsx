'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

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
          width: 40px;
          height: 40px;
          background: #0284C7;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #FFFFFF;
          box-shadow: 0 6px 18px rgba(2, 132, 199, 0.45);
          cursor: grab;
        ">
          <div style="transform: rotate(45deg); font-size: 16px;">📍</div>
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
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #BAE6FD',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(14, 165, 233, 0.08)',
      marginTop: 8,
      marginBottom: 16,
    }}>
      {/* Location Bar Header */}
      <div style={{
        padding: '12px 14px',
        background: '#F0F9FF',
        borderBottom: '1px solid #BAE6FD',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10, color: '#0369A1', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {label} • Drag Pin or Click Map
          </div>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#0F172A',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginTop: 2,
          }}>
            {currentAddress || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}
          </div>
        </div>

        {/* GPS Locate Me Button */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locating}
          className="btn btn--secondary btn--sm"
          style={{
            background: '#FFFFFF',
            border: '1px solid #0284C7',
            color: '#0284C7',
            fontWeight: 700,
            fontSize: 11,
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            boxShadow: '0 2px 4px rgba(2, 132, 199, 0.1)',
            flexShrink: 0,
          }}
        >
          {locating ? '📡 Locating...' : '🎯 Locate Me'}
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
