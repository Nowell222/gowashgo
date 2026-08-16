'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Notification } from '@/lib/types';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const dropdownRef = useRef<HTMLDivElement>(null);

  async function loadNotifications() {
    try {
      const res = await fetch('/api/notifications?limit=15');
      const json = await res.json();
      if (json.data) {
        setNotifications(json.data);
        setUnreadCount(json.unread_count || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }

  useEffect(() => {
    loadNotifications();

    // Check Push & Service Worker support
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      if ('Notification' in window) {
        setPushPermission(Notification.permission);
      }

      // Register service worker if not already registered
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration warning:', err);
      });
    }

    // Subscribe to realtime notifications for logged-in user
    const supabase = createClient();
    let activeChannel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      const channelName = `user_notifs_${user.id}_${Math.random().toString(36).slice(2, 7)}`;
      activeChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.new) {
              const newNotif = payload.new as Notification;
              setNotifications((prev) => [newNotif, ...prev]);
              setUnreadCount((c) => c + 1);

              // Trigger system notification if permitted and in background
              if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
                new Notification(newNotif.title, {
                  body: newNotif.body,
                  icon: '/icons/icon.svg',
                });
              }
            }
          }
        )
        .subscribe();
    });

    // Close on click outside
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  async function handleMarkAllAsRead() {
    setLoading(true);
    try {
      await fetch('/api/notifications', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      console.error('Error marking all as read');
    } finally {
      setLoading(false);
    }
  }

  async function handleNotificationClick(notif: Notification) {
    if (!notif.read_at) {
      fetch(`/api/notifications/${notif.id}/read`, { method: 'PATCH' }).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setIsOpen(false);
  }

  async function handleEnablePush() {
    if (!('Notification' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
    } catch (err) {
      console.error('Push request error:', err);
    }
  }

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        className="btn btn--ghost btn--icon"
        style={{ position: 'relative' }}
        onClick={() => setIsOpen((o) => !o)}
        title="Notifications"
        aria-label="Notifications"
      >
        <span style={{ fontSize: '1.2rem' }}>🔔</span>
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              minWidth: 16,
              height: 16,
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-error)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 'var(--font-bold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 0 8px rgba(255, 107, 107, 0.6)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Drawer */}
      {isOpen && (
        <div
          className="fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 340,
            maxHeight: 440,
            overflowY: 'auto',
            zIndex: varZIndex(),
            padding: 'var(--space-3)',
            boxShadow: '0 12px 36px -4px rgba(14, 165, 233, 0.18), 0 4px 12px rgba(0,0,0,0.06)',
            background: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid #E2E8F0',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #F1F5F9' }}>
            <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: '#0F172A' }}>
              Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={loading}
                style={{ fontSize: 11, color: '#0284C7', fontWeight: 600, cursor: 'pointer' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Web Push Enable Banner if not granted */}
          {pushSupported && pushPermission === 'default' && (
            <div style={{
              background: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 10px',
              marginBottom: 8,
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 6,
              color: '#0369A1',
            }}>
              <span>Enable push alerts for live updates</span>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                style={{ fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}
                onClick={handleEnablePush}
              >
                Enable
              </button>
            </div>
          )}

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-6) 0', color: '#94A3B8', fontSize: 'var(--text-xs)' }}>
              No notifications yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {notifications.map((notif) => {
                const isUnread = !notif.read_at;
                const linkHref = notif.order_id ? `/customer/orders/${notif.order_id}` : '#';

                return (
                  <Link
                    key={notif.id}
                    href={linkHref}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      display: 'block',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: isUnread ? '#F0F9FF' : '#F8FAFC',
                      border: isUnread ? '1px solid #BAE6FD' : '1px solid #F1F5F9',
                      textDecoration: 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: isUnread ? 700 : 600, color: '#0F172A' }}>
                        {notif.title}
                      </span>
                      <span style={{ fontSize: 10, color: '#94A3B8' }}>
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: '#475569', marginTop: 2, lineHeight: 1.4 }}>
                      {notif.body}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function varZIndex() {
  return 500;
}
