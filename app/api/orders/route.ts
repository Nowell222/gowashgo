import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createOrderSchema } from '@/lib/validators/orders';
import { getWashRecommendation } from '@/lib/ai/wash-recommendation';
import { getDeliveryEstimate } from '@/lib/ai/delivery-estimate';
import { generateOrderNumber } from '@/lib/orders/order-number';
import type { UserRole, PriceConfig, ClothingType } from '@/lib/types';

// Default base prices in centavos if branch pricing config isn't customized yet
const DEFAULT_PRICES_CENTAVOS: Record<ClothingType, number> = {
  shirt: 3500, // ₱35.00
  pants: 4500, // ₱45.00
  underwear: 2000, // ₱20.00
  socks: 1500, // ₱15.00
  bedsheet: 12000, // ₱120.00
  towel: 5000, // ₱50.00
  jacket: 9000, // ₱90.00
  delicate: 7500, // ₱75.00
  other: 4000, // ₱40.00
};

const BASE_DELIVERY_FEE_CENTAVOS = 5000; // ₱50.00 flat delivery fee for pilot

/**
 * GET /api/orders
 * Returns list of orders based on caller's role:
 * - customer: orders where customer_id = user.id
 * - rider: orders where rider_id = user.id
 * - staff / manager: orders where branch_id = user.branch_id
 * - platform_admin: all orders
 */
export async function GET(request: Request) {
  try {
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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    let query = supabase
      .from('orders')
      .select(`
        *,
        customer:users!orders_customer_id_fkey(id, full_name, email, phone, avatar_url),
        rider:users!orders_rider_id_fkey(id, full_name, phone, avatar_url),
        branch:branches(id, name, address, latitude, longitude),
        order_items(*)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    if (role === 'customer') {
      query = query.eq('customer_id', user.id);
    } else if (role === 'rider') {
      query = query.eq('rider_id', user.id);
    } else if (role === 'staff' || role === 'branch_manager') {
      if (profile.branch_id) {
        query = query.eq('branch_id', profile.branch_id);
      }
    }
    // platform_admin gets all

    const { data: orders, count, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: 'Failed to fetch orders' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: orders || [], count: count || 0 });
  } catch (err) {
    console.error('Orders GET error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders
 * Customer creates a new order with items.
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
    const parseResult = createOrderSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid order input data',
            details: parseResult.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // 1. Fetch branch details
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('*')
      .eq('id', data.branch_id)
      .eq('is_active', true)
      .single();

    if (branchError || !branch) {
      return NextResponse.json(
        { error: { code: 'BRANCH_NOT_FOUND', message: 'Active branch not found' } },
        { status: 404 }
      );
    }

    // 2. Fetch custom branch pricing configs
    const { data: priceConfigs } = await supabase
      .from('price_configs')
      .select('*')
      .eq('branch_id', branch.id)
      .eq('is_active', true);

    const priceMap: Record<string, number> = { ...DEFAULT_PRICES_CENTAVOS };
    if (priceConfigs) {
      (priceConfigs as PriceConfig[]).forEach((pc) => {
        priceMap[pc.clothing_type] = pc.base_price;
      });
    }

    // 3. Prepare initial pricing and items (if any submitted by customer)
    let subtotal = 0;
    const preparedItems = (data.items || []).map((item) => {
      const unitPrice = priceMap[item.clothing_type] || DEFAULT_PRICES_CENTAVOS[item.clothing_type] || 4000;
      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;

      const recommendation = getWashRecommendation({
        clothing_type: item.clothing_type,
        fabric_type: item.fabric_type,
        color_category: item.color_category,
        has_stains: item.has_stains,
        stain_description: item.stain_description || undefined,
      });

      return {
        clothing_type: item.clothing_type,
        fabric_type: item.fabric_type,
        color_category: item.color_category,
        quantity: item.quantity,
        has_stains: item.has_stains,
        stain_description: item.stain_description || null,
        wash_recommendation: recommendation,
        unit_price: unitPrice,
      };
    });

    const deliveryFee = BASE_DELIVERY_FEE_CENTAVOS;
    const total = subtotal + deliveryFee;

    // 4. Calculate heuristic delivery estimate
    const { count: activeCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branch.id)
      .in('status', ['confirmed', 'rider_assigned', 'pickup_en_route', 'picked_up', 'at_facility', 'washing', 'drying', 'folding']);

    const estimate = getDeliveryEstimate({
      branch_latitude: branch.latitude,
      branch_longitude: branch.longitude,
      delivery_latitude: data.delivery_latitude,
      delivery_longitude: data.delivery_longitude,
      base_processing_minutes: branch.base_processing_minutes || 120,
      current_order_load: activeCount || 0,
      time_of_day: new Date(),
    });

    // 5. Generate Order Number
    const orderNumber = generateOrderNumber();

    // 6. Use Service Client to insert order
    const serviceClient = createServiceClient();

    const { data: newOrder, error: orderInsertError } = await serviceClient
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: user.id,
        branch_id: branch.id,
        rider_id: null,
        status: 'pending',
        payment_method: data.payment_method || 'online',
        weight_kg: null,
        cash_collected: false,
        delivery_proof_url: null,
        pickup_address: data.pickup_address,
        pickup_latitude: data.pickup_latitude,
        pickup_longitude: data.pickup_longitude,
        delivery_address: data.delivery_address,
        delivery_latitude: data.delivery_latitude,
        delivery_longitude: data.delivery_longitude,
        pickup_scheduled_at: data.pickup_scheduled_at || null,
        delivery_estimated_at: estimate.estimated_delivery_at,
        special_instructions: data.special_instructions || null,
        subtotal,
        delivery_fee: deliveryFee,
        total,
      })
      .select()
      .single();

    if (orderInsertError || !newOrder) {
      console.error('Order creation failed:', orderInsertError);
      return NextResponse.json(
        { error: { code: 'ORDER_CREATE_FAILED', message: orderInsertError?.message || 'Failed to create order' } },
        { status: 500 }
      );
    }

    // 7. Insert items
    const itemsToInsert = preparedItems.map((item) => ({
      ...item,
      order_id: newOrder.id,
    }));

    const { error: itemsError } = await serviceClient
      .from('order_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Failed to insert order items:', itemsError);
    }

    // 8. Log initial status event
    await serviceClient.from('order_status_events').insert({
      order_id: newOrder.id,
      status: 'pending',
      changed_by: user.id,
      note: 'Order submitted by customer',
    });

    return NextResponse.json(
      {
        data: {
          ...newOrder,
          items: preparedItems,
          estimate_breakdown: estimate.breakdown,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Order POST error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err?.message || 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
