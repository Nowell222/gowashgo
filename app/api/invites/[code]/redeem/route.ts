import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * POST /api/invites/[code]/redeem — Redeem an invite code
 * Body: { full_name, email, phone?, password }
 * Creates the auth user + profile, marks the invite as used.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/invites/[code]/redeem'>
) {
  try {
    const { code } = await ctx.params;
    const body = await request.json();
    const { full_name, email, phone, password } = body as {
      full_name: string;
      email: string;
      phone?: string;
      password: string;
    };

    // Validate required fields
    if (!full_name || !email || !password) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Name, email, and password are required' } },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    // 1. Look up the invite using serviceClient
    const { data: invite, error: inviteError } = await serviceClient
      .from('invites')
      .select('*')
      .eq('code', code)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: { code: 'INVALID_INVITE', message: 'This invite code is invalid or has already been used' } },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      // Mark as expired
      await serviceClient
        .from('invites')
        .update({ status: 'expired' })
        .eq('id', invite.id);

      return NextResponse.json(
        { error: { code: 'INVITE_EXPIRED', message: 'This invite has expired' } },
        { status: 400 }
      );
    }

    // If invite has an email restriction, validate it matches
    if (invite.email && invite.email !== email) {
      return NextResponse.json(
        { error: { code: 'EMAIL_MISMATCH', message: 'This invite is for a different email address' } },
        { status: 400 }
      );
    }

    // 2. Create the auth user using the service role client (bypasses RLS)
    const { data: authData, error: signUpError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for invited users
      user_metadata: {
        full_name,
        phone: phone || null,
        role: invite.role,
      },
    });

    if (signUpError) {
      console.error('Signup error:', signUpError);
      return NextResponse.json(
        { error: { code: 'SIGNUP_FAILED', message: signUpError.message } },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: { code: 'SIGNUP_FAILED', message: 'Failed to create user account' } },
        { status: 500 }
      );
    }

    // 3. Create the user profile
    const { error: profileError } = await serviceClient
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        phone: phone || null,
        full_name,
        role: invite.role,
        branch_id: invite.branch_id,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Roll back the auth user if profile creation fails
      await serviceClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: { code: 'PROFILE_FAILED', message: 'Failed to create user profile' } },
        { status: 500 }
      );
    }

    // 4. Mark the invite as used
    await serviceClient
      .from('invites')
      .update({
        status: 'used',
        used_by: authData.user.id,
      })
      .eq('id', invite.id);

    return NextResponse.json(
      { data: { user_id: authData.user.id, role: invite.role, branch_id: invite.branch_id } },
      { status: 201 }
    );
  } catch (err) {
    console.error('Invite redeem error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
