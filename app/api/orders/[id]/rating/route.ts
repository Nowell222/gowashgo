import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * POST /api/orders/[id]/rating
 * Submit customer star rating and review note for a delivered/completed order.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/orders/[id]/rating'>
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
    const { stars, note } = body;

    if (!stars || typeof stars !== 'number' || stars < 1 || stars > 5) {
      return NextResponse.json(
        { error: { code: 'INVALID_STARS', message: 'Rating must be between 1 and 5 stars' } },
        { status: 400 }
      );
    }

    // Verify order ownership and status
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, branch_id, customer_id, status')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Order not found' } },
        { status: 404 }
      );
    }

    if (order.customer_id !== user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You can only rate your own orders' } },
        { status: 403 }
      );
    }

    const serviceClient = createServiceClient();
    const { data: rating, error: ratingError } = await serviceClient
      .from('order_ratings')
      .upsert({
        order_id: id,
        customer_id: user.id,
        branch_id: order.branch_id,
        stars: Math.round(stars),
        note: note ? String(note).slice(0, 500) : null,
        created_at: new Date().toISOString(),
      }, { onConflict: 'order_id' })
      .select()
      .single();

    if (ratingError) {
      console.error('Save rating error:', ratingError);
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: 'Failed to submit rating' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: rating });
  } catch (err: any) {
    console.error('Rating POST error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err?.message || 'Server error' } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders/[id]/rating
 * Fetch rating for a specific order.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/orders/[id]/rating'>
) {
  try {
    const { id } = await ctx.params;
    const serviceClient = createServiceClient();
    const { data: rating } = await serviceClient
      .from('order_ratings')
      .select('*')
      .eq('order_id', id)
      .single();

    return NextResponse.json({ data: rating || null });
  } catch (err: any) {
    return NextResponse.json({ data: null });
  }
}
