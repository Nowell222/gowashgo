'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatPeso } from '@/lib/utils/currency';
import { formatOrderStatus, getOrderStatusColor } from '@/lib/orders/status-machine';
import LaundryIcons from '@/components/common/LaundryIcons';
import type { User, Order } from '@/lib/types';

export default function CustomerHomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        if (profile) setUser(profile as User);

        const { data: orders } = await supabase
          .from('orders')
          .select('*, branch:branches(name, price_per_kg)')
          .eq('customer_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (orders && orders.length > 0) {
          // Check for active order
          const active = orders.find((o) => !['delivered', 'completed', 'cancelled'].includes(o.status));
          if (active) {
            setActiveOrder(active as Order);
          }
          setRecentOrders(orders as Order[]);
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="fade-in" style={{ padding: '16px 0' }}>
        <div style={{ height: 28, width: 180, background: '#F3EFE6', borderRadius: 8, marginBottom: 12 }} />
        <div style={{ height: 160, background: '#F3EFE6', borderRadius: 16, marginBottom: 16 }} />
        <div style={{ height: 90, background: '#F3EFE6', borderRadius: 16 }} />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ paddingBottom: 48 }}>
      {/* Header Greeting */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <LaundryIcons.Sparkles size={16} color="var(--color-primary)" />
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
            Linen & Garment Care
          </span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--color-text-dark)', letterSpacing: '-0.02em' }}>
          {greeting()}, {user?.full_name?.split(' ')[0] || 'Friend'}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
          Doorstep laundry weighed and priced instantly.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* ACTIVE ORDER SPOTLIGHT TICKET (If there's an active pickup/wash)          */}
      {/* ========================================================================= */}
      {activeOrder && (
        <div
          className="spotlight-ticket"
          style={{
            background: '#0E7490',
            color: '#FFFFFF',
            borderRadius: 18,
            padding: '18px 20px',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.9, fontWeight: 800 }}>
              Active Order In Progress
            </span>
            <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(255, 255, 255, 0.2)', padding: '2px 8px', borderRadius: 6 }}>
              {formatOrderStatus(activeOrder.status)}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 14,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.9, fontSize: 11, fontWeight: 700 }}>
                <LaundryIcons.Scale size={14} color="#A5F3FC" />
                <span>Verified Weight</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, marginTop: 4 }}>
                {activeOrder.weight_kg ? `${Number(activeOrder.weight_kg).toFixed(1)} kg` : '-- kg'}
              </div>
              <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>
                {activeOrder.weight_kg ? 'Rider Scale Verified' : 'Awaiting Doorstep Scale'}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.9, fontSize: 11, fontWeight: 700 }}>
                <LaundryIcons.ReceiptTicket size={14} color="#FEF08A" />
                <span>Total Amount</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, marginTop: 4, color: '#FEF08A' }}>
                {formatPeso(activeOrder.total)}
              </div>
              <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>
                {activeOrder.payment_method === 'online' ? 'Online (GCash/Maya)' : 'Cash on Delivery'}
              </div>
            </div>
          </div>

          <Link
            href={`/customer/orders/${activeOrder.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#D97706',
              color: '#FFFFFF',
              textDecoration: 'none',
              padding: '10px 14px',
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <LaundryIcons.DeliveryScooter size={16} color="#FFFFFF" />
              <span>Track Live Order & Details</span>
            </span>
            <LaundryIcons.ArrowRight size={14} color="#FFFFFF" />
          </Link>
        </div>
      )}

      {/* Schedule a Pickup CTA Button */}
      <Link
        href="/customer/book"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 24,
          background: '#F3EFE6',
          borderRadius: 16,
          padding: 16,
          textDecoration: 'none',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'var(--color-primary)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <LaundryIcons.Basket size={24} color="#FFFFFF" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--color-text-dark)' }}>
            Schedule Laundry Pickup
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            Rider brings portable scale to your door
          </div>
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#FAF8F5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-primary)',
          }}
        >
          <LaundryIcons.ArrowRight size={16} color="var(--color-primary)" />
        </div>
      </Link>

      {/* Laundry Services Highlight Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          marginBottom: 24,
        }}
      >
        <div className="flat-block" style={{ textAlign: 'center', padding: '12px 8px', background: '#F3EFE6' }}>
          <LaundryIcons.Scale size={20} color="var(--color-primary)" />
          <div style={{ fontSize: 11, fontWeight: 800, marginTop: 6, color: 'var(--color-text-dark)' }}>
            Scale Weighing
          </div>
          <div style={{ fontSize: 9, color: 'var(--color-text-muted)', marginTop: 2 }}>
            At your doorstep
          </div>
        </div>

        <div className="flat-block" style={{ textAlign: 'center', padding: '12px 8px', background: '#F3EFE6' }}>
          <LaundryIcons.ReceiptTicket size={20} color="var(--color-accent)" />
          <div style={{ fontSize: 11, fontWeight: 800, marginTop: 6, color: 'var(--color-text-dark)' }}>
            Instant Pricing
          </div>
          <div style={{ fontSize: 9, color: 'var(--color-text-muted)', marginTop: 2 }}>
            Weight × Rate/kg
          </div>
        </div>

        <div className="flat-block" style={{ textAlign: 'center', padding: '12px 8px', background: '#F3EFE6' }}>
          <LaundryIcons.Washer size={20} color="var(--color-primary)" />
          <div style={{ fontSize: 11, fontWeight: 800, marginTop: 6, color: 'var(--color-text-dark)' }}>
            Streamlined
          </div>
          <div style={{ fontSize: 9, color: 'var(--color-text-muted)', marginTop: 2 }}>
            Wash, Dry & Fold
          </div>
        </div>
      </div>

      {/* Recent Orders List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <LaundryIcons.CareTag size={16} color="var(--color-primary)" />
            <h2 style={{ fontSize: 14, fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Recent Orders
            </h2>
          </div>
          {recentOrders.length > 0 && (
            <Link
              href="/customer/orders"
              style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none' }}
            >
              View all
            </Link>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <div className="flat-block" style={{ textAlign: 'center', padding: '32px 16px', background: '#F3EFE6' }}>
            <LaundryIcons.Basket size={32} color="#8C827A" />
            <p style={{ fontWeight: 800, fontSize: 14, margin: '8px 0 2px' }}>No laundry orders yet</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
              Book your first doorstep laundry pickup today!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentOrders.map((ord) => {
              const statusColor = getOrderStatusColor(ord.status);
              return (
                <Link
                  key={ord.id}
                  href={`/customer/orders/${ord.id}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#F3EFE6',
                    borderRadius: 14,
                    padding: '12px 16px',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--color-text-dark)' }}>
                      {ord.order_number}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {new Date(ord.created_at).toLocaleDateString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      • {ord.weight_kg ? `${ord.weight_kg} kg` : 'Pending scale'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14, color: 'var(--color-text-dark)' }}>
                      {formatPeso(ord.total)}
                    </div>
                    <span
                      className={`status-badge status-badge--${statusColor}`}
                      style={{ fontSize: 10, padding: '2px 8px', marginTop: 4, display: 'inline-block' }}
                    >
                      {formatOrderStatus(ord.status)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
