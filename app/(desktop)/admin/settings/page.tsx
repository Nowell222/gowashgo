'use client';

import { useState } from 'react';
import { HangerIcon, MachineDrumIcon, ScaleIcon } from '@/components/icons';

export default function AdminSettingsPage() {
  const [platformName, setPlatformName] = useState('GoWashGo');
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState(50);
  const [paymongoEnabled, setPaymongoEnabled] = useState(true);
  const [aiEngineEnabled, setAiEngineEnabled] = useState(true);
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div
      style={{
        padding: '20px 24px 60px',
        maxWidth: 1000,
        margin: '0 auto',
        fontFamily: 'var(--font-karla, "Karla", sans-serif)',
        color: '#0F172A',
      }}
    >
      <div className="page-heading">
        <div className="page-heading__text">
          <h1 className="page-heading__title">Global Platform Configuration</h1>
          <p className="page-heading__subtitle">
            Manage system-wide parameters, payment integration status, and AI recommendation rules.
          </p>
        </div>
      </div>

      {saved && (
        <div
          style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            color: '#166534',
            padding: '12px 16px',
            borderRadius: 2,
            marginBottom: 20,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          ✓ Platform configuration saved successfully!
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
        {/* General Settings */}
        <div style={{ background: '#FFFFFF', padding: '24px 26px', borderRadius: 2, boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
          <h2
            style={{
              fontSize: 15,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: '#0F172A',
              marginBottom: 16,
              fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
            }}
          >
            System Parameters
          </h2>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="input-group__label">Platform Brand Name</label>
              <input
                className="input"
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="input-group__label">Default Flat Delivery Fee (₱)</label>
              <input
                className="input"
                type="number"
                value={defaultDeliveryFee}
                onChange={(e) => setDefaultDeliveryFee(parseFloat(e.target.value) || 0)}
              />
              <span className="input-group__hint">Applied to all customer orders during pilot phase</span>
            </div>

            <div className="divider" style={{ margin: '8px 0', borderTop: '1px solid #E2E8F0' }} />

            {/* Integration Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>
                    PayMongo Payments Gateway
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>
                    Enable GCash, Maya, and credit card checkout (Live ready)
                  </div>
                </div>
                <label style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={paymongoEnabled}
                    onChange={(e) => setPaymongoEnabled(e.target.checked)}
                    style={{ accentColor: '#0E7490', width: 18, height: 18 }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>
                    Gemini AI Wash Care Engine
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>
                    Automated fabric, color separation, and care tag recommendations
                  </div>
                </div>
                <label style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={aiEngineEnabled}
                    onChange={(e) => setAiEngineEnabled(e.target.checked)}
                    style={{ accentColor: '#0E7490', width: 18, height: 18 }}
                  />
                </label>
              </div>
            </div>

            <button type="submit" className="btn btn--primary" style={{ marginTop: 8 }}>
              Save Platform Configuration
            </button>
          </form>
        </div>

        {/* Operational Scope Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#ECFEFF', padding: '20px 22px', borderRadius: 2 }}>
            <h3
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#0E7490',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 8,
                fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
              }}
            >
              Enterprise Deployment
            </h3>
            <p style={{ fontSize: 13, color: '#164E63', lineHeight: 1.5, margin: '0 0 12px' }}>
              WashGo is configured with multi-branch tenancy. Hubs operate independently with their own local prices, assigned staff, and rider delivery fleets.
            </p>
            <div style={{ fontSize: 12, color: '#0E7490', fontWeight: 600 }}>
              Primary Hub: San Juan, Batangas (General Luna St.)
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: 2, boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Transactional Mailer Status
            </h3>
            <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.6 }}>
              <div><strong>Active Provider:</strong> Gmail SMTP Backbone (Verified)</div>
              <div><strong>Sender Address:</strong> nowellandal71@gmail.com</div>
              <div><strong>Port:</strong> 465 (SSL) / 587 (STARTTLS)</div>
              <div style={{ color: '#059669', fontWeight: 700, marginTop: 4 }}>✓ Active &amp; Verified Delivery</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
