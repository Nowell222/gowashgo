import { createServiceClient } from '@/lib/supabase/server';
import type { OrderStatus, NotificationChannel } from '@/lib/types';

interface NotificationPayload {
  userId: string;
  orderId?: string | null;
  title: string;
  body: string;
  channel?: NotificationChannel;
}

/**
 * Dispatch an in-app and web-push notification to a user.
 */
export async function dispatchNotification(payload: NotificationPayload) {
  const {
    userId,
    orderId = null,
    title,
    body,
    channel = 'web_push',
  } = payload;

  try {
    const serviceClient = createServiceClient();

    // 1. Insert into notifications table
    const { data: notification, error } = await serviceClient
      .from('notifications')
      .insert({
        user_id: userId,
        order_id: orderId,
        title,
        body,
        channel,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create in-app notification:', error);
      return null;
    }

    // 2. In pilot mode, Web Push & SMS logs are emitted to console / audit log
    console.log(`[Notification Dispatched] -> User: ${userId} | Channel: ${channel} | "${title}: ${body}"`);

    return notification;
  } catch (err) {
    console.error('Notification dispatch error:', err);
    return null;
  }
}

interface OrderStatusNotificationOptions {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  customerId: string;
  riderName?: string | null;
  branchName?: string | null;
}

/**
 * Helper to dispatch automated notifications on order status transitions.
 */
export async function dispatchOrderStatusNotification(options: OrderStatusNotificationOptions) {
  const { orderId, orderNumber, status, customerId, riderName, branchName } = options;

  let title = '';
  let body = '';

  switch (status) {
    case 'confirmed':
      title = 'Order Confirmed ✅';
      body = `Your order ${orderNumber} has been confirmed by ${branchName || 'the branch'}. A rider will be assigned shortly.`;
      break;

    case 'rider_assigned':
      title = 'Rider Assigned 🏍️';
      body = `${riderName || 'A driver'} has been assigned to pick up your laundry for order ${orderNumber}.`;
      break;

    case 'pickup_en_route':
      title = 'Rider Approaching 📍';
      body = `${riderName || 'Your rider'} is on the way to your pickup address. Please have your laundry ready!`;
      break;

    case 'picked_up':
      title = 'Laundry Picked Up 🧺';
      body = `Order ${orderNumber} was collected and is heading to our washing facility.`;
      break;

    case 'at_facility':
      title = 'Arrived at Facility 🏪';
      body = `Your laundry has arrived at our shop and is being sorted for optimal AI wash care.`;
      break;

    case 'washing':
      title = 'Washing Started 🫧';
      body = `Your clothes are currently in the washing machine using custom fabric-safe temperature and cycles.`;
      break;

    case 'drying':
      title = 'Drying in Progress 💨';
      body = `Your items have moved to the drying cycle.`;
      break;

    case 'folding':
      title = 'Folding & Quality Inspection 👕';
      body = `Your clean laundry is being neatly folded and packaged for delivery.`;
      break;

    case 'ready_for_delivery':
      title = 'Ready for Dispatch 📦';
      body = `Order ${orderNumber} is clean, packed, and awaiting rider dispatch.`;
      break;

    case 'delivery_en_route':
      title = 'Out for Delivery 🛵';
      body = `Hold tight! ${riderName || 'Your rider'} is on the way to your delivery address with your clean clothes.`;
      break;

    case 'delivered':
      title = 'Delivered 🎉';
      body = `Your laundry has been delivered! Enjoy your fresh, clean clothes.`;
      break;

    case 'completed':
      title = 'Order Completed ⭐';
      body = `Thank you for choosing WashGo! We hope to serve you again soon.`;
      break;

    case 'cancelled':
      title = 'Order Cancelled ❌';
      body = `Order ${orderNumber} has been cancelled.`;
      break;

    default:
      return;
  }

  return dispatchNotification({
    userId: customerId,
    orderId,
    title,
    body,
    channel: 'web_push',
  });
}
