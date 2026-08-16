'use client';

import { useState } from 'react';

export default function AdminSettingsPage() {
  const [platformName, setPlatformName] = useState('WashGo');
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
    <div className="desktop-content fade-in">
      <div className="page-heading">
        <div className="page-heading__text">
          <h1 className="page-heading__title">Global Platform Configuration</h1>
          <p className="page-heading__subtitle">
            Manage system-wide parameters, payment integration status, and AI recommendation rules.
          </p>
        </div>
      </div>

      {saved && (
        <div className="toast toast--success" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="toast__message">Platform settings saved successfully!</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: 640 }}>
        {/* General Settings */}
        <div className="card">
          <h2 className="card__title" style={{ marginBottom: 'var(--space-4)' }}>
            ⚙️ System Parameters
          </h2>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="input-group">
              <label className="input-group__label">Platform Name</label>
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

            <div className="divider" style={{ margin: '8px 0' }} />

            {/* Integration Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>PayMongo Payments Gateway</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    Enable GCash, Maya, and credit card processing (Live/Sandbox ready)
                  </div>
                </div>
                <label style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={paymongoEnabled}
                    onChange={(e) => setPaymongoEnabled(e.target.checked)}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>AI Smart Wash Care Engine</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    Provide automated fabric/color wash cycle suggestions
                  </div>
                </div>
                <label style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={aiEngineEnabled}
                    onChange={(e) => setAiEngineEnabled(e.target.checked)}
                  />
                </label>
              </div>
            </div>

            <button type="submit" className="btn btn--primary" style={{ marginTop: 8 }}>
              Save Platform Configuration
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
