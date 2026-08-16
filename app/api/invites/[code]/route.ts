import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/invites/[code]
 * Public endpoint to fetch invite details before redemption.
 * Uses service client to bypass RLS for unauthenticated invited users.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<'/api/invites/[code]'>
) {
  try {
    const { code } = await ctx.params;

    if (!code) {
      return NextResponse.json(
        { error: { code: 'PARAM_REQUIRED', message: 'Invite code is required' } },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    const { data: invite, error } = await serviceClient
      .from('invites')
      .select(`
        id, code, role, email, expires_at, status, branch_id,
        branch:branches(id, name, address)
      `)
      .eq('code', code)
      .eq('status', 'pending')
      .single();

    if (error || !invite) {
      return NextResponse.json(
        { error: { code: 'INVALID_INVITE', message: 'This invite link is invalid or has already been used' } },
        { status: 404 }
      );
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      await serviceClient
        .from('invites')
        .update({ status: 'expired' })
        .eq('id', invite.id);

      return NextResponse.json(
        { error: { code: 'INVITE_EXPIRED', message: 'This invite link has expired' } },
        { status: 410 }
      );
    }

    return NextResponse.json({ data: invite });
  } catch (err: any) {
    console.error('Fetch invite error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err?.message || 'Internal server error' } },
      { status: 500 }
    );
  }
}
