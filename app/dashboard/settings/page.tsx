'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '../components/layout/DashboardLayout';

// Force dynamic rendering to avoid useSearchParams SSR issues
export const dynamic = 'force-dynamic';

interface Preferences {
  preferredResolution?: '512' | '1K' | '2K';
  stableMode?: boolean;
  customLanguages?: any[];
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [preferences, setPreferences] = useState<Preferences>({
    preferredResolution: '1K',
    stableMode: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/user/preferences');
      if (!response.ok) throw new Error('Failed to fetch preferences');
      const data = await response.json();
      setPreferences(data.preferences || { preferredResolution: '1K', stableMode: true });
    } catch (error) {
      console.error('Error fetching preferences:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleResolutionChange = async (resolution: '512' | '1K' | '2K') => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...preferences,
          preferredResolution: resolution
        })
      });

      if (!response.ok) throw new Error('Failed to update preferences');

      const data = await response.json();
      setPreferences(data.preferences);
      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (error) {
      console.error('Error updating preferences:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleStableModeToggle = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...preferences,
          stableMode: !preferences.stableMode
        })
      });

      if (!response.ok) throw new Error('Failed to update preferences');

      const data = await response.json();
      setPreferences(data.preferences);
      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (error) {
      console.error('Error updating preferences:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="settings-container">
          <div className="loading">Loading settings...</div>
        </div>
      </DashboardLayout>
    );
  }

  const currentResolution = preferences.preferredResolution || '1K';
  const stableMode = preferences.stableMode || false;

  // Calculate credit costs based on resolution and stable mode
  const getCreditRange = (resolution: '512' | '1K' | '2K') => {
    const base = resolution === '512' ? 1 : resolution === '1K' ? 2 : 3;
    const max = base * 3; // With archetype + persona + logo
    const multiplier = stableMode ? 2 : 1;
    return {
      min: base * multiplier,
      max: max * multiplier
    };
  };

  return (
    <DashboardLayout>
      <div className="settings-container">
        <div className="settings-header">
          <h1 className="settings-title">Settings</h1>
          <p className="settings-subtitle">Manage your generation preferences</p>
        </div>

        {message && (
          <div className={`message message-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Stable Mode Toggle */}
        <div className="settings-section">
          <div className="section-header">
            <h2 className="section-title">Generation Mode</h2>
            <p className="section-description">
              Choose between AI33 (fast, cheaper) or Google Gemini (stable, reliable)
            </p>
          </div>

          <div className="toggle-container">
            <button
              className={`toggle-button ${stableMode ? 'active' : ''}`}
              onClick={handleStableModeToggle}
              disabled={saving}
            >
              <div className="toggle-track">
                <div className={`toggle-thumb ${stableMode ? 'active' : ''}`} />
              </div>
              <div className="toggle-labels">
                <div className="toggle-label-main">
                  <span className="toggle-icon">{stableMode ? '🔒' : '⚡'}</span>
                  <span className="toggle-title">
                    {stableMode ? 'Stable Mode (Google Gemini)' : 'Fast Mode (AI33)'}
                  </span>
                  {stableMode && <span className="badge-active">Active</span>}
                </div>
                <p className="toggle-description">
                  {stableMode
                    ? 'Uses Google Gemini directly for maximum reliability (2x cost)'
                    : 'Tries AI33 first with 2-min timeout, falls back to Google Gemini (standard cost)'
                  }
                </p>
              </div>
            </button>
          </div>

          <div className="info-box">
            <svg className="info-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="info-title">When to use Stable Mode:</p>
              <ul className="info-list">
                <li>When AI33 is experiencing downtime or slow performance</li>
                <li>When you need guaranteed fast generation (no waiting for timeouts)</li>
                <li>When maximum reliability is more important than cost</li>
                <li>Cost: 2x normal credits, but uses your $200 Google credit balance</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Resolution Settings */}
        <div className="settings-section">
          <div className="section-header">
            <h2 className="section-title">Image Resolution</h2>
            <p className="section-description">
              Choose resolution quality for generated thumbnails
            </p>
          </div>

          <div className="resolution-options">
            <button
              className={`resolution-option ${currentResolution === '512' ? 'active' : ''}`}
              onClick={() => handleResolutionChange('512')}
              disabled={saving}
            >
              <div className="option-header">
                <span className="option-title">512 Resolution</span>
                {currentResolution === '512' && (
                  <span className="badge-active">Active</span>
                )}
              </div>
              <div className="option-details">
                <p className="option-description">Basic quality (512x512)</p>
                <div className="option-cost">
                  <span className="cost-label">Cost:</span>
                  <span className="cost-value">
                    {getCreditRange('512').min}-{getCreditRange('512').max} credits
                  </span>
                  {stableMode && <span className="cost-multiplier">(stable: 2x)</span>}
                </div>
              </div>
            </button>

            <button
              className={`resolution-option ${currentResolution === '1K' ? 'active' : ''}`}
              onClick={() => handleResolutionChange('1K')}
              disabled={saving}
            >
              <div className="option-header">
                <span className="option-title">1K Resolution</span>
                {currentResolution === '1K' && (
                  <span className="badge-active">Active</span>
                )}
              </div>
              <div className="option-details">
                <p className="option-description">Standard quality (1280x720)</p>
                <div className="option-cost">
                  <span className="cost-label">Cost:</span>
                  <span className="cost-value">
                    {getCreditRange('1K').min}-{getCreditRange('1K').max} credits
                  </span>
                  {stableMode && <span className="cost-multiplier">(stable: 2x)</span>}
                </div>
              </div>
            </button>

            <button
              className={`resolution-option ${currentResolution === '2K' ? 'active' : ''}`}
              onClick={() => handleResolutionChange('2K')}
              disabled={saving}
            >
              <div className="option-header">
                <span className="option-title">2K Resolution</span>
                {currentResolution === '2K' && (
                  <span className="badge-active">Active</span>
                )}
              </div>
              <div className="option-details">
                <p className="option-description">High quality (2560x1440)</p>
                <div className="option-cost">
                  <span className="cost-label">Cost:</span>
                  <span className="cost-value">
                    {getCreditRange('2K').min}-{getCreditRange('2K').max} credits
                  </span>
                  {stableMode && <span className="cost-multiplier">(stable: 2x)</span>}
                </div>
              </div>
            </button>
          </div>

          <div className="info-box">
            <svg className="info-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="info-title">Credit cost breakdown:</p>
              <ul className="info-list">
                <li>512: 1 credit base (2 in stable mode)</li>
                <li>1K: 2 credits base (4 in stable mode)</li>
                <li>2K: 3 credits base (6 in stable mode)</li>
                <li>+1/2/3 credits per reference image (archetype/persona/logo)</li>
                <li>Example: 2K with 3 refs in stable mode = 6 base + 9 refs = 15 credits</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .settings-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem;
        }

        .loading {
          text-align: center;
          color: #a1a1aa;
          padding: 3rem;
        }

        .settings-header {
          margin-bottom: 2.5rem;
        }

        .settings-title {
          font-size: 2rem;
          font-weight: 700;
          color: #fafafa;
          margin-bottom: 0.5rem;
        }

        .settings-subtitle {
          color: #a1a1aa;
          font-size: 1rem;
        }

        .message {
          padding: 1rem 1.25rem;
          border-radius: 0.5rem;
          margin-bottom: 2rem;
          font-size: 0.95rem;
        }

        .message-success {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #22c55e;
        }

        .message-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .settings-section {
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 0.75rem;
          padding: 2rem;
        }

        .section-header {
          margin-bottom: 1.5rem;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #fafafa;
          margin-bottom: 0.5rem;
        }

        .section-description {
          color: #a1a1aa;
          font-size: 0.95rem;
        }

        .toggle-container {
          margin-bottom: 1.5rem;
        }

        .toggle-button {
          background: #09090b;
          border: 2px solid #27272a;
          border-radius: 0.75rem;
          padding: 1.5rem;
          width: 100%;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .toggle-button:hover {
          border-color: #3b82f6;
          background: #0c0c0f;
        }

        .toggle-button.active {
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.05);
        }

        .toggle-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .toggle-track {
          width: 60px;
          height: 32px;
          background: #27272a;
          border-radius: 16px;
          position: relative;
          transition: all 0.3s;
          flex-shrink: 0;
        }

        .toggle-button.active .toggle-track {
          background: #3b82f6;
        }

        .toggle-thumb {
          width: 24px;
          height: 24px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 4px;
          left: 4px;
          transition: all 0.3s;
        }

        .toggle-thumb.active {
          transform: translateX(28px);
        }

        .toggle-labels {
          flex: 1;
          text-align: left;
        }

        .toggle-label-main {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .toggle-icon {
          font-size: 1.25rem;
        }

        .toggle-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #fafafa;
        }

        .toggle-description {
          color: #a1a1aa;
          font-size: 0.9rem;
          margin: 0;
        }

        .resolution-options {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .resolution-option {
          background: #09090b;
          border: 2px solid #27272a;
          border-radius: 0.5rem;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .resolution-option:hover {
          border-color: #3b82f6;
          background: #0c0c0f;
        }

        .resolution-option.active {
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.05);
        }

        .resolution-option:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .option-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }

        .option-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #fafafa;
        }

        .badge-active {
          background: #3b82f6;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .option-details {
          color: #a1a1aa;
        }

        .option-description {
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }

        .option-cost {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }

        .cost-label {
          color: #71717a;
        }

        .cost-value {
          color: #fafafa;
          font-weight: 500;
        }

        .cost-multiplier {
          color: #f59e0b;
          font-size: 0.85rem;
        }

        .info-box {
          display: flex;
          gap: 1rem;
          background: rgba(59, 130, 246, 0.05);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 0.5rem;
          padding: 1rem 1.25rem;
        }

        .info-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: #3b82f6;
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .info-title {
          color: #fafafa;
          font-weight: 500;
          margin-bottom: 0.5rem;
          font-size: 0.95rem;
        }

        .info-list {
          color: #a1a1aa;
          font-size: 0.9rem;
          margin: 0;
          padding-left: 1.25rem;
        }

        .info-list li {
          margin-bottom: 0.25rem;
        }

        @media (max-width: 968px) {
          .resolution-options {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .resolution-options {
            grid-template-columns: 1fr;
          }

          .settings-container {
            padding: 1rem;
          }

          .toggle-button {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
