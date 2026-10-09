import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendTeamInviteEmail, getAppBaseUrl } from '@/lib/email/sender';

/**
 * POST /api/invites/[code]/resend — Resend an invite email to the candidate
 * Body (optional): { email?: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    if (!code) {
      return NextResponse.json(
        { error: { code: 'PARAM_REQUIRED', message: 'Invite code is required' } },
        { status: 400 }
      );
    }

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
      .select('role, branch_id, full_name')
      .eq('id', user.id)
      .single();

    if (!profile || !['branch_manager', 'platform_admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only branch managers or admins can resend invites' } },
        { status: 403 }
      );
    }

    const serviceClient = createServiceClient();

    // Find the invite
    const { data: invite, error: fetchError } = await serviceClient
      .from('invites')
      .select('id, code, role, email, status, branch_id, expires_at')
      .eq('code', code)
      .single();

    if (fetchError || !invite) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Invite not found' } },
        { status: 404 }
      );
    }

    // Read optional new email from request body
    let targetEmail = invite.email;
    try {
      const body = await request.json().catch(() => ({}));
      if (body?.email && typeof body.email === 'string' && body.email.trim()) {
        targetEmail = body.email.trim();
        // Update invite email in database if different
        if (targetEmail !== invite.email) {
          await serviceClient
            .from('invites')
            .update({ email: targetEmail })
            .eq('id', invite.id);
        }
      }
    } catch {
      // Body parsing optional
    }

    if (!targetEmail) {
      return NextResponse.json(
        { error: { code: 'NO_EMAIL', message: 'No email address registered for this invite. Please provide an email.' } },
        { status: 400 }
      );
    }

    // Fetch branch name
    const { data: branchData } = await serviceClient
      .from('branches')
      .select('name')
      .eq('id', invite.branch_id)
      .single();

    const branchName = branchData?.name || 'San Juan Batangas Hub';
    const inviterName = profile.full_name || 'Branch Manager';
    const appUrl = getAppBaseUrl(request);
    const inviteUrl = `${appUrl}/invite/${invite.code}`;

    const sendResult = await sendTeamInviteEmail({
      recipientEmail: targetEmail,
      role: invite.role,
      branchName,
      inviterName,
      inviteCode: invite.code,
      inviteUrl,
    }, targetEmail);

    if (!sendResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'EMAIL_FAILED',
            message: sendResult.error || 'Failed to dispatch email via mail provider',
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      data: {
        success: true,
        email: targetEmail,
        provider: sendResult.provider,
        messageId: sendResult.messageId,
      },
    });
  } catch (err: any) {
    console.error('[Resend Invite API] Error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to resend invite' } },
      { status: 500 }
    );
  }
}
