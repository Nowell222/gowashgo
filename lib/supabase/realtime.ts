'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Order, OrderStatusEvent, RiderLocation } from '@/lib/types';

/**
 * Hook to subscribe to real-time changes on an Order and its Status Events.
 */
export function useOrderRealtime(
  orderId: string | null | undefined,
  callbacks: {
    onOrderUpdate?: (updatedOrder: Partial<Order>) => void;
    onNewStatusEvent?: (event: OrderStatusEvent) => void;
  }
) {
  useEffect(() => {
    if (!orderId) return;

    const supabase = createClient();

    // 1. Channel for orders table updates
    const channel = supabase
      .channel(`order_realtime_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          if (callbacks.onOrderUpdate && payload.new) {
            callbacks.onOrderUpdate(payload.new as Partial<Order>);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_status_events',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          if (callbacks.onNewStatusEvent && payload.new) {
            callbacks.onNewStatusEvent(payload.new as OrderStatusEvent);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, callbacks]);
}

/**
 * Hook to subscribe to live GPS pings for a specific order.
 */
export function useRiderLocationRealtime(
  orderId: string | null | undefined,
  onLocationPing: (location: RiderLocation) => void
) {
  useEffect(() => {
    if (!orderId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`rider_location_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rider_locations',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          if (payload.new) {
            onLocationPing(payload.new as RiderLocation);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, onLocationPing]);
}
