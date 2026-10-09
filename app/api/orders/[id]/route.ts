import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/types';

/**
 * GET /api/orders/[id]
 * Fetch single order with its items, status history events, customer, rider, and branch info.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/orders/[id]'>
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

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:users!orders_customer_id_fkey(id, full_name, email, phone, avatar_url),
        rider:users!orders_rider_id_fkey(id, full_name, phone, avatar_url),
        branch:branches(id, name, address, latitude, longitude, phone),
        order_items(*),
        payments:payments(*),
        status_events:order_status_events(
          id, status, note, created_at,
          user:users(id, full_name, role)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Order not found' } },
        { status: 404 }
      );
    }

    // Authorization check
    if (role === 'customer' && order.customer_id !== user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    if (role === 'rider' && order.rider_id !== user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    if ((role === 'staff' || role === 'branch_manager') && order.branch_id !== profile.branch_id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied to orders from other branches' } },
        { status: 403 }
      );
    }

    // Sort status events chronologically
    if (order.status_events && Array.isArray(order.status_events)) {
      order.status_events.sort(
        (a: { created_at: string }, b: { created_at: string }) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }

    return NextResponse.json({ data: order });
  } catch (err) {
    console.error('Order detail GET error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orders/[id]
 * Allows updating payment_method or notes for an active order
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<'/api/orders/[id]'>
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

    const body = await request.json();
    const { payment_method, special_instructions } = body;

    const updates: Record<string, any> = {};
    if (payment_method && ['cod', 'online', 'cash'].includes(payment_method)) {
      updates.payment_method = payment_method === 'cod' ? 'cash' : payment_method;
    }
    if (typeof special_instructions === 'string') {
      updates.special_instructions = special_instructions;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'No valid fields provided for update' } },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();
    const { data: existingOrder } = await serviceClient
      .from('orders')
      .select('customer_id, rider_id, branch_id')
      .eq('id', id)
      .single();

    if (!existingOrder) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Order not found' } },
        { status: 404 }
      );
    }

    const { data: profile } = await serviceClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isCustomerOwner = existingOrder.customer_id === user.id;
    const isStaffOrAdmin = profile && ['staff', 'branch_manager', 'platform_admin', 'rider'].includes(profile.role);

    if (!isCustomerOwner && !isStaffOrAdmin) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const { data: order, error } = await serviceClient
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: error?.message || 'Failed to update order' } },
        { status: 400 }
      );
    }

    return NextResponse.json({ data: order });
  } catch (err) {
    console.error('Order detail PATCH error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
