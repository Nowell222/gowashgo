import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod/v4';
import type { UserRole } from '@/lib/types';

const locationPingSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional().nullable(),
  order_id: z.string().min(1).optional().nullable(),
  recorded_at: z.string().datetime().optional(),
});

/**
 * POST /api/riders/location
 * Rider emits a GPS location ping.
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

    const { data: profile } = await supabase
      .from('users')
      .select('role, branch_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['rider', 'platform_admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only riders can emit GPS locations' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parseResult = locationPingSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid GPS coordinates', details: parseResult.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { latitude, longitude, accuracy, order_id, recorded_at } = parseResult.data;
    const timestamp = recorded_at || new Date().toISOString();

    const serviceClient = createServiceClient();

    const { data: ping, error: insertError } = await serviceClient
      .from('rider_locations')
      .insert({
        rider_id: user.id,
        order_id: order_id || null,
        latitude,
        longitude,
        accuracy: accuracy || null,
        recorded_at: timestamp,
      })
      .select()
      .single();

    if (insertError || !ping) {
      console.error('Error inserting rider location:', insertError);
      return NextResponse.json(
        { error: { code: 'INSERT_FAILED', message: 'Failed to record location ping' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: ping }, { status: 201 });
  } catch (err) {
    console.error('Rider location POST error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/riders/location
 * Fetch the latest location of a rider or order.
 * Query params: ?order_id=... OR ?rider_id=...
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

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');
    const riderId = searchParams.get('rider_id');

    if (!orderId && !riderId) {
      return NextResponse.json(
        { error: { code: 'PARAM_REQUIRED', message: 'order_id or rider_id is required' } },
        { status: 400 }
      );
    }

    let query = supabase
      .from('rider_locations')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(1);

    if (orderId) {
      query = query.eq('order_id', orderId);
    } else if (riderId) {
      query = query.eq('rider_id', riderId);
    }

    const { data: locations, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch rider location' } },
        { status: 500 }
      );
    }

    const latest = locations && locations.length > 0 ? locations[0] : null;
    return NextResponse.json({ data: latest });
  } catch (err) {
    console.error('Rider location GET error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
