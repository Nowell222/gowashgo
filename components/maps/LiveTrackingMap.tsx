'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { OrderStatus } from '@/lib/types';

interface Point {
  lat: number;
  lng: number;
  label?: string;
}

interface LiveTrackingMapProps {
  branchLocation?: Point;
  targetLocation: Point; // Pickup or Delivery destination
  riderLocation?: Point | null;
  riderName?: string | null;
  orderStatus?: OrderStatus;
  targetLabel?: string;
  orderNumber?: string;
  etaMinutes?: number;
  isSimulating?: boolean;
}

export default function LiveTrackingMap({
  branchLocation = { lat: 13.8267, lng: 121.3969, label: 'WashGo Facility' },
  targetLocation,
  riderLocation,
  riderName,
  orderStatus = 'pending',
  targetLabel = 'Pickup Address',
  orderNumber,
  etaMinutes = 8,
  isSimulating = false,
}: LiveTrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const isMapLoadedRef = useRef(false);
  const hasFittedBoundsRef = useRef(false);

  const riderMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const branchMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const targetMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const simulationProgressRef = useRef(0.15);

  const [mapboxAvailable, setMapboxAvailable] = useState<boolean>(true);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [routeDurationMin, setRouteDurationMin] = useState<number | null>(null);

  const isEnRoute = ['pickup_en_route', 'delivery_en_route'].includes(orderStatus);
  const showRiderMarker = ['rider_assigned', 'pickup_en_route', 'delivery_en_route'].includes(orderStatus);

  const [currentRiderPos, setCurrentRiderPos] = useState<Point | null>(
    riderLocation || (showRiderMarker ? {
      lat: (branchLocation.lat + targetLocation.lat) / 2,
      lng: (branchLocation.lng + targetLocation.lng) / 2,
    } : null)
  );

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1Ijoibm93ZWxsMjIyIiwiYSI6ImNtcGdhM3VlZDA0cG4yc3BzOXYyZDJpNW4ifQ.J87ILbCpiz-C6E3al446eA';

  // Handle prop updates for rider location
  useEffect(() => {
    if (riderLocation) {
      setCurrentRiderPos(riderLocation);
    } else if (!showRiderMarker) {
      setCurrentRiderPos(null);
    }
  }, [riderLocation?.lat, riderLocation?.lng, showRiderMarker]);

  // Fetch real road navigation coordinates from Mapbox Directions API
  const fetchStreetRoute = useCallback(async (origin: Point, destination: Point): Promise<[number, number][]> => {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full&access_token=${token}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        setRouteDistanceKm(route.distance ? Number((route.distance / 1000).toFixed(1)) : null);
        setRouteDurationMin(route.duration ? Math.ceil(route.duration / 60) : null);
        return route.geometry.coordinates;
      }
    } catch (err) {
      console.warn('Failed to fetch road directions from Mapbox:', err);
    }

    // Fallback straight line
    return [
      [origin.lng, origin.lat],
      [destination.lng, destination.lat],
    ];
  }, [token]);

  // Smooth Simulation mode (persists progress across re-renders)
  useEffect(() => {
    if (!isEnRoute || !isSimulating || riderLocation) return;

    const interval = setInterval(() => {
      simulationProgressRef.current = (simulationProgressRef.current + 0.008) % 1;
      const progress = simulationProgressRef.current;
      const lat = branchLocation.lat + (targetLocation.lat - branchLocation.lat) * progress + Math.sin(progress * Math.PI) * 0.0008;
      const lng = branchLocation.lng + (targetLocation.lng - branchLocation.lng) * progress + Math.cos(progress * Math.PI) * 0.0006;
      setCurrentRiderPos({ lat, lng });
    }, 1500);

    return () => clearInterval(interval);
  }, [isEnRoute, isSimulating, branchLocation.lat, branchLocation.lng, targetLocation.lat, targetLocation.lng, !!riderLocation]);

  // Update Rider Marker position dynamically with smooth interpolation
  useEffect(() => {
    if (!mapRef.current || !isMapLoadedRef.current) return;

    if (currentRiderPos && showRiderMarker) {
      if (!riderMarkerRef.current) {
        const riderEl = document.createElement('div');
        riderEl.className = 'mapbox-custom-pin rider-pin';
        riderEl.style.transition = 'transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)';
        riderEl.innerHTML = `
          <div style="background: #0284C7; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 3px solid #FFFFFF; box-shadow: 0 4px 16px rgba(2, 132, 199, 0.6);">
            🏍️
          </div>
          <div style="font-size: 10px; font-weight: 800; background: #0F172A; color: #FFFFFF; padding: 2px 6px; border-radius: 4px; margin-top: 2px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.2); text-align: center;">
            ${riderName || 'Rider'}
          </div>
        `;
        riderMarkerRef.current = new mapboxgl.Marker({ element: riderEl })
          .setLngLat([currentRiderPos.lng, currentRiderPos.lat])
          .addTo(mapRef.current);
      } else {
        riderMarkerRef.current.setLngLat([currentRiderPos.lng, currentRiderPos.lat]);
      }
    } else if (riderMarkerRef.current) {
      riderMarkerRef.current.remove();
      riderMarkerRef.current = null;
    }
  }, [currentRiderPos?.lat, currentRiderPos?.lng, showRiderMarker, riderName]);

  // Update Branch and Target markers when coords change without re-creating map
  useEffect(() => {
    if (!mapRef.current || !isMapLoadedRef.current) return;

    if (branchMarkerRef.current) {
      branchMarkerRef.current.setLngLat([branchLocation.lng, branchLocation.lat]);
    }
    if (targetMarkerRef.current) {
      targetMarkerRef.current.setLngLat([targetLocation.lng, targetLocation.lat]);
    }
  }, [branchLocation.lat, branchLocation.lng, targetLocation.lat, targetLocation.lng]);

  // Update street route without rebuilding the map
  const updateRouteLine = useCallback(async () => {
    if (!mapRef.current || !isMapLoadedRef.current) return;
    const startPoint = (showRiderMarker && currentRiderPos) ? currentRiderPos : branchLocation;
    const streetCoordinates = await fetchStreetRoute(startPoint, targetLocation);

    const source = mapRef.current.getSource('street-route') as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: streetCoordinates,
        },
      });
    }

    // Only fit bounds on first successful load so it doesn't snap the user's camera
    if (!hasFittedBoundsRef.current && mapRef.current) {
      const bounds = new mapboxgl.LngLatBounds();
      streetCoordinates.forEach(([lng, lat]) => bounds.extend([lng, lat]));
      bounds.extend([branchLocation.lng, branchLocation.lat]);
      bounds.extend([targetLocation.lng, targetLocation.lat]);
      if (showRiderMarker && currentRiderPos) {
        bounds.extend([currentRiderPos.lng, currentRiderPos.lat]);
      }
      mapRef.current.fitBounds(bounds, { padding: { top: 70, bottom: 40, left: 40, right: 40 }, maxZoom: 15, duration: 1000 });
      hasFittedBoundsRef.current = true;
    }
  }, [branchLocation, targetLocation, showRiderMarker, currentRiderPos, fetchStreetRoute]);

  // Initialize Mapbox GL Map ONCE
  useEffect(() => {
    if (!mapContainerRef.current || !token) {
      setMapboxAvailable(false);
      return;
    }

    try {
      mapboxgl.accessToken = token;
      try {
        (mapboxgl as any).config.EVENTS_URL = null;
      } catch {}

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [targetLocation.lng, targetLocation.lat],
        zoom: 13.5,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

      map.on('load', async () => {
        mapRef.current = map;
        isMapLoadedRef.current = true;

        // 1. Branch Marker
        const branchEl = document.createElement('div');
        branchEl.className = 'mapbox-custom-pin branch-pin';
        branchEl.innerHTML = `
          <div style="background: #0E7490; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #FFFFFF;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="2" width="18" height="20" rx="3"/><circle cx="12" cy="13" r="5"/><circle cx="7" cy="5" r="1"/></svg>
          </div>
          <div style="font-size: 10px; font-weight: 800; background: #FFFFFF; color: #0E7490; padding: 2px 6px; border-radius: 4px; margin-top: 2px; white-space: nowrap; text-align: center;">
            ${branchLocation.label || 'Shop Branch'}
          </div>
        `;
        branchMarkerRef.current = new mapboxgl.Marker({ element: branchEl })
          .setLngLat([branchLocation.lng, branchLocation.lat])
          .addTo(map);

        // 2. Destination Marker (Customer)
        const targetEl = document.createElement('div');
        targetEl.className = 'mapbox-custom-pin target-pin';
        targetEl.innerHTML = `
          <div style="background: #D97706; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #FFFFFF;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
          </div>
          <div style="font-size: 10px; font-weight: 800; background: #FFFFFF; color: #D97706; padding: 2px 6px; border-radius: 4px; margin-top: 2px; white-space: nowrap; text-align: center;">
            ${targetLabel}
          </div>
        `;
        targetMarkerRef.current = new mapboxgl.Marker({ element: targetEl })
          .setLngLat([targetLocation.lng, targetLocation.lat])
          .addTo(map);

        // 3. Live Rider Marker (if already assigned)
        if (showRiderMarker && currentRiderPos) {
          const riderEl = document.createElement('div');
          riderEl.className = 'mapbox-custom-pin rider-pin';
          riderEl.style.transition = 'transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)';
          riderEl.innerHTML = `
            <div style="background: #0E7490; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid #FFFFFF;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M6 18h4l3-7h4"/><path d="M17 11h2l2 4v3h-3"/></svg>
            </div>
            <div style="font-size: 10px; font-weight: 800; background: #1C1917; color: #FFFFFF; padding: 2px 6px; border-radius: 4px; margin-top: 2px; white-space: nowrap; text-align: center;">
              ${riderName || 'Rider'}
            </div>
          `;
          riderMarkerRef.current = new mapboxgl.Marker({ element: riderEl })
            .setLngLat([currentRiderPos.lng, currentRiderPos.lat])
            .addTo(map);
        }

        // 4. Fetch Real Street Route
        const startPoint = (showRiderMarker && currentRiderPos) ? currentRiderPos : branchLocation;
        const streetCoordinates = await fetchStreetRoute(startPoint, targetLocation);

        map.addSource('street-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: streetCoordinates,
            },
          },
        });

        map.addLayer({
          id: 'street-route-bg',
          type: 'line',
          source: 'street-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#0284C7',
            'line-width': 8,
            'line-opacity': 0.25,
          },
        });

        map.addLayer({
          id: 'street-route-line',
          type: 'line',
          source: 'street-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': isEnRoute ? '#0284C7' : '#0369A1',
            'line-width': 4,
            'line-opacity': 0.9,
          },
        });

        // Initial smooth fitBounds
        if (!hasFittedBoundsRef.current) {
          const bounds = new mapboxgl.LngLatBounds();
          streetCoordinates.forEach(([lng, lat]) => bounds.extend([lng, lat]));
          bounds.extend([branchLocation.lng, branchLocation.lat]);
          bounds.extend([targetLocation.lng, targetLocation.lat]);
          if (showRiderMarker && currentRiderPos) {
            bounds.extend([currentRiderPos.lng, currentRiderPos.lat]);
          }
          map.fitBounds(bounds, { padding: { top: 70, bottom: 40, left: 40, right: 40 }, maxZoom: 15, duration: 1000 });
          hasFittedBoundsRef.current = true;
        }
      });

      return () => {
        isMapLoadedRef.current = false;
        hasFittedBoundsRef.current = false;
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.warn('Mapbox GL initialization fallback:', err);
      setMapboxAvailable(false);
    }
  }, [token]);

  // Recenter map helper button
  const handleRecenter = () => {
    if (!mapRef.current) return;
    const target = currentRiderPos || targetLocation;
    mapRef.current.easeTo({
      center: [target.lng, target.lat],
      zoom: 14.5,
      duration: 800,
    });
  };

  const effectiveEta = routeDurationMin || etaMinutes;

  return (
    <div style={{
      position: 'relative',
      borderRadius: 18,
      overflow: 'hidden',
      background: '#F3EFE6',
      height: 320,
    }}>
      {/* Floating Status & ETA Card */}
      <div style={{
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        zIndex: 10,
        background: 'rgba(255, 255, 255, 0.96)',
        borderRadius: 14,
        padding: '10px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: isEnRoute ? '#10B981' : 'var(--color-primary)',
          }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isEnRoute ? 'Live Courier En Route' : 'Courier Route'}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-dark)' }}>
              {orderNumber ? `${orderNumber} • ` : ''}{targetLabel}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
            {routeDistanceKm ? `${routeDistanceKm} km away` : 'Estimated Arrival'}
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-mono)', color: isEnRoute ? '#059669' : 'var(--color-primary)' }}>
            ~{effectiveEta} mins
          </div>
        </div>
      </div>

      {/* Recenter Button */}
      {mapboxAvailable && (
        <button
          type="button"
          onClick={handleRecenter}
          style={{
            position: 'absolute',
            bottom: 14,
            left: 14,
            zIndex: 10,
            background: '#FFFFFF',
            border: 'none',
            borderRadius: 20,
            padding: '6px 14px',
            fontSize: '11px',
            fontWeight: 800,
            color: 'var(--color-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>Recenter Map</span>
        </button>
      )}

      {/* Mapbox Canvas */}
      {mapboxAvailable ? (
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      ) : (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F3EFE6',
          padding: 20,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-dark)' }}>
            Live Street Navigation Active
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
            Rider is en route to {targetLabel} ({effectiveEta} mins ETA)
          </div>
        </div>
      )}
    </div>
  );
}
