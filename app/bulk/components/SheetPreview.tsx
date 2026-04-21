'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, ChevronDown, Loader, Play, RefreshCw } from 'lucide-react';

interface SheetPreviewProps {
  onBatchCreated: (batchId: string) => void;
}

interface SheetData {
  rows: Array<{
    channelId: string;
    archetypeId: string;
    videoTopic: string;
    thumbnailText: string;
  }>;
  totalRows: number;
}

export function SheetPreview({ onBatchCreated }: SheetPreviewProps) {
  const [preview, setPreview] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchPreview = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sheets/preview');
      if (!response.ok) {
        throw new Error('Failed to load preview');
      }

      const data = await response.json();
      setPreview(data);
      setIsExpanded(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch('/api/sheets/sync', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to sync sheet');
      }

      const data = await response.json();
      if (data.batchId) {
        onBatchCreated(data.batchId);
      }
    } catch (err: any) {
      setError(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="card">
      <button
        onClick={() => {
          if (!isExpanded) {
            fetchPreview();
          } else {
            setIsExpanded(false);
          }
        }}
        className="expand-button"
      >
        <div className="expand-header">
          <h3 className="card-title-sm">Sheet Preview</h3>
          {preview && (
            <span className="badge">
              {preview.totalRows} rows
            </span>
          )}
        </div>
        <ChevronDown className={`chevron ${isExpanded ? 'expanded' : ''}`} />
      </button>

      {isExpanded && (
        <div className="card-content">
          {error && (
            <div className="alert error">
              <AlertCircle className="icon" />
              <p>{error}</p>
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <Loader className="spinner" />
            </div>
          ) : preview ? (
            <>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Channel</th>
                      <th>Archetype</th>
                      <th>Topic</th>
                      <th>Text</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 5).map((row, idx) => (
                      <tr key={idx}>
                        <td className="mono">{row.channelId.substring(0, 8)}...</td>
                        <td className="mono">{row.archetypeId.substring(0, 8)}...</td>
                        <td className="truncate">{row.videoTopic}</td>
                        <td className="truncate">{row.thumbnailText}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {preview.totalRows > 5 && (
                <p className="info-text">
                  Showing 5 of {preview.totalRows} rows
                </p>
              )}

              <div className="action-buttons">
                <button onClick={fetchPreview} className="button secondary">
                  <RefreshCw size={16} />
                  Refresh
                </button>
                <button onClick={handleSync} disabled={syncing} className="button success">
                  {syncing ? (
                    <>
                      <Loader className="icon-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      Start Generation
                    </>
                  )}
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}

      <style jsx>{`
        .card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          overflow: hidden;
        }

        .expand-button {
          width: 100%;
          padding: 1.5rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .expand-button:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .expand-header {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .card-title-sm {
          font-size: 1.25rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          font-family: var(--font-outfit);
        }

        .badge {
          padding: 0.375rem 0.875rem;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .chevron {
          width: 20px;
          height: 20px;
          color: #71717a;
          transition: transform 0.3s ease;
        }

        .chevron.expanded {
          transform: rotate(180deg);
        }

        .card-content {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding: 1.5rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .alert {
          display: flex;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-radius: 12px;
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

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
        }

        .spinner {
          width: 32px;
          height: 32px;
          color: #60a5fa;
          animation: spin 1s linear infinite;
        }

        .table-container {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .data-table {
          width: 100%;
          font-size: 0.875rem;
          border-collapse: collapse;
        }

        .data-table thead {
          background: rgba(255, 255, 255, 0.03);
        }

        .data-table th {
          padding: 0.875rem 1rem;
          text-align: left;
          color: #a1a1aa;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }

        .data-table tbody tr {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .data-table tbody tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .data-table td {
          padding: 0.875rem 1rem;
          color: #d4d4d8;
        }

        .data-table td.mono {
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 0.8125rem;
          color: #a1a1aa;
        }

        .data-table td.truncate {
          max-width: 250px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .info-text {
          font-size: 0.875rem;
          color: #71717a;
          margin: 0;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          padding-top: 0.5rem;
        }

        .button {
          flex: 1;
          padding: 0.875rem 1.25rem;
          border: none;
          border-radius: 12px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.625rem;
        }

        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .button.secondary {
          background: rgba(255, 255, 255, 0.05);
          color: #d4d4d8;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .button.secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
        }

        .button.success {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          color: #ffffff;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .button.success:hover:not(:disabled) {
          background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(34, 197, 94, 0.3);
        }

        .icon-spin {
          width: 16px;
          height: 16px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
