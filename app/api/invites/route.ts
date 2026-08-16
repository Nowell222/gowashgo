import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canInviteRole } from '@/lib/auth/roles';
import type { UserRole } from '@/lib/types';

/**
 * POST /api/invites — Generate a new invite
 * Body: { branch_id, role, email? }
 * Only branch_managers and platform_admins can create invites.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Get user profile
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

    const body = await request.json();
    const { role: targetRole, branch_id, email } = body as {
      role: UserRole;
      branch_id: string;
      email?: string;
    };

    // Validate the inviter can invite this role
    if (!canInviteRole(profile.role as UserRole, targetRole)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You cannot invite users with this role' } },
        { status: 403 }
      );
    }

    // Branch managers can only invite to their own branch
    if (profile.role === 'branch_manager' && branch_id !== profile.branch_id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You can only invite to your own branch' } },
        { status: 403 }
      );
    }

    // Generate a unique invite code (8 chars, URL-safe)
    const code = generateInviteCode();

    const { data: invite, error: insertError } = await supabase
      .from('invites')
      .insert({
        code,
        branch_id,
        role: targetRole,
        created_by: user.id,
        email: email || null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Invite creation error:', insertError);
      return NextResponse.json(
        { error: { code: 'CREATE_FAILED', message: 'Failed to create invite' } },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: invite },
      { status: 201 }
    );
  } catch (err) {
    console.error('Invite API error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/invites — List invites for the current user's branch
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

    const { data: profile } = await supabase
      .from('users')
      .select('role, branch_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['branch_manager', 'platform_admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    let query = supabase
      .from('invites')
      .select('*, branch:branches(id, name)', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Branch managers only see their branch's invites
    if (profile.role === 'branch_manager' && profile.branch_id) {
      query = query.eq('branch_id', profile.branch_id);
    }

    const { data: invites, count, error } = await query;

    if (error) {
      console.error('Invites list error:', error);
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch invites' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: invites || [], count: count || 0 });
  } catch (err) {
    console.error('Invites GET error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
