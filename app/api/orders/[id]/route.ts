import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
