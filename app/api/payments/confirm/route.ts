import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { dispatchNotification } from '@/lib/notifications/dispatcher';
import { formatPeso } from '@/lib/utils/currency';
import { z } from 'zod/v4';

const confirmPaymentSchema = z.object({
  order_id: z.string().min(1, 'Order ID is required'),
  payment_method: z.enum(['gcash', 'paymaya', 'card', 'cod']),
  payment_intent_id: z.string().optional(),
});

/**
 * POST /api/payments/confirm
 * Confirms payment completion (or logs cash-on-delivery preference) and issues receipt.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parseResult = confirmPaymentSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid payment confirmation payload', details: parseResult.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { order_id, payment_method, payment_intent_id } = parseResult.data;

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, total, customer_id')
      .eq('id', order_id)
      .single();

    if (orderError || !order || order.customer_id !== user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Order access denied' } },
        { status: 403 }
      );
    }

    const serviceClient = createServiceClient();
    const isCOD = payment_method === 'cod';
    const isPaid = !isCOD;
    const now = new Date().toISOString();

    // Check if existing payment record exists for this order
    const { data: existingPayment } = await serviceClient
      .from('payments')
      .select('id')
      .eq('order_id', order.id)
      .maybeSingle();

    let payment;
    if (existingPayment) {
      const { data: updated, error: updateError } = await serviceClient
        .from('payments')
        .update({
          paymongo_payment_intent_id: payment_intent_id || `intent_${order.id}`,
          paymongo_payment_id: isPaid ? `pay_${Date.now()}` : null,
          amount: order.total,
          currency: 'PHP',
          status: isPaid ? 'paid' : 'pending',
          payment_method,
          paid_at: isPaid ? now : null,
          updated_at: now,
        })
        .eq('id', existingPayment.id)
        .select()
        .single();

      if (updateError || !updated) {
        console.error('Payment update error:', updateError);
        return NextResponse.json(
          { error: { code: 'CONFIRM_FAILED', message: updateError?.message || 'Failed to update payment record' } },
          { status: 500 }
        );
      }
      payment = updated;
    } else {
      const { data: inserted, error: insertError } = await serviceClient
        .from('payments')
        .insert({
          order_id: order.id,
          paymongo_payment_intent_id: payment_intent_id || `intent_${order.id}`,
          paymongo_payment_id: isPaid ? `pay_${Date.now()}` : null,
          amount: order.total,
          currency: 'PHP',
          status: isPaid ? 'paid' : 'pending',
          payment_method,
          paid_at: isPaid ? now : null,
        })
        .select()
        .single();

      if (insertError || !inserted) {
        console.error('Payment insert error:', insertError);
        return NextResponse.json(
          { error: { code: 'CONFIRM_FAILED', message: insertError?.message || 'Failed to create payment record' } },
          { status: 500 }
        );
      }
      payment = inserted;
    }

    // Send receipt notification
    dispatchNotification({
      userId: user.id,
      orderId: order.id,
      title: isPaid ? 'Payment Confirmed 💳' : 'Cash on Delivery Selected 💵',
      body: isPaid
        ? `Payment of ${formatPeso(order.total)} via ${payment_method.toUpperCase()} was received for order ${order.order_number}.`
        : `Your payment mode is set to Cash on Delivery (${formatPeso(order.total)}) for order ${order.order_number}.`,
    }).catch(() => {});

    return NextResponse.json({
      data: {
        payment,
        receipt: {
          order_number: order.order_number,
          amount: formatPeso(order.total),
          payment_method,
          status: payment.status,
          paid_at: payment.paid_at,
        },
      },
    });
  } catch (err) {
    console.error('Payment confirm error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
