'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface GpsPing {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recorded_at: string;
  order_id?: string | null;
}

const OFFLINE_QUEUE_KEY = 'washgo_gps_offline_queue';
const EMIT_INTERVAL_MS = 6000; // Emit ping every 6 seconds

/**
 * Screen Wake Lock manager to keep screen active during deliveries.
 */
class WakeLockManager {
  private sentinel: any = null;

  async request(): Promise<boolean> {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) return false;
    try {
      this.sentinel = await (navigator as any).wakeLock.request('screen');
      this.sentinel.addEventListener('release', () => {
        this.sentinel = null;
      });
      return true;
    } catch {
      return false;
    }
  }

  release() {
    if (this.sentinel) {
      this.sentinel.release();
      this.sentinel = null;
    }
  }

  isActive(): boolean {
    return this.sentinel !== null;
  }
}

export const wakeLockManager = new WakeLockManager();

/**
 * Offline GPS Queue Helpers
 */
function getOfflineQueue(): GpsPing[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToOfflineQueue(ping: GpsPing) {
  if (typeof window === 'undefined') return;
  try {
    const queue = getOfflineQueue();
    queue.push(ping);
    // Keep max 50 pings in queue
    if (queue.length > 50) queue.shift();
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to save GPS ping to offline queue:', err);
  }
}

function clearOfflineQueue() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

/**
 * Emit GPS location ping to server.
 */
async function sendPingToServer(ping: GpsPing): Promise<boolean> {
  try {
    const res = await fetch('/api/riders/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ping),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Flush queued offline pings.
 */
async function flushOfflineQueue() {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  const remaining: GpsPing[] = [];
  for (const ping of queue) {
    const success = await sendPingToServer(ping);
    if (!success) {
      remaining.push(ping);
    }
  }

  if (remaining.length === 0) {
    clearOfflineQueue();
  } else {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  }
}

export interface UseRiderGpsOptions {
  activeOrderId?: string | null;
  enabled?: boolean;
  onLocationUpdate?: (lat: number, lng: number) => void;
}

/**
 * React Hook for Rider GPS Emission
 */
export function useRiderGpsTracker({
  activeOrderId = null,
  enabled = false,
  onLocationUpdate,
}: UseRiderGpsOptions) {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; accuracy: number | null } | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [pingsSent, setPingsSent] = useState(0);
  const [lastPingTime, setLastPingTime] = useState<Date | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastEmitTimeRef = useRef<number>(0);
  const latestPositionRef = useRef<GpsPing | null>(null);

  // Send ping helper with throttling
  const maybeEmitPing = useCallback(async (ping: GpsPing, force = false) => {
    const now = Date.now();
    if (!force && now - lastEmitTimeRef.current < EMIT_INTERVAL_MS) {
      return;
    }

    lastEmitTimeRef.current = now;
    const sent = await sendPingToServer(ping);

    if (sent) {
      setPingsSent((c) => c + 1);
      setLastPingTime(new Date());
      // Flush any backlog
      flushOfflineQueue();
    } else {
      saveToOfflineQueue(ping);
    }
  }, []);

  // Start GPS watching
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('geolocation' in navigator)) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTracking(false);
      wakeLockManager.release();
      setWakeLockActive(false);
      return;
    }

    setIsTracking(true);
    setGpsError(null);

    // Request wake lock to prevent sleep
    wakeLockManager.request().then((acquired) => {
      setWakeLockActive(acquired);
    });

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 10000,
    };

    const handleSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      setCurrentLocation({ lat: latitude, lng: longitude, accuracy });
      onLocationUpdate?.(latitude, longitude);

      const ping: GpsPing = {
        latitude,
        longitude,
        accuracy: accuracy || null,
        recorded_at: new Date(position.timestamp).toISOString(),
        order_id: activeOrderId,
      };

      latestPositionRef.current = ping;
      maybeEmitPing(ping);
    };

    const handleError = (error: GeolocationPositionError) => {
      console.warn('Geolocation watch error:', error.message);
      setGpsError(error.message);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      options
    );

    // Heartbeat timer to ensure emissions even when stationary
    const heartbeatTimer = setInterval(() => {
      if (latestPositionRef.current) {
        const pingWithUpdatedTime: GpsPing = {
          ...latestPositionRef.current,
          recorded_at: new Date().toISOString(),
          order_id: activeOrderId,
        };
        maybeEmitPing(pingWithUpdatedTime, true);
      }
    }, EMIT_INTERVAL_MS);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      clearInterval(heartbeatTimer);
      wakeLockManager.release();
      setIsTracking(false);
      setWakeLockActive(false);
    };
  }, [enabled, activeOrderId, maybeEmitPing, onLocationUpdate]);

  return {
    currentLocation,
    isTracking,
    wakeLockActive,
    pingsSent,
    lastPingTime,
    gpsError,
  };
}
