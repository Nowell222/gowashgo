import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/overview
 * Real-time Platform Operations aggregation across all branches, orders, users, and events.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Use service client for platform-wide metrics aggregation
    const serviceClient = createServiceClient();

    // 1. Fetch branches
    const { data: branchesData, error: branchesErr } = await serviceClient
      .from('branches')
      .select('*')
      .order('name', { ascending: true });

    if (branchesErr) {
      console.error('Failed to fetch admin branches:', branchesErr);
    }

    const branches = branchesData || [];

    // 2. Fetch all orders with details
    const { data: ordersData, error: ordersErr } = await serviceClient
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        branch_id,
        customer_id,
        rider_id,
        total,
        weight_kg,
        payment_method,
        created_at,
        customer:users!orders_customer_id_fkey(full_name, email),
        branch:branches(name)
      `)
      .order('created_at', { ascending: false });

    if (ordersErr) {
      console.error('Failed to fetch admin orders:', ordersErr);
    }

    const orders = ordersData || [];

    // 3. Fetch all platform users
    const { data: usersData, error: usersErr } = await serviceClient
      .from('users')
      .select('id, full_name, email, role, branch_id, is_active, created_at')
      .order('created_at', { ascending: false });

    if (usersErr) {
      console.error('Failed to fetch admin users:', usersErr);
    }

    const users = usersData || [];

    // 4. Fetch recent status events
    const { data: eventsData } = await serviceClient
      .from('order_status_events')
      .select(`
        id,
        status,
        note,
        created_at,
        order:orders(order_number),
        user:users!order_status_events_changed_by_fkey(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculations
    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter((o) => o.created_at.startsWith(todayStr));
    const completedOrders = orders.filter((o) => ['delivered', 'completed'].includes(o.status));
    const activeFacilityOrders = orders.filter((o) =>
      ['at_facility', 'washing', 'drying', 'folding', 'ready_for_delivery'].includes(o.status)
    );
    const outForDeliveryOrders = orders.filter((o) =>
      ['rider_assigned', 'pickup_en_route', 'delivery_en_route'].includes(o.status)
    );

    const totalRevenueCentavos = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const todayRevenueCentavos = todayOrders
      .filter((o) => ['delivered', 'completed'].includes(o.status))
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const totalWeightKg = completedOrders.reduce((sum, o) => sum + (o.weight_kg || 0), 0);

    // User breakdown
    const customerCount = users.filter((u) => u.role === 'customer').length;
    const staffCount = users.filter((u) => u.role === 'staff').length;
    const riderCount = users.filter((u) => u.role === 'rider').length;
    const managerCount = users.filter((u) => u.role === 'branch_manager').length;
    const adminCount = users.filter((u) => u.role === 'platform_admin').length;

    // Per-branch breakdown
    const branchesWithStats = branches.map((b) => {
      const branchOrders = orders.filter((o) => o.branch_id === b.id);
      const branchStaff = users.filter((u) => u.branch_id === b.id && ['staff', 'rider', 'branch_manager'].includes(u.role));
      const branchRevenue = branchOrders
        .filter((o) => ['delivered', 'completed'].includes(o.status))
        .reduce((sum, o) => sum + (o.total || 0), 0);
      const branchActive = branchOrders.filter((o) => !['delivered', 'completed', 'cancelled'].includes(o.status));

      return {
        id: b.id,
        name: b.name,
        address: b.address,
        phone: b.phone || '—',
        email: b.email || '—',
        pricePerKg: b.price_per_kg || 3500,
        baseProcessingMinutes: b.base_processing_minutes || 120,
        isActive: Boolean(b.is_active),
        ordersCount: branchOrders.length,
        activeOrdersCount: branchActive.length,
        staffCount: branchStaff.length,
        revenueCentavos: branchRevenue,
      };
    });

    const recentOrders = orders.slice(0, 10).map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      customerName: (o.customer as any)?.full_name || 'Customer',
      customerEmail: (o.customer as any)?.email || '',
      branchName: (o.branch as any)?.name || 'Branch',
      status: o.status,
      totalCentavos: o.total || 0,
      weightKg: o.weight_kg || null,
      paymentMethod: o.payment_method,
      createdAt: o.created_at,
    }));

    const recentEvents = (eventsData || []).map((e: any) => ({
      id: e.id,
      orderNumber: e.order?.order_number || 'Order',
      status: e.status,
      changedByName: e.user?.full_name || 'Staff',
      note: e.note || '',
      createdAt: e.created_at,
    }));

    return NextResponse.json({
      data: {
        summary: {
          totalBranches: branches.length,
          activeBranches: branches.filter((b) => b.is_active).length,
          totalOrders: orders.length,
          totalRevenueCentavos,
          todayOrders: todayOrders.length,
          todayRevenueCentavos,
          totalWeightKg: Math.round(totalWeightKg * 10) / 10,
          activeFacilityOrders: activeFacilityOrders.length,
          outForDeliveryOrders: outForDeliveryOrders.length,
          completedOrders: completedOrders.length,
          totalUsers: users.length,
          customerCount,
          staffCount,
          riderCount,
          managerCount,
          adminCount,
        },
        branches: branchesWithStats,
        recentOrders,
        recentEvents,
      },
    });
  } catch (err: any) {
    console.error('Admin overview API error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to aggregate admin overview' } },
      { status: 500 }
    );
  }
}
