import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/customer/addresses
 * List saved addresses for the authenticated customer.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const serviceClient = createServiceClient();
    const { data: addresses, error } = await serviceClient
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch customer addresses error:', error);
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data: addresses || [] });
  } catch (err: any) {
    console.error('Customer addresses GET error:', err);
    return NextResponse.json({ data: [] });
  }
}

/**
 * POST /api/customer/addresses
 * Save a new address for the authenticated customer.
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
    const { label, address, latitude, longitude, is_default = false } = body;

    if (!label || !address || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Label, address, latitude, and longitude are required' } },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    // If marked default, unset other defaults
    if (is_default) {
      await serviceClient
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('customer_id', user.id);
    }

    const { data: newAddress, error } = await serviceClient
      .from('customer_addresses')
      .insert({
        customer_id: user.id,
        label: String(label).trim(),
        address: String(address).trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        is_default: Boolean(is_default),
      })
      .select()
      .single();

    if (error) {
      console.error('Insert address error:', error);
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: 'Failed to save address' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: newAddress });
  } catch (err: any) {
    console.error('Address POST error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err?.message || 'Server error' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/customer/addresses
 * Delete a saved address.
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: { code: 'MISSING_ID', message: 'Address ID is required' } }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
    }

    const serviceClient = createServiceClient();
    await serviceClient
      .from('customer_addresses')
      .delete()
      .eq('id', id)
      .eq('customer_id', user.id);

    return NextResponse.json({ data: { success: true } });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: err?.message || 'Server error' } }, { status: 500 });
  }
}
