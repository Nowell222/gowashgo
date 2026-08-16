'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  const riderMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const branchMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const targetMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [mapboxAvailable, setMapboxAvailable] = useState<boolean>(true);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [routeDurationMin, setRouteDurationMin] = useState<number | null>(null);

  // Is a rider actually assigned and moving?
  const hasRider = Boolean(riderName || riderLocation);
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
  }, [riderLocation, showRiderMarker]);

  // Fetch real road navigation coordinates from Mapbox Directions API
  async function fetchStreetRoute(origin: Point, destination: Point): Promise<[number, number][]> {
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

    // Fallback straight line if directions query fails
    return [
      [origin.lng, origin.lat],
      [destination.lng, destination.lat],
    ];
  }

  // Simulation mode (moves rider along realistic path)
  useEffect(() => {
    if (!isEnRoute || !isSimulating || riderLocation) return;

    let progress = 0.15;
    const interval = setInterval(() => {
      progress = (progress + 0.02) % 1;
      const lat = branchLocation.lat + (targetLocation.lat - branchLocation.lat) * progress + Math.sin(progress * Math.PI) * 0.001;
      const lng = branchLocation.lng + (targetLocation.lng - branchLocation.lng) * progress + Math.cos(progress * Math.PI) * 0.0008;
      setCurrentRiderPos({ lat, lng });
    }, 2000);

    return () => clearInterval(interval);
  }, [isEnRoute, isSimulating, branchLocation, targetLocation, riderLocation]);

  // Update Rider Marker position dynamically
  useEffect(() => {
    if (!mapRef.current) return;

    if (currentRiderPos && showRiderMarker) {
      if (!riderMarkerRef.current) {
        const riderEl = document.createElement('div');
        riderEl.className = 'mapbox-custom-pin rider-pin';
        riderEl.innerHTML = `
          <div style="background: #0284C7; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 3px solid #FFFFFF; box-shadow: 0 4px 16px rgba(2, 132, 199, 0.6); animation: bounce 1.5s infinite;">
            🏍️
          </div>
          <div style="font-size: 10px; font-weight: 800; background: #0F172A; color: #FFFFFF; padding: 2px 6px; border-radius: 4px; margin-top: 2px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">
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
  }, [currentRiderPos, showRiderMarker, riderName]);

  // Initialize Mapbox GL Map & Road Route
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

        // 1. Branch Marker
        const branchEl = document.createElement('div');
        branchEl.className = 'mapbox-custom-pin branch-pin';
        branchEl.innerHTML = `
          <div style="background: #0284C7; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.4);">
            🏪
          </div>
          <div style="font-size: 10px; font-weight: 700; background: #FFFFFF; color: #0F172A; padding: 2px 6px; border-radius: 4px; border: 1px solid #CBD5E1; margin-top: 2px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            ${branchLocation.label || 'Branch'}
          </div>
        `;
        branchMarkerRef.current = new mapboxgl.Marker({ element: branchEl })
          .setLngLat([branchLocation.lng, branchLocation.lat])
          .addTo(map);

        // 2. Destination Marker (Customer)
        const targetEl = document.createElement('div');
        targetEl.className = 'mapbox-custom-pin target-pin';
        targetEl.innerHTML = `
          <div style="background: #10B981; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);">
            📍
          </div>
          <div style="font-size: 10px; font-weight: 700; background: #FFFFFF; color: #0F172A; padding: 2px 6px; border-radius: 4px; border: 1px solid #CBD5E1; margin-top: 2px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
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
          riderEl.innerHTML = `
            <div style="background: #0284C7; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 3px solid #FFFFFF; box-shadow: 0 4px 16px rgba(2, 132, 199, 0.6); animation: bounce 1.5s infinite;">
              🏍️
            </div>
            <div style="font-size: 10px; font-weight: 800; background: #0F172A; color: #FFFFFF; padding: 2px 6px; border-radius: 4px; margin-top: 2px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">
              ${riderName || 'Rider'}
            </div>
          `;
          riderMarkerRef.current = new mapboxgl.Marker({ element: riderEl })
            .setLngLat([currentRiderPos.lng, currentRiderPos.lat])
            .addTo(map);
        }

        // 4. Fetch Real Street Route from Mapbox Directions API
        const startPoint = (showRiderMarker && currentRiderPos) ? currentRiderPos : branchLocation;
        const streetCoordinates = await fetchStreetRoute(startPoint, targetLocation);

        // Add Route GeoJSON Source
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

        // Background Route Line (Soft Glowing Blue)
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

        // Foreground Active Driving Line (Crisp Blue)
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

        // Fit bounds to fit the whole road network
        const bounds = new mapboxgl.LngLatBounds();
        streetCoordinates.forEach(([lng, lat]) => bounds.extend([lng, lat]));
        bounds.extend([branchLocation.lng, branchLocation.lat]);
        bounds.extend([targetLocation.lng, targetLocation.lat]);
        if (showRiderMarker && currentRiderPos) {
          bounds.extend([currentRiderPos.lng, currentRiderPos.lat]);
        }
        map.fitBounds(bounds, { padding: { top: 70, bottom: 40, left: 40, right: 40 }, maxZoom: 15 });
      });

      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.warn('Mapbox GL initialization fallback:', err);
      setMapboxAvailable(false);
    }
  }, [branchLocation, targetLocation, token]);

  const effectiveEta = routeDurationMin || etaMinutes;

  return (
    <div style={{
      position: 'relative',
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
      border: '1.5px solid #BAE6FD',
      background: '#F8FAFC',
      height: 320,
    }}>
      {/* Floating Status & ETA Card */}
      <div style={{
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        zIndex: 10,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 'var(--radius-lg)',
        padding: '10px 14px',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.12)',
        border: '1px solid rgba(186, 230, 253, 0.8)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: isEnRoute ? '#10B981' : '#0284C7',
            boxShadow: isEnRoute ? '0 0 10px #10B981' : 'none',
          }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {isEnRoute ? '🚀 Live Navigation En Route' : '📍 Courier Route'}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
              {orderNumber ? `${orderNumber} • ` : ''}{targetLabel}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>
            {routeDistanceKm ? `${routeDistanceKm} km away` : 'Estimated Arrival'}
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: isEnRoute ? '#059669' : '#0284C7' }}>
            ~{effectiveEta} mins
          </div>
        </div>
      </div>

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
          background: '#F0F9FF',
          padding: 20,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🗺️</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
            Live Street Navigation Active
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
            Rider is en route to {targetLabel} ({effectiveEta} mins ETA)
          </div>
        </div>
      )}
    </div>
  );
}
