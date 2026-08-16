import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/types';

/**
 * GET /api/branches — List all active branches
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: branches, error } = await supabase
      .from('branches')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch branches' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: branches || [] });
  } catch (err) {
    console.error('Branches GET error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/branches — Create a new branch (Platform Admin only)
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
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'platform_admin') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only platform admins can create branches' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, address, latitude, longitude, phone, email, base_processing_minutes, price_per_kg } = body;

    if (!name || !address || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Name, address, latitude, and longitude are required' } },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    const { data: branch, error: insertError } = await serviceClient
      .from('branches')
      .insert({
        name,
        address,
        latitude,
        longitude,
        phone: phone || null,
        email: email || null,
        base_processing_minutes: base_processing_minutes || 120,
        price_per_kg: price_per_kg || 3500,
        is_active: true,
      })
      .select()
      .single();

    if (insertError || !branch) {
      console.error('Branch creation error:', insertError);
      return NextResponse.json(
        { error: { code: 'INSERT_FAILED', message: 'Failed to create branch' } },
        { status: 500 }
      );
    }

    // Provision Initial Branch Manager Account if specified
    let createdManager = null;
    if (body.manager && body.manager.email && body.manager.password) {
      const { full_name, email: mgrEmail, phone: mgrPhone, password } = body.manager;

      const { data: authData, error: signUpError } = await serviceClient.auth.admin.createUser({
        email: mgrEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          phone: mgrPhone || null,
          role: 'branch_manager',
        },
      });

      if (!signUpError && authData?.user) {
        await serviceClient.from('users').insert({
          id: authData.user.id,
          email: mgrEmail,
          phone: mgrPhone || null,
          full_name,
          role: 'branch_manager',
          branch_id: branch.id,
        });

        createdManager = {
          id: authData.user.id,
          email: mgrEmail,
          full_name,
          role: 'branch_manager',
        };
      } else if (signUpError) {
        console.warn('Manager account auto-creation notice:', signUpError.message);
      }
    }

    return NextResponse.json({
      data: {
        ...branch,
        manager: createdManager,
      },
    }, { status: 201 });
  } catch (err) {
    console.error('Branch POST error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
