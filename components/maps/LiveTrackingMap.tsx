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

  // Simulation mode (only if status is actually en route and simulating)
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

  // Initialize Mapbox GL Map
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

      map.on('load', () => {
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
          <div style="background: #10B981; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); animation: pulse 2s infinite;">
            📍
          </div>
          <div style="font-size: 10px; font-weight: 700; background: #FFFFFF; color: #0F172A; padding: 2px 6px; border-radius: 4px; border: 1px solid #CBD5E1; margin-top: 2px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            ${targetLabel}
          </div>
        `;
        targetMarkerRef.current = new mapboxgl.Marker({ element: targetEl })
          .setLngLat([targetLocation.lng, targetLocation.lat])
          .addTo(map);

        // 3. Live Rider Marker (Only if a rider is assigned)
        if (showRiderMarker && currentRiderPos) {
          const riderEl = document.createElement('div');
          riderEl.className = 'mapbox-custom-pin rider-pin';
          riderEl.innerHTML = `
            <div style="background: #06B6D4; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 3px solid #FFFFFF; box-shadow: 0 4px 16px rgba(6, 182, 212, 0.5);">
              🏍️
            </div>
            <div style="font-size: 10px; font-weight: 700; background: #0F172A; color: #FFFFFF; padding: 2px 6px; border-radius: 4px; margin-top: 2px; white-space: nowrap;">
              ${riderName || 'Rider'}
            </div>
          `;
          riderMarkerRef.current = new mapboxgl.Marker({ element: riderEl })
            .setLngLat([currentRiderPos.lng, currentRiderPos.lat])
            .addTo(map);
        }

        // 4. Add Route Polyline
        const coordinates = (showRiderMarker && currentRiderPos)
          ? [
              [branchLocation.lng, branchLocation.lat],
              [currentRiderPos.lng, currentRiderPos.lat],
              [targetLocation.lng, targetLocation.lat],
            ]
          : [
              [branchLocation.lng, branchLocation.lat],
              [targetLocation.lng, targetLocation.lat],
            ];

        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates,
            },
          },
        });

        map.addLayer({
          id: 'route-line-bg',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#BAE6FD',
            'line-width': 8,
            'line-opacity': 0.6,
          },
        });

        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': isEnRoute ? '#0284C7' : '#94A3B8',
            'line-width': 4,
            'line-dasharray': [2, 1.5],
          },
        });

        // Fit bounds
        const bounds = new mapboxgl.LngLatBounds();
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
  }, [token, branchLocation.lat, branchLocation.lng, targetLocation.lat, targetLocation.lng, showRiderMarker]);

  // Update Rider Marker position and route dynamically
  useEffect(() => {
    if (riderMarkerRef.current && currentRiderPos) {
      riderMarkerRef.current.setLngLat([currentRiderPos.lng, currentRiderPos.lat]);
    }

    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      const source = mapRef.current.getSource('route') as mapboxgl.GeoJSONSource | undefined;
      if (source) {
        const coordinates = (showRiderMarker && currentRiderPos)
          ? [
              [branchLocation.lng, branchLocation.lat],
              [currentRiderPos.lng, currentRiderPos.lat],
              [targetLocation.lng, targetLocation.lat],
            ]
          : [
              [branchLocation.lng, branchLocation.lat],
              [targetLocation.lng, targetLocation.lat],
            ];

        source.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates,
          },
        });
      }
    }
  }, [currentRiderPos, branchLocation, targetLocation, showRiderMarker]);

  // Determine HUD Title & Subtitle based on status
  function getHudContent() {
    switch (orderStatus) {
      case 'pending':
        return {
          badge: '⏳ Pending Confirmation',
          badgeColor: '#D97706',
          title: 'Awaiting Branch Confirmation',
          subtitle: 'Branch staff is reviewing your booking',
          etaText: 'Queued',
        };
      case 'confirmed':
        return {
          badge: '📋 Order Confirmed',
          badgeColor: '#0284C7',
          title: 'Finding Available Rider',
          subtitle: 'Branch is assigning a nearby rider',
          etaText: 'Assigning',
        };
      case 'rider_assigned':
        return {
          badge: '🏍️ Rider Assigned',
          badgeColor: '#0284C7',
          title: `${riderName || 'Rider'} Assigned`,
          subtitle: 'Rider is preparing for pickup trip',
          etaText: '~10 mins',
        };
      case 'pickup_en_route':
        return {
          badge: '⚡ Live GPS Feed',
          badgeColor: '#10B981',
          title: `${riderName || 'Rider'} on the way`,
          subtitle: 'Heading to your pickup address',
          etaText: `~${etaMinutes} mins`,
        };
      case 'picked_up':
      case 'at_facility':
      case 'washing':
      case 'drying':
      case 'folding':
      case 'ready_for_delivery':
        return {
          badge: '🫧 Facility Processing',
          badgeColor: '#0284C7',
          title: 'Laundry at WashGo Facility',
          subtitle: 'Wash, dry, and fold in progress',
          etaText: 'In Facility',
        };
      case 'delivery_en_route':
        return {
          badge: '⚡ Out for Delivery',
          badgeColor: '#10B981',
          title: `${riderName || 'Rider'} Delivering`,
          subtitle: 'Clean laundry is on the way back',
          etaText: `~${etaMinutes} mins`,
        };
      case 'delivered':
      case 'completed':
        return {
          badge: '✓ Delivered',
          badgeColor: '#10B981',
          title: 'Order Completed',
          subtitle: 'Handed over successfully',
          etaText: 'Done',
        };
      default:
        return {
          badge: 'Tracking',
          badgeColor: '#64748B',
          title: 'Order Tracking',
          subtitle: 'Status updating...',
          etaText: '—',
        };
    }
  }

  const hud = getHudContent();

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 360,
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        border: '1px solid #BAE6FD',
        boxShadow: '0 8px 24px -4px rgba(14, 165, 233, 0.12), 0 2px 6px rgba(0,0,0,0.04)',
      }}
    >
      {/* Dynamic Map HUD Overlay */}
      <div style={{
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        padding: '10px 14px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 12px rgba(14, 165, 233, 0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="pulse-dot" style={{ background: hud.badgeColor }} />
          <div>
            <div style={{ fontSize: 10, color: hud.badgeColor, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {hud.badge}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
              {hud.title}
            </div>
            <div style={{ fontSize: 11, color: '#64748B' }}>
              {hud.subtitle}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>ETA</span>
          <div style={{ fontSize: 14, fontWeight: 800, color: hud.badgeColor }}>
            {hud.etaText}
          </div>
        </div>
      </div>

      {/* Real Mapbox Container */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}
