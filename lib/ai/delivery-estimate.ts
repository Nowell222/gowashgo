import type { DeliveryEstimate } from '@/lib/types';

interface DeliveryEstimateInput {
  branch_latitude: number;
  branch_longitude: number;
  delivery_latitude: number;
  delivery_longitude: number;
  base_processing_minutes: number;
  current_order_load: number;
  time_of_day?: Date;
}

/**
 * Heuristic delivery time estimate.
 * Uses Haversine distance + queue load + rush hour multiplier + buffer.
 *
 * Not a trained model — this is a transparent formula for the pilot.
 * Historical delivery data collected during the pilot can refine this later.
 */
export function getDeliveryEstimate(input: DeliveryEstimateInput): DeliveryEstimate {
  const {
    branch_latitude,
    branch_longitude,
    delivery_latitude,
    delivery_longitude,
    base_processing_minutes,
    current_order_load,
    time_of_day = new Date(),
  } = input;

  // 1. Processing time (base + queue)
  const processing_min = base_processing_minutes;
  const queue_min = current_order_load * 10; // 10 min per order ahead in queue

  // 2. Driving time
  const distance_km = haversineDistance(
    branch_latitude,
    branch_longitude,
    delivery_latitude,
    delivery_longitude
  );

  const AVG_SPEED_KMH = 20; // Conservative urban delivery speed
  let driving_min = (distance_km / AVG_SPEED_KMH) * 60;

  // Rush hour multiplier (7-9 AM, 5-7 PM)
  const hour = time_of_day.getHours();
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  if (isRushHour) {
    driving_min *= 1.5;
  }

  driving_min = Math.round(driving_min);

  // 3. Buffer
  const buffer_min = 15;

  // 4. Total
  const total_min = processing_min + queue_min + driving_min + buffer_min;

  // Calculate estimated delivery time
  const estimated_delivery_at = new Date(time_of_day.getTime() + total_min * 60 * 1000);

  return {
    estimated_delivery_at: estimated_delivery_at.toISOString(),
    breakdown: {
      processing_min,
      queue_min,
      driving_min,
      buffer_min,
      total_min,
    },
  };
}

/**
 * Haversine formula — calculates the great-circle distance between two points
 * on the Earth's surface, given their latitudes and longitudes in degrees.
 * Returns distance in kilometers.
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
