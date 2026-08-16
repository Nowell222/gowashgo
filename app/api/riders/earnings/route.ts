import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/riders/earnings
 * Calculate shift earnings and collected cash for riders.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 });
    }

    const { data: profile } = await supabase.from('users').select('role, branch_id').eq('id', user.id).single();
    if (!profile) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Profile not found' } }, { status: 404 });
    }

    const requestedRiderId = searchParams.get('rider_id') || (profile.role === 'rider' ? user.id : null);
    const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const serviceClient = createServiceClient();

    let query = serviceClient
      .from('orders')
      .select('id, order_number, total, payment_method, cash_collected, status, created_at, updated_at')
      .in('status', ['delivered', 'completed']);

    if (requestedRiderId) {
      query = query.eq('rider_id', requestedRiderId);
    } else if (profile.branch_id) {
      query = query.eq('branch_id', profile.branch_id);
    }

    const { data: orders, error } = await query;
    if (error) {
      console.error('Error fetching rider earnings orders:', error);
      return NextResponse.json({ data: { total_cash: 0, completed_count: 0, orders: [] } });
    }

    // Filter by today's date
    const todayOrders = ((orders || []) as any[]).filter((o: any) => {
      const d = (o.updated_at || o.created_at).split('T')[0];
      return d === dateParam;
    });

    const cashOrders = todayOrders.filter((o: any) => o.payment_method === 'cash' && o.cash_collected);
    const totalCashCentavos = cashOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);

    // Check existing settlement status
    let settlement = null;
    if (requestedRiderId) {
      const { data: setRec } = await serviceClient
        .from('rider_cash_settlements')
        .select('*')
        .eq('rider_id', requestedRiderId)
        .eq('shift_date', dateParam)
        .single();
      settlement = setRec || null;
    }

    return NextResponse.json({
      data: {
        date: dateParam,
        rider_id: requestedRiderId,
        total_cash: totalCashCentavos,
        completed_deliveries_count: todayOrders.length,
        cash_orders_count: cashOrders.length,
        is_settled: Boolean(settlement?.is_settled),
        settled_at: settlement?.settled_at || null,
        orders: todayOrders,
      },
    });
  } catch (err: any) {
    console.error('Rider earnings GET error:', err);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: err?.message } }, { status: 500 });
  }
}

/**
 * POST /api/riders/earnings
 * Mark shift cash as reconciled and settled (by Branch Manager or Staff).
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 });
    }

    const { data: profile } = await supabase.from('users').select('role, branch_id').eq('id', user.id).single();
    if (!profile || !['admin', 'branch_manager', 'staff'].includes(profile.role)) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Only managers/staff can settle cash' } }, { status: 403 });
    }

    const body = await request.json();
    const { rider_id, shift_date, amount, orders_count } = body;

    if (!rider_id) {
      return NextResponse.json({ error: { code: 'MISSING_RIDER', message: 'Rider ID required' } }, { status: 400 });
    }

    const dateToSettle = shift_date || new Date().toISOString().split('T')[0];
    const serviceClient = createServiceClient();

    const { data: settlement, error } = await serviceClient
      .from('rider_cash_settlements')
      .upsert({
        rider_id,
        branch_id: profile.branch_id,
        manager_id: user.id,
        amount: Number(amount) || 0,
        shift_date: dateToSettle,
        orders_count: Number(orders_count) || 0,
        is_settled: true,
        settled_at: new Date().toISOString(),
      }, { onConflict: 'rider_id, shift_date' })
      .select()
      .single();

    if (error) {
      console.error('Cash settlement error:', error);
      return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Failed to record settlement' } }, { status: 500 });
    }

    return NextResponse.json({ data: settlement });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: err?.message } }, { status: 500 });
  }
}
