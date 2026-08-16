import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyWebhookSignature } from '@/lib/payments/paymongo';
import { dispatchNotification } from '@/lib/notifications/dispatcher';
import { formatPeso } from '@/lib/utils/currency';

/**
 * POST /api/webhooks/paymongo
 * Handles PayMongo webhooks (payment.paid, payment.failed, etc.)
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get('paymongo-signature') || '';
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;

    // Verify signature in production if secret is configured
    if (webhookSecret && !verifyWebhookSignature(rawBody, signatureHeader, webhookSecret)) {
      console.warn('Invalid PayMongo webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const eventType = payload.data?.attributes?.type;
    const eventData = payload.data?.attributes?.data;

    console.log(`[PayMongo Webhook Received] -> Type: ${eventType}`);

    if (eventType === 'payment.paid' || eventType === 'payment_intent.succeeded') {
      const paymentIntentId = eventData?.attributes?.payment_intent_id || eventData?.id;
      const paymentId = eventData?.id;
      const orderId = eventData?.attributes?.metadata?.order_id;
      const amount = eventData?.attributes?.amount;

      if (orderId || paymentIntentId) {
        const serviceClient = createServiceClient();

        // Update payment row
        const query = serviceClient
          .from('payments')
          .update({
            status: 'paid',
            paymongo_payment_id: paymentId,
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (orderId) {
          await query.eq('order_id', orderId);
        } else {
          await query.eq('paymongo_payment_intent_id', paymentIntentId);
        }

        // Notify customer
        if (orderId) {
          const { data: order } = await serviceClient
            .from('orders')
            .select('customer_id, order_number, total')
            .eq('id', orderId)
            .single();

          if (order) {
            dispatchNotification({
              userId: order.customer_id,
              orderId,
              title: 'Payment Received ✅',
              body: `We have received your payment of ${formatPeso(order.total)} for order ${order.order_number}.`,
            }).catch(() => {});
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('PayMongo Webhook error:', err);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
