import Link from 'next/link';

export default function LandingPage() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #F0F7FF 0%, #FFFFFF 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle Sky Blue Glow Orbs */}
      <div style={{
        position: 'absolute',
        top: -120,
        right: -100,
        width: 450,
        height: 450,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, rgba(240, 247, 255, 0) 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: 50,
        left: -120,
        width: 450,
        height: 450,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, rgba(240, 247, 255, 0) 70%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <header style={{
        padding: '16px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: 1200,
        margin: '0 auto',
        width: '100%',
        position: 'relative',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #0284C7, #06B6D4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
          }}>
            🧺
          </div>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
            Wash<span style={{ color: '#0284C7' }}>Go</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/login" className="btn btn--secondary" style={{ padding: '8px 18px' }}>
            Sign In
          </Link>
          <Link href="/register" className="btn btn--primary" style={{ padding: '8px 18px' }}>
            Get Started
          </Link>
        </div>
      </header>

      {/* Main Hero */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '48px 24px',
        maxWidth: 860,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: '#E0F2FE',
          color: '#0369A1',
          padding: '6px 16px',
          borderRadius: 'var(--radius-full)',
          fontSize: 12,
          fontWeight: 700,
          marginBottom: 24,
          border: '1px solid #BAE6FD',
        }}>
          ✨ Fresh • Fast • Smart Fabric Care
        </div>

        <h1 style={{
          fontSize: 'clamp(2.4rem, 6vw, 4rem)',
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: 20,
          letterSpacing: '-0.04em',
          color: '#0F172A',
        }}>
          Smart Laundry,{' '}
          <span style={{
            background: 'linear-gradient(135deg, #0284C7, #06B6D4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Delivered Fresh.
          </span>
        </h1>

        <p style={{
          fontSize: '18px',
          color: '#475569',
          maxWidth: 600,
          marginBottom: 36,
          lineHeight: 1.6,
        }}>
          Schedule on-demand laundry pickup &amp; delivery, follow your rider with live GPS, 
          and receive automated AI fabric care advice designed for fresh clothes.
        </p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/register" className="btn btn--primary btn--lg" style={{ minWidth: 200, fontSize: 16 }}>
            Book a Pickup Now
          </Link>
          <Link href="/login" className="btn btn--secondary btn--lg" style={{ minWidth: 200, fontSize: 16 }}>
            Customer Sign In
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginTop: 64,
          width: '100%',
        }}>
          {[
            { icon: '🚀', title: 'Quick Pickup', desc: 'Book a pickup from your phone in under 2 minutes' },
            { icon: '📍', title: 'Live GPS Tracking', desc: 'Real-time vector map & rider telemetry tracking' },
            { icon: '🫧', title: 'AI Wash Care', desc: 'Custom cycle advice per fabric & stain type' },
            { icon: '💳', title: 'GCash & Online Pay', desc: 'PayMongo enabled for cashless convenience' },
          ].map((f) => (
            <div
              key={f.title}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 'var(--radius-lg)',
                padding: '24px 20px',
                textAlign: 'center',
                boxShadow: '0 4px 16px -2px rgba(14, 165, 233, 0.06), 0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        padding: '24px',
        textAlign: 'center',
        fontSize: '13px',
        color: '#64748B',
        borderTop: '1px solid #E2E8F0',
        background: '#FFFFFF',
      }}>
        © 2026 WashGo • Smart Laundry Pickup &amp; Delivery System
      </footer>
    </div>
  );
}
