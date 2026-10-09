'use client';

import { useState } from 'react';
import Link from 'next/link';
import LaundryChathead from '@/components/chat/LaundryChathead';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: 'Do I need to book in advance?',
    answer: 'No. Walk in during opening hours with your laundry bag, or request a doorstep rider directly on our site. For a very large load or something unusual, give us a quick call first.',
  },
  {
    question: 'When will my laundry be ready?',
    answer: 'Usually in 24–48 hours for everyday wash, dry & fold. Heavy duvets and peak weekend days can take slightly longer. We confirm a clear collection or delivery time at drop-off.',
  },
  {
    question: 'Can you use fragrance-free detergent?',
    answer: 'Yes, by request. Tell our rider or counter attendant. Please mention any skin allergies too; we can discuss what is suitable and ensure gentle treatment.',
  },
  {
    question: 'What should I keep out of my bag?',
    answer: 'Dry-clean-only pieces, structured leather and garments marked "do not tumble dry" need a separate conversation. Please empty all pockets and point out any special stains before handoff.',
  },
  {
    question: 'Do you collect and deliver to my doorstep?',
    answer: 'Yes. Our riders bring calibrated hanging scales right to your doorstep so you can verify the weight on the spot. We pack and return your folded laundry ready to put away.',
  },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#F7F5F0',
        color: '#1E2D34',
        fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* ================= HEADER / NAVIGATION ================= */}
      <header
        style={{
          borderBottom: '1px solid #E6E2D8',
          background: '#F7F5F0',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Minimalist Logo */}
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textDecoration: 'none',
              color: '#1C323D',
            }}
          >
            {/* Geometric Mark */}
            <div
              style={{
                width: 24,
                height: 24,
                border: '1.5px solid #1C323D',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  border: '1.5px solid #1C323D',
                }}
              />
            </div>
            <span
              style={{
                fontSize: 21,
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: '#1C323D',
                fontFamily: 'inherit',
              }}
            >
              gowashgo
            </span>
          </Link>

          {/* Center Navigation Links */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 36,
            }}
            className="editorial-nav"
          >
            <a
              href="#services"
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#2A3C45',
                textDecoration: 'none',
              }}
            >
              Services & prices
            </a>
            <a
              href="#hubs"
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#2A3C45',
                textDecoration: 'none',
              }}
            >
              Our shop
            </a>
            <a
              href="#faq"
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#2A3C45',
                textDecoration: 'none',
              }}
            >
              Good to know
            </a>
          </nav>

          {/* Right Action Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a
              href="#hubs"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 18px',
                fontSize: 13,
                fontWeight: 600,
                color: '#1C323D',
                background: 'transparent',
                border: '1px solid #1C323D',
                borderRadius: 2,
                textDecoration: 'none',
                letterSpacing: '0.01em',
                transition: 'all 0.15s ease',
              }}
            >
              Find our hubs ↗
            </a>
          </div>
        </div>
      </header>

      {/* ================= HERO SECTION ================= */}
      <section
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '60px 24px 70px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 48,
            alignItems: 'center',
          }}
        >
          {/* Left Column: Copy */}
          <div style={{ maxWidth: 540 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: '#556D77',
                textTransform: 'uppercase',
                marginBottom: 28,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              YOUR NEIGHBOURHOOD LAUNDRY · N16 & METRO HUBS
            </p>

            <h1
              style={{
                fontSize: 'clamp(44px, 5.5vw, 68px)',
                lineHeight: 1.05,
                fontWeight: 800,
                color: '#1C323D',
                letterSpacing: '-0.035em',
                margin: 0,
                marginBottom: 16,
              }}
            >
              Life happens.
              <br />
              Laundry
              <br />
              piles up.
            </h1>

            <p
              style={{
                fontFamily: '"Newsreader", Georgia, serif',
                fontStyle: 'italic',
                fontSize: 'clamp(24px, 2.6vw, 30px)',
                color: '#345260',
                margin: '0 0 24px 0',
                lineHeight: 1.25,
                fontWeight: 400,
              }}
            >
              We’ll take it from here.
            </p>

            <p
              style={{
                fontSize: 16,
                lineHeight: 1.65,
                color: '#556872',
                marginBottom: 36,
                maxWidth: 440,
              }}
            >
              The school uniforms. The week’s worth of socks. The sheets you meant to wash on Sunday. Bring them to GoWashGo, and get a little of your day back.
            </p>

            {/* CTAs */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                marginBottom: 44,
                flexWrap: 'wrap',
              }}
            >
              <Link
                href="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#1C323D',
                  color: '#FFFFFF',
                  padding: '13px 24px',
                  borderRadius: 2,
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: 'none',
                  letterSpacing: '0.01em',
                }}
              >
                Plan your drop-off ↗
              </Link>
              <a
                href="#pricing"
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#1C323D',
                  textDecoration: 'underline',
                  textUnderlineOffset: 4,
                }}
              >
                See the price list
              </a>
            </div>

            <p
              style={{
                fontSize: 11,
                letterSpacing: '0.08em',
                color: '#7B8C94',
                fontFamily: '"JetBrains Mono", monospace',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              NO BOOKING NEEDED. JUST BRING YOUR BAG.
            </p>
          </div>

          {/* Right Column: Hero Image */}
          <div>
            <div
              style={{
                borderRadius: 2,
                overflow: 'hidden',
                background: '#EAE6DC',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              }}
            >
              <img
                src="/images/hero-table.jpg"
                alt="Neat folded laundry on wooden table with laundromat background"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  aspectRatio: '4 / 3',
                  objectFit: 'cover',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 14,
                fontSize: 11,
                color: '#6F818A',
                fontFamily: '"JetBrains Mono", monospace',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              <span>A FRESH START, ONE LOAD AT A TIME.</span>
              <span
                style={{
                  fontFamily: '"Newsreader", Georgia, serif',
                  fontStyle: 'italic',
                  fontSize: 14,
                  color: '#4B6572',
                  textTransform: 'none',
                  letterSpacing: 'normal',
                }}
              >
                See you at the counter.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION 01: WHAT WE TAKE OFF YOUR HANDS ================= */}
      <section
        id="services"
        style={{
          borderTop: '1px solid #E6E2D8',
          maxWidth: 1240,
          margin: '0 auto',
          padding: '80px 24px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 60,
          }}
        >
          {/* Left Column */}
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: '#556D77',
                textTransform: 'uppercase',
                marginBottom: 24,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              01 / WHAT WE TAKE OFF YOUR HANDS
            </p>
            <h2
              style={{
                fontSize: 'clamp(36px, 4.2vw, 50px)',
                lineHeight: 1.1,
                fontWeight: 800,
                color: '#1C323D',
                letterSpacing: '-0.03em',
                marginBottom: 20,
              }}
            >
              A small shop.
              <br />
              A useful list.
            </h2>
            <p
              style={{
                fontSize: 16,
                lineHeight: 1.6,
                color: '#556872',
                marginBottom: 28,
                maxWidth: 380,
              }}
            >
              No complicated packages. Just the laundry help you actually need.
            </p>
            <p
              style={{
                fontFamily: '"Newsreader", Georgia, serif',
                fontStyle: 'italic',
                fontSize: 20,
                lineHeight: 1.4,
                color: '#345260',
              }}
            >
              Not sure about a care label?
              <br />
              Bring it in. We’ll have a look.
            </p>
          </div>

          {/* Right Column: List of 3 Services */}
          <div>
            {/* Item 1 */}
            <div style={{ borderTop: '1px solid #D6D0C4', padding: '24px 0 32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: '#1C323D', margin: 0 }}>
                  Wash, dry & fold
                </h3>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14, color: '#1C323D', fontWeight: 600 }}>
                  ₱35 / kg
                </span>
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: '#556872', margin: '0 0 12px 0', maxWidth: 480 }}>
                Your everyday clothes, washed separately, dried with care and folded into a neat, ready-to-put-away stack.
              </p>
              <p style={{ fontFamily: '"Newsreader", Georgia, serif', fontStyle: 'italic', fontSize: 15, color: '#4B6572', margin: 0 }}>
                For the weekly pile
              </p>
            </div>

            {/* Item 2 */}
            <div style={{ borderTop: '1px solid #D6D0C4', padding: '24px 0 32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: '#1C323D', margin: 0 }}>
                  Duvets & the big stuff
                </h3>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14, color: '#1C323D', fontWeight: 600 }}>
                  From ₱180
                </span>
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: '#556872', margin: '0 0 12px 0', maxWidth: 480 }}>
                Duvets, blankets and bed linen. The things that never quite fit in the machine at home.
              </p>
              <p style={{ fontFamily: '"Newsreader", Georgia, serif', fontStyle: 'italic', fontSize: 15, color: '#4B6572', margin: 0 }}>
                For a better bedtime
              </p>
            </div>

            {/* Item 3 */}
            <div style={{ borderTop: '1px solid #D6D0C4', borderBottom: '1px solid #D6D0C4', padding: '24px 0 32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: '#1C323D', margin: 0 }}>
                  A little pressing
                </h3>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14, color: '#1C323D', fontWeight: 600 }}>
                  From ₱55
                </span>
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: '#556872', margin: '0 0 12px 0', maxWidth: 480 }}>
                Shirts, trousers and everyday favourites, pressed and hung. Bring them clean, or add a wash.
              </p>
              <p style={{ fontFamily: '"Newsreader", Georgia, serif', fontStyle: 'italic', fontSize: 15, color: '#4B6572', margin: 0 }}>
                For looking put-together
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION 02: SMALL PRINT. CLEAR PRICES. ================= */}
      <section
        id="pricing"
        style={{
          background: '#E2ECE9',
          borderTop: '1px solid #D1DDD9',
          borderBottom: '1px solid #D1DDD9',
          padding: '80px 24px 90px',
        }}
      >
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: '#4D6B6B',
              textTransform: 'uppercase',
              marginBottom: 20,
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            02 / NOTHING TO GUESS AT
          </p>

          <h2
            style={{
              fontSize: 'clamp(36px, 4.4vw, 52px)',
              lineHeight: 1.1,
              fontWeight: 800,
              color: '#1C323D',
              letterSpacing: '-0.03em',
              marginBottom: 44,
            }}
          >
            Small print. Clear prices.
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: 56,
              alignItems: 'flex-start',
            }}
          >
            {/* Left: Price Table */}
            <div>
              {/* Header row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingBottom: 12,
                  borderBottom: '1px solid #C4D3CF',
                  fontSize: 11,
                  fontFamily: '"JetBrains Mono", monospace',
                  letterSpacing: '0.08em',
                  color: '#557270',
                  textTransform: 'uppercase',
                }}
              >
                <span>SERVICE</span>
                <span>PRICE</span>
              </div>

              {/* Rows */}
              {[
                { name: 'Wash, dry & fold', desc: 'Per kg · 5 kg minimum', price: '₱35.00' },
                { name: 'Single duvet / comforter', desc: 'Wash & dry · synthetic fill', price: '₱180.00' },
                { name: 'Double / king duvet', desc: 'Wash & dry · synthetic fill', price: '₱240.00' },
                { name: 'Shirt pressing', desc: 'Per shirt · supplied clean', price: '₱35.00' },
                { name: 'Trouser pressing', desc: 'Per pair · supplied clean', price: '₱55.00' },
                { name: 'Doorstep pickup & return', desc: 'Metro Manila flat delivery', price: '₱50.00' },
              ].map((row, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    padding: '18px 0',
                    borderBottom: '1px solid #D1DDD9',
                  }}
                >
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#1C323D', display: 'block' }}>
                      {row.name}
                    </span>
                    <span style={{ fontSize: 12, color: '#5C7474' }}>{row.desc}</span>
                  </div>
                  <span
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 16,
                      fontWeight: 600,
                      color: '#1C323D',
                    }}
                  >
                    {row.price}
                  </span>
                </div>
              ))}

              <p style={{ fontSize: 13, color: '#688280', marginTop: 20, lineHeight: 1.5 }}>
                Feather duvets, delicate items or an urgent order? Ask for a quote first.
              </p>
            </div>

            {/* Right: Counter Receipt Card */}
            <div>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: '#4E6867', marginBottom: 20, maxWidth: 360 }}>
                A sample of our counter price list. We weigh your bag and agree the total before we start.
              </p>

              {/* The Weekly Bag Card */}
              <div
                style={{
                  background: '#FDFBF7',
                  padding: '36px 32px',
                  borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(28, 50, 61, 0.06)',
                  maxWidth: 400,
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.1em',
                    fontFamily: '"JetBrains Mono", monospace',
                    color: '#657E7C',
                    textTransform: 'uppercase',
                    marginBottom: 10,
                  }}
                >
                  THE WEEKLY BAG
                </p>

                <h3
                  style={{
                    fontFamily: '"Newsreader", Georgia, serif',
                    fontStyle: 'italic',
                    fontSize: 24,
                    color: '#1C323D',
                    fontWeight: 400,
                    margin: '0 0 20px 0',
                  }}
                >
                  One less Sunday chore.
                </h3>

                <div style={{ height: 1, background: '#EAE5D9', marginBottom: 20 }} />

                <p style={{ fontSize: 14, color: '#556872', lineHeight: 1.5, marginBottom: 24 }}>
                  T-shirts, socks, everyday clothes and a couple of towels.
                </p>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 13,
                    color: '#4B6261',
                    marginBottom: 8,
                  }}
                >
                  <span>6 kg × ₱35.00</span>
                  <span>₱210.00</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 13,
                    color: '#4B6261',
                    marginBottom: 20,
                  }}
                >
                  <span>Doorstep return</span>
                  <span>₱50.00</span>
                </div>

                <div style={{ height: 1, background: '#EAE5D9', marginBottom: 20 }} />

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 20,
                  }}
                >
                  <span
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 12,
                      letterSpacing: '0.08em',
                      color: '#4B6261',
                      textTransform: 'uppercase',
                    }}
                  >
                    TOTAL
                  </span>
                  <span
                    style={{
                      fontSize: 40,
                      fontWeight: 800,
                      color: '#1C323D',
                      letterSpacing: '-0.03em',
                      lineHeight: 1,
                    }}
                  >
                    ₱260
                  </span>
                </div>

                <p
                  style={{
                    fontSize: 10,
                    fontFamily: '"JetBrains Mono", monospace',
                    color: '#7B8E8C',
                    lineHeight: 1.6,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    margin: 0,
                  }}
                >
                  WASHED. DRIED. FOLDED.
                  <br />
                  EXAMPLE ORDER — NOT A FIXED BAG PRICE.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION 03: IN WITH A BAG. OUT WITH TIME. ================= */}
      <section
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '80px 24px',
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: '#556D77',
            textTransform: 'uppercase',
            marginBottom: 20,
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          03 / YOUR NEXT LAUNDRY DAY
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: 24,
            marginBottom: 50,
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(36px, 4.4vw, 52px)',
              lineHeight: 1.1,
              fontWeight: 800,
              color: '#1C323D',
              letterSpacing: '-0.03em',
              margin: 0,
            }}
          >
            In with a bag. Out with time.
          </h2>
          <p
            style={{
              fontSize: 14,
              color: '#5A6F79',
              maxWidth: 340,
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Everyday loads are usually ready in 24–48 hours. We’ll confirm at the counter.
          </p>
        </div>

        {/* 3 Step Process Columns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 40,
          }}
        >
          {/* Step 01 */}
          <div style={{ borderTop: '1px solid #D6D0C4', paddingTop: 28 }}>
            <span
              style={{
                fontFamily: '"Newsreader", Georgia, serif',
                fontSize: 36,
                color: '#345260',
                display: 'block',
                marginBottom: 16,
                lineHeight: 1,
              }}
            >
              01
            </span>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1C323D', marginBottom: 12 }}>
              Bring your bag.
            </h3>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: '#556872', margin: 0 }}>
              Pop in when we’re open. Tell us about stains, allergies or anything that needs extra attention.
            </p>
          </div>

          {/* Step 02 */}
          <div style={{ borderTop: '1px solid #D6D0C4', paddingTop: 28 }}>
            <span
              style={{
                fontFamily: '"Newsreader", Georgia, serif',
                fontSize: 36,
                color: '#345260',
                display: 'block',
                marginBottom: 16,
                lineHeight: 1,
              }}
            >
              02
            </span>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1C323D', marginBottom: 12 }}>
              We do the washing.
            </h3>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: '#556872', margin: 0 }}>
              We check, weigh and sort. You get a price and a collection time before leaving your laundry with us.
            </p>
          </div>

          {/* Step 03 */}
          <div style={{ borderTop: '1px solid #D6D0C4', paddingTop: 28 }}>
            <span
              style={{
                fontFamily: '"Newsreader", Georgia, serif',
                fontSize: 36,
                color: '#345260',
                display: 'block',
                marginBottom: 16,
                lineHeight: 1,
              }}
            >
              03
            </span>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1C323D', marginBottom: 12 }}>
              Pick up. Put away.
            </h3>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: '#556872', margin: 0 }}>
              We text when it’s ready. Collect your neatly folded clothes and get on with the rest of your week.
            </p>
          </div>
        </div>
      </section>

      {/* ================= SECTION 04: NOT JUST CLEAN. CARED FOR. (DARK SLATE) ================= */}
      <section
        style={{
          background: '#1E3640',
          color: '#FFFFFF',
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          }}
        >
          {/* Left: Photo of Folding Attendant */}
          <div style={{ minHeight: 460 }}>
            <img
              src="/images/folding-hands.jpg"
              alt="Attendant neatly folding fresh linen on counter"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>

          {/* Right: Quality Care Copy */}
          <div style={{ padding: '70px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: '#8CA5AF',
                textTransform: 'uppercase',
                marginBottom: 20,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              04 / A LITTLE EXTRA ATTENTION
            </p>

            <h2
              style={{
                fontSize: 'clamp(36px, 4.4vw, 54px)',
                lineHeight: 1.08,
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.03em',
                marginBottom: 40,
              }}
            >
              Not just clean.
              <br />
              Cared for.
            </h2>

            {/* Quality Point 1 */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: 24, marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 8 }}>
                Your load stays yours.
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: '#B3C3CB', margin: 0 }}>
                We don’t mix your washing with another customer’s. Socks have enough ways to go missing.
              </p>
            </div>

            {/* Quality Point 2 */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: 24, marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 8 }}>
                Care labels get read.
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: '#B3C3CB', margin: 0 }}>
                Colours and fabrics are sorted, and heat is chosen for the load. If something looks delicate, we ask.
              </p>
            </div>

            {/* Quality Point 3 */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: 24, marginBottom: 28 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 8 }}>
                Preferences get written down.
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: '#B3C3CB', margin: 0 }}>
                Prefer fragrance-free detergent or a low-heat dry? Tell us at drop-off and we’ll note it on your order.
              </p>
            </div>

            {/* Closing Quote */}
            <p
              style={{
                fontFamily: '"Newsreader", Georgia, serif',
                fontStyle: 'italic',
                fontSize: 19,
                color: '#D4E2E8',
                margin: 0,
              }}
            >
              Good laundry is mostly in the little things.
            </p>
          </div>
        </div>
      </section>

      {/* ================= SECTION 05: A LAUNDRY SHOP. NOT AN APP. ================= */}
      <section
        id="hubs"
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '90px 24px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 60,
            alignItems: 'center',
          }}
        >
          {/* Left: Storefront image */}
          <div>
            <div
              style={{
                borderRadius: 2,
                overflow: 'hidden',
                background: '#EAE6DC',
              }}
            >
              <img
                src="/images/storefront-hub.jpg"
                alt="Neighborhood blue storefront laundry shop with bicycle out front"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  aspectRatio: '4 / 3',
                  objectFit: 'cover',
                }}
              />
            </div>
            <p
              style={{
                fontSize: 11,
                fontFamily: '"JetBrains Mono", monospace',
                letterSpacing: '0.06em',
                color: '#768891',
                marginTop: 14,
                textTransform: 'uppercase',
              }}
            >
              THE LITTLE BLUE SHOP ON KATIPUNAN AVENUE.
            </p>
          </div>

          {/* Right: Narrative Story */}
          <div style={{ maxWidth: 500 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: '#556D77',
                textTransform: 'uppercase',
                marginBottom: 20,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              05 / AROUND THE CORNER
            </p>

            <h2
              style={{
                fontSize: 'clamp(36px, 4.4vw, 54px)',
                lineHeight: 1.08,
                fontWeight: 800,
                color: '#1C323D',
                letterSpacing: '-0.03em',
                marginBottom: 28,
              }}
            >
              A laundry shop.
              <br />
              Not an app.
            </h2>

            <p style={{ fontSize: 16, lineHeight: 1.65, color: '#556872', marginBottom: 20 }}>
              GoWashGo is built around a simple idea: a useful little shop makes everyday life a bit easier. Somewhere you can walk in, talk to a person and know who’s looking after your things.
            </p>

            <p style={{ fontSize: 16, lineHeight: 1.65, color: '#556872', marginBottom: 32 }}>
              There’s a counter for your laundry, a bench for a breather and room for a quick chat. Bring the overflowing bag. Bring the shirt with the mysterious stain. You’re in the right place.
            </p>

            <blockquote style={{ margin: '0 0 20px 0' }}>
              <p
                style={{
                  fontFamily: '"Newsreader", Georgia, serif',
                  fontStyle: 'italic',
                  fontSize: 24,
                  lineHeight: 1.3,
                  color: '#2A4654',
                  margin: 0,
                }}
              >
                “Useful work, done properly.
                <br />
                That’s the whole idea.”
              </p>
            </blockquote>

            <p
              style={{
                fontSize: 11,
                fontFamily: '"JetBrains Mono", monospace',
                letterSpacing: '0.08em',
                color: '#768891',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              A NOTE FROM THE GOWASHGO COUNTER
            </p>
          </div>
        </div>
      </section>

      {/* ================= SECTION 06: IT'S THE ORDINARY THINGS. (SAGE TINT) ================= */}
      <section
        style={{
          background: '#E2ECE9',
          borderTop: '1px solid #D1DDD9',
          borderBottom: '1px solid #D1DDD9',
          padding: '80px 24px 90px',
        }}
      >
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              gap: 16,
              marginBottom: 16,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: '#4D6B6B',
                textTransform: 'uppercase',
                margin: 0,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              06 / LESS LAUNDRY, MORE LIFE
            </p>
            <p
              style={{
                fontSize: 11,
                letterSpacing: '0.08em',
                color: '#5E7978',
                fontFamily: '"JetBrains Mono", monospace',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              ILLUSTRATIVE CUSTOMER STORIES
            </p>
          </div>

          <h2
            style={{
              fontSize: 'clamp(36px, 4.4vw, 52px)',
              lineHeight: 1.1,
              fontWeight: 800,
              color: '#1C323D',
              letterSpacing: '-0.03em',
              marginBottom: 50,
            }}
          >
            It’s the ordinary things.
          </h2>

          {/* 3 Review Columns */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 48,
            }}
          >
            {/* Story 1 */}
            <div>
              <p
                style={{
                  fontFamily: '"Newsreader", Georgia, serif',
                  fontSize: 22,
                  lineHeight: 1.4,
                  color: '#1C323D',
                  marginBottom: 24,
                }}
              >
                “The best bit isn’t the clean clothes. It’s not spending my entire Saturday doing them.”
              </p>
              <div style={{ height: 1, background: '#C8D7D3', marginBottom: 16 }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1C323D', margin: '0 0 4px 0' }}>
                The weekly regular
              </p>
              <p style={{ fontSize: 12, color: '#5C7474', margin: 0 }}>
                Wash, dry & fold · 6 kg bag
              </p>
            </div>

            {/* Story 2 */}
            <div>
              <p
                style={{
                  fontFamily: '"Newsreader", Georgia, serif',
                  fontSize: 22,
                  lineHeight: 1.4,
                  color: '#1C323D',
                  marginBottom: 24,
                }}
              >
                “A king-size duvet, a tiny washing machine at home. This is a much better arrangement.”
              </p>
              <div style={{ height: 1, background: '#C8D7D3', marginBottom: 16 }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1C323D', margin: '0 0 4px 0' }}>
                The big-load neighbour
              </p>
              <p style={{ fontSize: 12, color: '#5C7474', margin: 0 }}>
                King duvet · wash & dry
              </p>
            </div>

            {/* Story 3 */}
            <div>
              <p
                style={{
                  fontFamily: '"Newsreader", Georgia, serif',
                  fontSize: 22,
                  lineHeight: 1.4,
                  color: '#1C323D',
                  marginBottom: 24,
                }}
              >
                “I asked for no fragrance. They wrote it down, checked it with me and kept it simple.”
              </p>
              <div style={{ height: 1, background: '#C8D7D3', marginBottom: 16 }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1C323D', margin: '0 0 4px 0' }}>
                The particular customer
              </p>
              <p style={{ fontSize: 12, color: '#5C7474', margin: 0 }}>
                Fragrance-free wash · by request
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION 07: A FEW GOOD QUESTIONS. ================= */}
      <section
        id="faq"
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '80px 24px 90px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 60,
          }}
        >
          {/* Left Column: Heading & Contact */}
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: '#556D77',
                textTransform: 'uppercase',
                marginBottom: 20,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              07 / BEFORE YOU BRING A BAG
            </p>

            <h2
              style={{
                fontSize: 'clamp(36px, 4.4vw, 52px)',
                lineHeight: 1.1,
                fontWeight: 800,
                color: '#1C323D',
                letterSpacing: '-0.03em',
                marginBottom: 24,
              }}
            >
              A few good
              <br />
              questions.
            </h2>

            <p style={{ fontSize: 15, lineHeight: 1.6, color: '#556872', marginBottom: 28, maxWidth: 360 }}>
              Something else on your mind? We’re happy to talk laundry.
            </p>

            <a
              href="tel:09178889274"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 15,
                fontWeight: 600,
                color: '#1C323D',
                textDecoration: 'underline',
                textUnderlineOffset: 4,
              }}
            >
              0917 888 9274 ↗
            </a>
          </div>

          {/* Right Column: FAQ List */}
          <div>
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                style={{
                  borderTop: '1px solid #D6D0C4',
                  padding: '24px 0',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: '#1C323D',
                      paddingRight: 20,
                      lineHeight: 1.35,
                    }}
                  >
                    {faq.question}
                  </span>
                  <span
                    style={{
                      fontSize: 18,
                      fontFamily: '"JetBrains Mono", monospace',
                      color: '#556D77',
                      flexShrink: 0,
                    }}
                  >
                    {openFaq === idx ? '−' : '+'}
                  </span>
                </button>

                {openFaq === idx ? (
                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.65,
                      color: '#556872',
                      marginTop: 14,
                      marginBottom: 0,
                    }}
                  >
                    {faq.answer}
                  </p>
                ) : (
                  /* Preview snippet like in screenshot */
                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: '#6F818A',
                      marginTop: 10,
                      marginBottom: 0,
                    }}
                  >
                    {faq.answer}
                  </p>
                )}
              </div>
            ))}
            <div style={{ borderTop: '1px solid #D6D0C4' }} />
          </div>
        </div>
      </section>

      {/* ================= SECTION 08: BRING US THE LAUNDRY. (DEEP SLATE) ================= */}
      <section
        style={{
          background: '#1E3640',
          color: '#FFFFFF',
          padding: '80px 24px 90px',
        }}
      >
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: '#8CA5AF',
              textTransform: 'uppercase',
              marginBottom: 20,
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            08 / WE’RE JUST AROUND THE CORNER
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 28,
              marginBottom: 60,
            }}
          >
            <h2
              style={{
                fontSize: 'clamp(36px, 4.6vw, 56px)',
                lineHeight: 1.08,
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.03em',
                margin: 0,
              }}
            >
              Bring us the laundry.
              <br />
              Keep the rest of your day.
            </h2>

            <Link
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                fontSize: 13,
                fontWeight: 600,
                color: '#1C323D',
                background: '#FFFFFF',
                borderRadius: 2,
                textDecoration: 'none',
                letterSpacing: '0.01em',
              }}
            >
              Get directions ↗
            </Link>
          </div>

          {/* 3 Detail Columns */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 48,
              alignItems: 'flex-start',
            }}
          >
            {/* Col 1: Address & Details */}
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 12 }}>
                GoWashGo Laundry Hub
              </h3>
              <p style={{ fontSize: 14, color: '#B3C3CB', lineHeight: 1.6, margin: '0 0 16px 0' }}>
                18 Katipunan Avenue, Loyola Heights
                <br />
                Quezon City, Metro Manila
              </p>
              <p
                style={{
                  fontFamily: '"Newsreader", Georgia, serif',
                  fontStyle: 'italic',
                  fontSize: 15,
                  color: '#D4E2E8',
                  margin: '0 0 20px 0',
                }}
              >
                Look for the blue sign and the bench outside.
              </p>
              <p style={{ fontSize: 13, color: '#B3C3CB', margin: '0 0 6px 0' }}>
                0917 888 9274
              </p>
              <p style={{ fontSize: 13, color: '#B3C3CB', margin: 0 }}>
                hello@gowashgo.ph
              </p>
            </div>

            {/* Col 2: Counter Hours */}
            <div>
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  fontFamily: '"JetBrains Mono", monospace',
                  color: '#8CA5AF',
                  textTransform: 'uppercase',
                  marginBottom: 16,
                }}
              >
                COUNTER HOURS
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#FFFFFF', marginBottom: 10 }}>
                <span>Monday–Friday</span>
                <span style={{ color: '#B3C3CB' }}>8am–7pm</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#FFFFFF', marginBottom: 10 }}>
                <span>Saturday</span>
                <span style={{ color: '#B3C3CB' }}>9am–6pm</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#FFFFFF', marginBottom: 20 }}>
                <span>Sunday</span>
                <span style={{ color: '#B3C3CB' }}>10am–4pm</span>
              </div>

              <p style={{ fontSize: 12, color: '#8CA5AF', lineHeight: 1.5, margin: 0 }}>
                Drop off any time we’re open. For urgent loads, please call ahead.
              </p>
            </div>

            {/* Col 3: Architectural Map Card */}
            <div>
              <div
                style={{
                  background: '#E2ECE9',
                  borderRadius: 2,
                  padding: '24px 20px',
                  color: '#1C323D',
                  position: 'relative',
                  minHeight: 180,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '1px solid #C4D3CF',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ textAlign: 'center', width: '100%' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1C323D', display: 'block', marginBottom: 6 }}>
                      We’re here.
                    </span>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: '#1C323D',
                        margin: '0 auto',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 14,
                          left: 6,
                          width: 2,
                          height: 14,
                          background: '#1C323D',
                        }}
                      />
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 10,
                      color: '#557270',
                      letterSpacing: '0.05em',
                      position: 'absolute',
                      right: 16,
                      top: 16,
                    }}
                  >
                    N ↑
                  </span>
                </div>

                {/* Road graphic lines */}
                <div style={{ margin: '30px 0 10px', position: 'relative' }}>
                  <div style={{ height: 20, background: '#FFFFFF', opacity: 0.8, borderRadius: 2 }} />
                  <span
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 9,
                      color: '#557270',
                      letterSpacing: '0.04em',
                      marginTop: 4,
                      display: 'block',
                    }}
                  >
                    KATIPUNAN AVE
                  </span>
                </div>
              </div>

              <p
                style={{
                  fontSize: 10,
                  fontFamily: '"JetBrains Mono", monospace',
                  color: '#8CA5AF',
                  letterSpacing: '0.06em',
                  marginTop: 10,
                  textTransform: 'uppercase',
                }}
              >
                A LITTLE LOCAL GUIDE · METRO MANILA HUBS
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER / WORDMARK SECTION ================= */}
      <footer
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '60px 24px 40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: 24,
            marginBottom: 36,
          }}
        >
          {/* Giant Wordmark */}
          <span
            style={{
              fontSize: 'clamp(52px, 8.5vw, 108px)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              color: '#1C323D',
              lineHeight: 0.9,
              fontFamily: 'inherit',
            }}
          >
            gowashgo
          </span>

          {/* Editorial Italic Accent */}
          <span
            style={{
              fontFamily: '"Newsreader", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 'clamp(20px, 2.4vw, 28px)',
              color: '#345260',
              lineHeight: 1.2,
            }}
          >
            Fresh clothes. A lighter week.
          </span>
        </div>

        {/* Hairline Divider & Links */}
        <div
          style={{
            borderTop: '1px solid #E6E2D8',
            paddingTop: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            fontSize: 12,
            color: '#6F818A',
          }}
        >
          <span>© {new Date().getFullYear()} GoWashGo Philippines · Smart Doorstep Laundry</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a href="#services" style={{ textDecoration: 'none', color: '#4B6261' }}>
              Laundry care guide
            </a>
            <span>/</span>
            <Link href="/login" style={{ textDecoration: 'none', color: '#4B6261' }}>
              Sign In
            </Link>
            <span>/</span>
            <button
              type="button"
              onClick={scrollToTop}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                color: '#4B6261',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Back to the top ↑
            </button>
          </div>
        </div>
      </footer>

      {/* Interactive AI Laundry Concierge Floating Widget */}
      <LaundryChathead />
    </div>
  );
}
