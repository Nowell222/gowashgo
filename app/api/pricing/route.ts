import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { ClothingType, UserRole } from '@/lib/types';

/**
 * GET /api/pricing
 * Fetch pricing configurations for a branch.
 * Query param: ?branch_id=... (defaults to user's branch)
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

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branch_id') || profile?.branch_id;

    if (!branchId) {
      return NextResponse.json(
        { error: { code: 'BRANCH_REQUIRED', message: 'Branch ID is required' } },
        { status: 400 }
      );
    }

    const { data: configs, error } = await supabase
      .from('price_configs')
      .select('*')
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .order('clothing_type', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: 'Failed to fetch price configs' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: configs || [] });
  } catch (err) {
    console.error('Pricing GET error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pricing
 * Create or update price config for a clothing type in a branch (Manager/Admin only).
 * Body: { branch_id, clothing_type, base_price }
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

    if (!profile || !['branch_manager', 'platform_admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only managers and admins can configure pricing' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { branch_id, clothing_type, base_price } = body as {
      branch_id: string;
      clothing_type: ClothingType;
      base_price: number;
    };

    if (!branch_id || !clothing_type || typeof base_price !== 'number' || base_price <= 0) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'branch_id, clothing_type, and positive base_price required' } },
        { status: 400 }
      );
    }

    if (profile.role === 'branch_manager' && branch_id !== profile.branch_id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cannot update pricing for other branches' } },
        { status: 403 }
      );
    }

    const serviceClient = createServiceClient();

    // Upsert pricing config
    const { data: config, error } = await serviceClient
      .from('price_configs')
      .upsert(
        {
          branch_id,
          clothing_type,
          base_price,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'branch_id,clothing_type' }
      )
      .select()
      .single();

    if (error || !config) {
      console.error('Pricing save error:', error);
      return NextResponse.json(
        { error: { code: 'SAVE_FAILED', message: 'Failed to save price configuration' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: config }, { status: 201 });
  } catch (err) {
    console.error('Pricing POST error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
