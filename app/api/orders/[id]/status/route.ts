import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { updateOrderStatusSchema } from '@/lib/validators/orders';
import { canPerformTransition } from '@/lib/orders/status-machine';
import { dispatchOrderStatusNotification } from '@/lib/notifications/dispatcher';
import { getWashRecommendation } from '@/lib/ai/wash-recommendation';
import type { UserRole, OrderStatus } from '@/lib/types';

/**
 * PATCH /api/orders/[id]/status
 * Update an order's status.
 * Enforces:
 * 1. Role permissions and valid status state transitions.
 * 2. Counter weighing & intake calculation at 'at_facility'.
 * 3. Payment-gated completion rule on 'delivered'.
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<'/api/orders/[id]/status'>
) {
  try {
    const { id } = await ctx.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role, branch_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User profile not found' } },
        { status: 404 }
      );
    }

    const role = profile.role as UserRole;
    const body = await request.json();
    const parseResult = updateOrderStatusSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid status payload', details: parseResult.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { status: targetStatus, note, weight_kg, cash_collected, delivery_proof_url, intake } = parseResult.data;

    // Fetch existing order with branch & rider info
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, order_number, status, branch_id, customer_id, rider_id, payment_method,
        weight_kg, cash_collected, delivery_proof_url, delivery_fee, subtotal, total,
        branch:branches(id, name, price_per_kg),
        rider:users!orders_rider_id_fkey(full_name)
      `)
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Order not found' } },
        { status: 404 }
      );
    }

    // Check branch / user permission for this order
    if (role === 'customer' && order.customer_id !== user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    if (role === 'rider' && order.rider_id !== user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You are not assigned to this order' } },
        { status: 403 }
      );
    }

    if ((role === 'staff' || role === 'branch_manager') && order.branch_id !== profile.branch_id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied to orders from other branches' } },
        { status: 403 }
      );
    }

    const currentStatus = order.status as OrderStatus;

    // Check status transition validity for this role
    if (!canPerformTransition(currentStatus, targetStatus as OrderStatus, role)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_TRANSITION',
            message: `Transition from '${currentStatus}' to '${targetStatus}' is not allowed for role '${role}'`,
          },
        },
        { status: 422 }
      );
    }

    const serviceClient = createServiceClient();
    const updatePayload: Record<string, any> = {
      status: targetStatus,
      updated_at: new Date().toISOString(),
    };

    // =========================================================================
    // Rule A: Counter Intake & Weighing (at 'at_facility' or moving to 'washing')
    // =========================================================================
    const effectiveWeight = intake?.weight_kg || weight_kg;
    if (effectiveWeight) {
      const pricePerKg = (order.branch as any)?.price_per_kg || 3500;
      const subtotalCentavos = Math.round(effectiveWeight * pricePerKg);
      const deliveryFee = order.delivery_fee || 5000;
      const totalCentavos = subtotalCentavos + deliveryFee;

      updatePayload.weight_kg = effectiveWeight;
      updatePayload.subtotal = subtotalCentavos;
      updatePayload.total = totalCentavos;

      // If staff logged garment composition tags, insert inspected items
      if (intake) {
        const clothingType = intake.clothing_types?.[0] || 'shirt';
        const fabricType = intake.fabric_types?.[0] || 'cotton';
        const colorCat = intake.color_categories?.[0] || 'mixed';

        const recommendation = getWashRecommendation({
          clothing_type: clothingType,
          fabric_type: fabricType,
          color_category: colorCat,
          has_stains: intake.has_stains || false,
          stain_description: intake.stain_description || undefined,
        });

        // Insert staff inspection manifest item
        await serviceClient.from('order_items').insert({
          order_id: id,
          clothing_type: clothingType,
          fabric_type: fabricType,
          color_category: colorCat,
          quantity: Math.max(1, Math.round(effectiveWeight * 3)), // Approximate garment count
          has_stains: intake.has_stains || false,
          stain_description: intake.stain_description || intake.notes || null,
          wash_recommendation: recommendation,
          unit_price: subtotalCentavos,
        });
      }
    }

    // =========================================================================
    // Rule B: Single Payment-Gated Completion Rule (on transition to 'delivered')
    // =========================================================================
    if (targetStatus === 'delivered') {
      const effectiveProof = delivery_proof_url || order.delivery_proof_url;
      const effectiveCashCollected = cash_collected !== undefined ? cash_collected : order.cash_collected;

      if (delivery_proof_url) {
        updatePayload.delivery_proof_url = delivery_proof_url;
      }
      if (cash_collected !== undefined) {
        updatePayload.cash_collected = cash_collected;
      }

      // 1. Payment Verification Check
      if (order.payment_method === 'online') {
        const { data: payments } = await serviceClient
          .from('payments')
          .select('status')
          .eq('order_id', id)
          .eq('status', 'paid');

        if (!payments || payments.length === 0) {
          return NextResponse.json(
            {
              error: {
                code: 'PAYMENT_REQUIRED',
                message: 'Online payment has not been completed by the customer yet.',
              },
            },
            { status: 400 }
          );
        }
      } else if (order.payment_method === 'cash') {
        if (!effectiveCashCollected) {
          return NextResponse.json(
            {
              error: {
                code: 'CASH_NOT_COLLECTED',
                message: 'Rider must confirm cash collection before completing delivery.',
              },
            },
            { status: 400 }
          );
        }
      }

      // 2. Mandatory Proof of Delivery Photo (for all payment methods)
      if (!effectiveProof) {
        return NextResponse.json(
          {
            error: {
              code: 'PROOF_REQUIRED',
              message: 'A delivery handover proof photo is required to complete delivery.',
            },
          },
          { status: 400 }
        );
      }
    }

    // Apply update to order
    const { data: updatedOrder, error: updateError } = await serviceClient
      .from('orders')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedOrder) {
      console.error('Update order status error:', updateError);
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: updateError?.message || 'Failed to update order status' } },
        { status: 500 }
      );
    }

    // Record status event
    await serviceClient.from('order_status_events').insert({
      order_id: id,
      status: targetStatus,
      changed_by: user.id,
      note: note || (effectiveWeight ? `Weighed at ${effectiveWeight} kg` : null),
    });

    // Dispatch customer notifications
    const branchName = Array.isArray(order.branch) ? order.branch[0]?.name : (order.branch as any)?.name;
    const riderName = Array.isArray(order.rider) ? order.rider[0]?.full_name : (order.rider as any)?.full_name;

    dispatchOrderStatusNotification({
      orderId: id,
      orderNumber: order.order_number,
      status: targetStatus,
      customerId: order.customer_id,
      riderName: riderName || null,
      branchName: branchName || null,
    }).catch((err) => console.error('Background notification dispatch failed:', err));

    return NextResponse.json({
      data: {
        order: updatedOrder,
        previous_status: currentStatus,
        new_status: targetStatus,
      },
    });
  } catch (err: any) {
    console.error('Order status PATCH error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err?.message || 'Internal server error' } },
      { status: 500 }
    );
  }
}
