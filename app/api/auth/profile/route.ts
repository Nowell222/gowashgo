import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/profile — Ensure user profile exists in public.users
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, email, full_name, phone, role = 'customer' } = body;

    if (!id || !email) {
      return NextResponse.json(
        { error: { code: 'PARAM_REQUIRED', message: 'User ID and email are required' } },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from('users')
      .upsert({
        id,
        email,
        full_name: full_name || 'Customer',
        phone: phone || null,
        role,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to upsert user profile:', error);
      return NextResponse.json(
        { error: { code: 'UPSERT_FAILED', message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('Profile endpoint error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err?.message || 'Server error' } },
      { status: 500 }
    );
  }
}
