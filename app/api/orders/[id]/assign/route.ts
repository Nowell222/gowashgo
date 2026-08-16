import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { assignRiderSchema } from '@/lib/validators/orders';
import type { UserRole } from '@/lib/types';

/**
 * PATCH /api/orders/[id]/assign
 * Assigns a rider to an order (Staff / Branch Manager / Admin only).
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<'/api/orders/[id]/assign'>
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

    if (!profile || !['staff', 'branch_manager', 'platform_admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only staff, managers, and admins can assign riders' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parseResult = assignRiderSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid rider ID', details: parseResult.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { rider_id } = parseResult.data;

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, branch_id, status')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Order not found' } },
        { status: 404 }
      );
    }

    if (profile.role !== 'platform_admin' && order.branch_id !== profile.branch_id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Order belongs to another branch' } },
        { status: 403 }
      );
    }

    // Verify rider exists and belongs to the same branch
    const { data: rider, error: riderError } = await supabase
      .from('users')
      .select('id, full_name, role, branch_id, is_active')
      .eq('id', rider_id)
      .eq('role', 'rider')
      .single();

    if (riderError || !rider || !rider.is_active) {
      return NextResponse.json(
        { error: { code: 'INVALID_RIDER', message: 'Active rider with this ID not found' } },
        { status: 404 }
      );
    }

    if (profile.role !== 'platform_admin' && rider.branch_id !== order.branch_id) {
      return NextResponse.json(
        { error: { code: 'BRANCH_MISMATCH', message: 'Rider is not assigned to this branch' } },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    // If order is confirmed or pending, update status to rider_assigned as well
    const shouldUpdateStatus = order.status === 'confirmed' || order.status === 'pending';
    const newStatus = shouldUpdateStatus ? 'rider_assigned' : order.status;

    const { data: updatedOrder, error: updateError } = await serviceClient
      .from('orders')
      .update({
        rider_id,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        rider:users!orders_rider_id_fkey(id, full_name, phone, avatar_url)
      `)
      .single();

    if (updateError || !updatedOrder) {
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: 'Failed to assign rider' } },
        { status: 500 }
      );
    }

    // Record assignment status event
    await serviceClient.from('order_status_events').insert({
      order_id: id,
      status: newStatus,
      changed_by: user.id,
      note: `Rider assigned: ${rider.full_name}`,
    });

    return NextResponse.json({ data: updatedOrder });
  } catch (err) {
    console.error('Assign rider error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
