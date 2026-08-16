import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/notifications
 * Fetch notifications for authenticated user, sorted latest first.
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 50);

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch notifications' } },
        { status: 500 }
      );
    }

    const unreadCount = (notifications || []).filter((n) => !n.read_at).length;

    return NextResponse.json({
      data: notifications || [],
      unread_count: unreadCount,
    });
  } catch (err) {
    console.error('Notifications GET error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Mark all notifications as read for current user.
 */
export async function PATCH() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) {
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: 'Failed to mark notifications as read' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error('Notifications mark all read error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
