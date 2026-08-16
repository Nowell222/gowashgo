import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createPaymentIntent, isPayMongoConfigured } from '@/lib/payments/paymongo';
import { z } from 'zod/v4';

const createIntentSchema = z.object({
  order_id: z.string().min(1, 'Order ID is required'),
});

/**
 * POST /api/payments/intent
 * Generate a PayMongo payment intent for an order.
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
    const parseResult = createIntentSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parseResult.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { order_id } = parseResult.data;

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, total, customer_id, status')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Order not found' } },
        { status: 404 }
      );
    }

    // Check ownership
    if (order.customer_id !== user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Generate Payment Intent (live or simulated)
    const intent = await createPaymentIntent({
      amount: order.total,
      description: `Payment for WashGo Laundry ${order.order_number}`,
      orderId: order.id,
      paymentMethods: ['gcash', 'paymaya', 'card'],
    });

    const serviceClient = createServiceClient();

    // Check if payment already exists for this order
    const { data: existingPayment } = await serviceClient
      .from('payments')
      .select('id')
      .eq('order_id', order.id)
      .maybeSingle();

    if (existingPayment) {
      await serviceClient
        .from('payments')
        .update({
          paymongo_payment_intent_id: intent.id,
          amount: order.total,
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPayment.id);
    } else {
      await serviceClient.from('payments').insert({
        order_id: order.id,
        paymongo_payment_intent_id: intent.id,
        amount: order.total,
        currency: 'PHP',
        status: 'pending',
      });
    }

    return NextResponse.json({
      data: {
        payment_intent_id: intent.id,
        client_key: intent.attributes.client_key,
        amount: order.total,
        currency: 'PHP',
        is_sandbox: !isPayMongoConfigured(),
      },
    });
  } catch (err: any) {
    console.error('Payment intent POST error:', err);
    return NextResponse.json(
      { error: { code: 'INTENT_ERROR', message: err.message || 'Failed to create payment intent' } },
      { status: 500 }
    );
  }
}
