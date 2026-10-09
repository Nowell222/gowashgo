'use client';

import { useState, Suspense, useRef } from 'react';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';
import LaundryChathead from '@/components/chat/LaundryChathead';

export default function LandingPage() {
  const [estWeight, setEstWeight] = useState<number>(7);
  const [selectedService, setSelectedService] = useState<'fold' | 'press' | 'comforter'>('fold');
  const loginSectionRef = useRef<HTMLDivElement>(null);

  // Pricing formula: Service rate/kg * weight + 50 flat delivery fee
  const ratePerKg = selectedService === 'fold' ? 35 : selectedService === 'press' ? 55 : 60;
  const washTotal = estWeight * ratePerKg;
  const deliveryFee = 50;
  const grandTotal = washTotal + deliveryFee;

  const scrollToLogin = () => {
    loginSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    const emailInput = document.getElementById('login-email');
    if (emailInput) {
      setTimeout(() => emailInput.focus(), 400);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#F8FAFC', color: '#0F172A', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* ================= 1. HEADER / NAVIGATION ================= */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #E2E8F0',
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Logo & Brand */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img
              src="/icons/gowashgo-icon.png"
              alt="GoWashGo"
              width={38}
              height={38}
              style={{ borderRadius: 10, objectFit: 'contain' }}
            />
            <div>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', display: 'block', lineHeight: 1 }}>
                Go<span style={{ color: '#0284C7' }}>Wash</span>Go
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Smart Laundry • Doorstep Scale
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 28 }} className="desktop-nav">
            <a href="#how-it-works" style={{ textDecoration: 'none', color: '#475569', fontSize: 14, fontWeight: 600 }}>
              How It Works
            </a>
            <a href="#calculator" style={{ textDecoration: 'none', color: '#475569', fontSize: 14, fontWeight: 600 }}>
              Price Calculator
            </a>
            <a href="#rates" style={{ textDecoration: 'none', color: '#475569', fontSize: 14, fontWeight: 600 }}>
              Rates (₱35/kg)
            </a>
            <a href="#faq" style={{ textDecoration: 'none', color: '#475569', fontSize: 14, fontWeight: 600 }}>
              FAQs
            </a>
          </nav>

          {/* Action CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={scrollToLogin}
              type="button"
              style={{
                padding: '9px 18px',
                fontSize: 14,
                fontWeight: 600,
                color: '#0284C7',
                background: '#F0F9FF',
                border: '1px solid #BAE6FD',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Sign In
            </button>
            <Link
              href="/register"
              style={{
                padding: '9px 18px',
                fontSize: 14,
                fontWeight: 700,
                color: '#FFFFFF',
                background: '#0284C7',
                border: 'none',
                borderRadius: '8px',
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
              }}
            >
              Book Pickup
            </Link>
          </div>
        </div>
      </header>

      {/* ================= 2. HERO SPLIT: STORY & CONNECTED LOGIN PORTAL ================= */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px 60px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 40,
          alignItems: 'center',
        }}>
          {/* Left Column: Authentic Value Proposition */}
          <div>
            {/* Real Philippine Service Pill */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: '20px',
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              color: '#334155',
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 18,
            }}>
              <span>🇵🇭</span>
              <span>Metro Manila Service Hubs • Certified Hanging Scales</span>
            </div>

            <h1 style={{
              fontSize: 'clamp(2.1rem, 4.5vw, 3.2rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              color: '#0F172A',
              marginBottom: 18,
            }}>
              Doorstep Laundry.<br />
              <span style={{ color: '#0284C7' }}>Weighed in Front of You.</span>
            </h1>

            <p style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: '#475569',
              marginBottom: 24,
              maxWidth: 540,
            }}>
              No more guessing games or mystery laundry bills. Our riders bring calibrated digital hanging scales straight to your doorstep, lock in your exact weight at ₱35/kg, and return your clothes fresh, dried, and neatly folded within 24–48 hours.
            </p>

            {/* Practical Service Highlights (Not AI buzzwords) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 28 }}>
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}>
                <span style={{ fontSize: 20 }}>⚖️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>Doorstep Weighing</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Weighed at your door before handover</div>
                </div>
              </div>

              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}>
                <span style={{ fontSize: 20 }}>🏷️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>₱35.00 / kg Flat Rate</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Wash, dry, fold + flat ₱50 delivery</div>
                </div>
              </div>

              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}>
                <span style={{ fontSize: 20 }}>🛵</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>Live Rider Tracking</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Real-time GPS telemetry on your phone</div>
                </div>
              </div>

              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}>
                <span style={{ fontSize: 20 }}>💳</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>Cash or Online</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>GCash, Maya, cards, or COD on delivery</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link
                href="/register"
                style={{
                  padding: '14px 26px',
                  borderRadius: 10,
                  background: '#0284C7',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 15,
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.28)',
                }}
              >
                Schedule Doorstep Pickup →
              </Link>
              <a
                href="#calculator"
                style={{
                  padding: '14px 22px',
                  borderRadius: 10,
                  background: '#FFFFFF',
                  color: '#334155',
                  border: '1px solid #CBD5E1',
                  fontWeight: 700,
                  fontSize: 15,
                  textDecoration: 'none',
                }}
              >
                Estimate Rate (₱)
              </a>
            </div>
          </div>

          {/* Right Column: Directly Connected Login Portal Card */}
          <div ref={loginSectionRef} id="login-portal" style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: '100%',
              maxWidth: 420,
              background: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid #E2E8F0',
              padding: '28px 24px',
              boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.08), 0 4px 10px rgba(0, 0, 0, 0.03)',
            }}>
              {/* Card Header */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <img
                  src="/icons/gowashgo-icon.png"
                  alt="GoWashGo"
                  width={48}
                  height={48}
                  style={{ borderRadius: 12, objectFit: 'contain', margin: '0 auto 8px', display: 'block' }}
                />
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
                  Access Your Account
                </h2>
                <p style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                  Track active pickups, view scale receipts &amp; dispatch
                </p>
              </div>

              {/* Embedded Login Form with Suspense Boundary */}
              <Suspense fallback={
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                  <div className="btn__spinner" style={{ margin: '0 auto' }} />
                  <p style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>Loading login portal...</p>
                </div>
              }>
                <LoginForm embedded={true} />
              </Suspense>

              {/* Register Callout */}
              <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: '#64748B' }}>
                New to GoWashGo?{' '}
                <Link href="/register" style={{ color: '#0284C7', fontWeight: 700, textDecoration: 'none' }}>
                  Create Customer Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 3. INTERACTIVE INSTANT RATE CALCULATOR ================= */}
      <section id="calculator" style={{ background: '#FFFFFF', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', padding: '60px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0284C7' }}>
              Transparent Doorstep Estimation
            </span>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 800, color: '#0F172A', marginTop: 6, letterSpacing: '-0.02em' }}>
              Calculate Your Exact Laundry Rate
            </h2>
            <p style={{ fontSize: 14, color: '#64748B', maxWidth: 520, margin: '8px auto 0' }}>
              Select your service and estimated load weight. Your rider confirms the exact weight on the calibrated scale at your doorstep.
            </p>
          </div>

          <div style={{
            background: '#F8FAFC',
            border: '1.5px solid #E2E8F0',
            borderRadius: 16,
            padding: '28px',
          }}>
            {/* Service Toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
              {[
                { id: 'fold', label: 'Wash, Dry & Fold', rate: '₱35/kg', note: 'Everyday clothes' },
                { id: 'press', label: 'Wash & Press', rate: '₱55/kg', note: 'Polos, slacks, uniforms' },
                { id: 'comforter', label: 'Heavy Bedding', rate: '₱60/kg', note: 'Thick duvets, blankets' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedService(s.id as any)}
                  style={{
                    padding: '12px 10px',
                    borderRadius: 10,
                    border: selectedService === s.id ? '2px solid #0284C7' : '1px solid #CBD5E1',
                    background: selectedService === s.id ? '#F0F9FF' : '#FFFFFF',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, color: selectedService === s.id ? '#0284C7' : '#0F172A' }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#0369A1', marginTop: 2 }}>{s.rate}</div>
                  <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{s.note}</div>
                </button>
              ))}
            </div>

            {/* Weight Presets & Slider */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Estimated Laundry Weight:</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#0284C7' }}>{estWeight} kg</span>
              </div>

              <input
                type="range"
                min={2}
                max={25}
                step={0.5}
                value={estWeight}
                onChange={(e) => setEstWeight(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#0284C7', cursor: 'pointer' }}
              />

              {/* Preset Buttons */}
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {[
                  { kg: 4, text: '4 kg (Solo Load)' },
                  { kg: 7, text: '7 kg (Couple / Weekly)' },
                  { kg: 12, text: '12 kg (Family Load)' },
                  { kg: 18, text: '18 kg (Bulk / Sheets)' },
                ].map((p) => (
                  <button
                    key={p.kg}
                    type="button"
                    onClick={() => setEstWeight(p.kg)}
                    style={{
                      padding: '5px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      background: estWeight === p.kg ? '#0284C7' : '#FFFFFF',
                      color: estWeight === p.kg ? '#FFFFFF' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    {p.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Cost Breakdown Receipt Box */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569' }}>
                <span>Laundry Care ({estWeight} kg × ₱{ratePerKg}.00/kg)</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>₱{washTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569' }}>
                <span>Flat Roundtrip Delivery Fee</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>₱{deliveryFee.toFixed(2)}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: 10,
                borderTop: '1.5px dashed #CBD5E1',
                marginTop: 4,
              }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>Estimated Total</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>Verified on doorstep scale before wash</div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#0284C7' }}>
                  ₱{grandTotal.toFixed(2)}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <Link
                href="/register"
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  background: '#0284C7',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: 'none',
                }}
              >
                Proceed to Book This Load →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 4. HOW IT WORKS: 4 CONCRETE STEPS ================= */}
      <section id="how-it-works" style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0284C7' }}>
            Straightforward Process
          </span>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 800, color: '#0F172A', marginTop: 6, letterSpacing: '-0.02em' }}>
            How GoWashGo Doorstep Service Works
          </h2>
          <p style={{ fontSize: 14, color: '#64748B', maxWidth: 540, margin: '8px auto 0' }}>
            Designed for busy professionals and families. We handle the pickup, weighing, professional wash, and return delivery.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {[
            {
              step: '01',
              title: 'Book in Under 60 Seconds',
              desc: 'Select your pickup time, address, and any special care requests (stain pre-treatment, delicate garments).',
              icon: '📱',
            },
            {
              step: '02',
              title: 'Doorstep Scale Verification',
              desc: 'Our uniformed rider arrives with a calibrated digital hanging scale. We weigh your laundry together at your door and lock in the price.',
              icon: '⚖️',
            },
            {
              step: '03',
              title: 'Commercial Hub Wash & Fold',
              desc: 'Your laundry is sorted by whites and colors, washed in high-grade commercial washers, tumble dried, and crisp-folded.',
              icon: '🧺',
            },
            {
              step: '04',
              title: 'Sealed Delivery & Flexible Pay',
              desc: 'Delivered back in weather-proof sealed packs. Pay conveniently online via GCash/Maya or Cash on Delivery (COD).',
              icon: '🛵',
            },
          ].map((s) => (
            <div
              key={s.step}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 14,
                padding: '24px 20px',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 28 }}>{s.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.05em' }}>
                  STEP {s.step}
                </span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= 5. RATES & SERVICE MENU ================= */}
      <section id="rates" style={{ background: '#FFFFFF', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', padding: '60px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0284C7' }}>
              Standard Rate Card
            </span>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 800, color: '#0F172A', marginTop: 6 }}>
              Transparent Laundry Rates
            </h2>
            <p style={{ fontSize: 14, color: '#64748B', maxWidth: 480, margin: '8px auto 0' }}>
              No hidden fees, no surge pricing. Every order includes doorstep hanging scale verification.
            </p>
          </div>

          <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '14px 18px', fontWeight: 700, color: '#334155' }}>Service Category</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, color: '#334155' }}>What Is Included</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, color: '#0284C7', textAlign: 'right' }}>Price Rate</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0F172A' }}>Wash, Dry &amp; Fold</td>
                  <td style={{ padding: '14px 18px', color: '#64748B', fontSize: 13 }}>Everyday shirts, pants, underwear, towels &amp; bedsheets</td>
                  <td style={{ padding: '14px 18px', fontWeight: 800, color: '#0F172A', textAlign: 'right' }}>₱35.00 / kg</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0F172A' }}>Wash &amp; Steam Press</td>
                  <td style={{ padding: '14px 18px', color: '#64748B', fontSize: 13 }}>School &amp; office uniforms, slacks, button-down polos</td>
                  <td style={{ padding: '14px 18px', fontWeight: 800, color: '#0F172A', textAlign: 'right' }}>₱55.00 / kg</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0F172A' }}>Bulky Bedding &amp; Quilts</td>
                  <td style={{ padding: '14px 18px', color: '#64748B', fontSize: 13 }}>Thick comforters, duvets, heavy blankets</td>
                  <td style={{ padding: '14px 18px', fontWeight: 800, color: '#0F172A', textAlign: 'right' }}>₱60.00 / kg</td>
                </tr>
                <tr>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0F172A' }}>Roundtrip Delivery</td>
                  <td style={{ padding: '14px 18px', color: '#64748B', fontSize: 13 }}>Doorstep pickup &amp; delivery anywhere within branch service area</td>
                  <td style={{ padding: '14px 18px', fontWeight: 800, color: '#0284C7', textAlign: 'right' }}>₱50.00 flat</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ================= 6. FREQUENTLY ASKED QUESTIONS ================= */}
      <section id="faq" style={{ maxWidth: 860, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0284C7' }}>
            Got Questions?
          </span>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 800, color: '#0F172A', marginTop: 6 }}>
            Frequently Asked Questions
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            {
              q: 'How does doorstep scale weighing work?',
              a: 'When our rider arrives at your home, they carry a certified digital hanging scale. We hook your laundry bag and confirm the exact weight right before your eyes. The total price locks in on your phone before the clothes leave your doorstep.',
            },
            {
              q: 'When do I need to pay for my laundry?',
              a: 'You can pay online anytime via GCash, Maya, or Credit/Debit card through our PayMongo integration, or simply pay Cash on Delivery (COD) to the rider when your fresh clothes are delivered.',
            },
            {
              q: 'How are my clothes separated and washed?',
              a: 'All laundry is sorted into whites, lights, and dark colors. Delicates and items with stain removal tags receive commercial enzyme treatment before being washed in sanitary washers and tumble dried.',
            },
            {
              q: 'What is the standard turnaround time?',
              a: 'Standard wash, dry, and fold orders are completed and returned within 24 to 48 hours. You can follow live progress and rider dispatch telemetry anytime from your account dashboard.',
            },
          ].map((faq, i) => (
            <div
              key={i}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '16px 20px',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', marginBottom: 6 }}>{faq.q}</div>
              <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>{faq.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= 7. FOOTER ================= */}
      <footer style={{ background: '#0F172A', color: '#94A3B8', padding: '48px 24px 32px', borderTop: '1px solid #1E293B' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32, marginBottom: 36 }}>
          {/* Brand Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <img src="/icons/gowashgo-icon.png" alt="GoWashGo" width={32} height={32} style={{ borderRadius: 8, objectFit: 'contain' }} />
              <span style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF' }}>GoWashGo</span>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.6, color: '#94A3B8' }}>
              On-demand doorstep laundry pickup and delivery platform with verified digital scale weighing for households and businesses across the Philippines.
            </p>
          </div>

          {/* Operating Hours */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Operating Hours
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              <div>Monday – Sunday: 7:00 AM – 9:00 PM</div>
              <div style={{ marginTop: 4, color: '#0284C7', fontWeight: 600 }}>Riders on duty daily</div>
            </div>
          </div>

          {/* Accepted Payments */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Payment Methods
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              <div>• GCash &amp; Maya mobile e-wallet</div>
              <div>• Visa / Mastercard (PayMongo)</div>
              <div>• Cash on Delivery (COD)</div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Account Access
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              <button
                onClick={scrollToLogin}
                type="button"
                style={{ background: 'none', border: 'none', padding: 0, color: '#0284C7', textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                Sign In to Account
              </button>
              <Link href="/register" style={{ color: '#94A3B8', textDecoration: 'none' }}>
                Register New Customer
              </Link>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', paddingTop: 24, borderTop: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, fontSize: 12 }}>
          <div>© {new Date().getFullYear()} GoWashGo. All rights reserved.</div>
          <div style={{ color: '#64748B' }}>Smart Laundry Pickup &amp; Delivery System • Philippines</div>
        </div>
      </footer>

      {/* Mount AI Concierge Chathead on Landing Page */}
      <LaundryChathead />
    </div>
  );
}
