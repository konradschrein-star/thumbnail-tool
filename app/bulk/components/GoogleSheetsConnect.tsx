'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface GoogleSheetsConnectProps {
  isConnected: boolean;
  onConnected: () => void;
}

export function GoogleSheetsConnect({ isConnected, onConnected }: GoogleSheetsConnectProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<{
    sheetId?: string;
    sheetName?: string;
    lastSync?: string;
  } | null>(null);

  useEffect(() => {
    // Check if already connected
    if (isConnected) {
      checkConnection();
    }
  }, [isConnected]);

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/sheets/preview');
      if (response.ok) {
        const data = await response.json();
        setConnectionInfo({
          sheetId: data.sheetId,
          sheetName: data.sheetName,
          lastSync: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Failed to check connection:', err);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sheets/connect');
      if (!response.ok) {
        throw new Error('Failed to initiate connection');
      }

      const data = await response.json();
      // Redirect to Google OAuth
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (err: any) {
      setError(err.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sheets/disconnect', { method: 'POST' });
      if (response.ok) {
        setConnectionInfo(null);
        // Optionally refresh or update parent state
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (err: any) {
      setError(err.message || 'Disconnection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Google Sheets Connection</h2>
          <p className="card-description">Connect your Google Sheets to bulk generate thumbnails</p>
        </div>
        {isConnected && (
          <div className="status-badge success">
            <CheckCircle className="w-5 h-5" />
          </div>
        )}
      </div>

      {error && (
        <div className="alert error">
          <AlertCircle className="icon" />
          <p>{error}</p>
        </div>
      )}

      {isConnected && connectionInfo ? (
        <div className="connected-content">
          <div className="info-grid">
            <div className="info-item">
              <p className="info-label">Sheet ID</p>
              <p className="info-value mono">
                {connectionInfo.sheetId || 'Loading...'}
              </p>
            </div>
            <div className="info-item">
              <p className="info-label">Sheet Name</p>
              <p className="info-value">{connectionInfo.sheetName || 'Loading...'}</p>
            </div>
          </div>

          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="button danger"
          >
            {loading ? (
              <span className="button-content">
                <Loader className="icon-spin" />
                Disconnecting...
              </span>
            ) : (
              'Disconnect Google Sheets'
            )}
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={loading}
          className="button primary"
        >
          {loading ? (
            <span className="button-content">
              <Loader className="icon-spin" />
              Connecting...
            </span>
          ) : (
            <span className="button-content">
              <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
              </svg>
              Connect Google Sheets
            </span>
          )}
        </button>
      )}

      <style jsx>{`
        .card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 2rem;
        }

        .card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }

        .card-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 0.5rem 0;
          font-family: var(--font-outfit);
        }

        .card-description {
          font-size: 0.9375rem;
          color: #a1a1aa;
          margin: 0;
        }

        .status-badge {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .status-badge.success {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .alert {
          display: flex;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
        }

        .alert.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
        }

        .alert .icon {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          margin-top: 2px;
          color: #f87171;
        }

        .alert p {
          margin: 0;
          font-size: 0.9375rem;
          line-height: 1.5;
        }

        .connected-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1.25rem;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .info-label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }

        .info-value {
          font-size: 0.9375rem;
          color: #ffffff;
          margin: 0;
          word-break: break-all;
        }

        .info-value.mono {
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 0.875rem;
        }

        .button {
          width: 100%;
          padding: 1rem 1.5rem;
          border: none;
          border-radius: 12px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .button.primary {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: #ffffff;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .button.primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
        }

        .button.danger {
          background: rgba(239, 68, 68, 0.1);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .button.danger:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.3);
          color: #ffffff;
        }

        .button-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
        }

        .icon {
          width: 20px;
          height: 20px;
        }

        .icon-spin {
          width: 18px;
          height: 18px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
