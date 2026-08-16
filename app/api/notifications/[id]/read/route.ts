import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PATCH /api/notifications/[id]/read
 * Mark a single notification as read.
 */
export async function PATCH(
  _request: Request,
  ctx: RouteContext<'/api/notifications/[id]/read'>
) {
  try {
    const { id } = await ctx.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !notification) {
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: 'Failed to update notification' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: notification });
  } catch (err) {
    console.error('Notification mark single read error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
