'use client';

import { useState, useEffect } from 'react';
import { Layers, CheckCircle, Loader2, Eye } from 'lucide-react';

interface BatchJob {
  id: string;
  name: string;
  status: string;
  totalJobs: number;
  completedJobs: number;
  createdAt: string;
}

interface BatchSelectorProps {
  onSelectBatch: (batchId: string, batchName: string, thumbnailCount: number) => void;
}

export function BatchSelector({ onSelectBatch }: BatchSelectorProps) {
  const [batches, setBatches] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/batch/list?status=COMPLETED&limit=50');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch batches');
      }

      // Only show batches with completed thumbnails
      const batchesWithCompletedJobs = (data.batches || []).filter(
        (batch: BatchJob) => batch.completedJobs > 0
      );

      setBatches(batchesWithCompletedJobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBatch = (batch: BatchJob) => {
    setSelectedBatchId(batch.id);
    onSelectBatch(batch.id, batch.name, batch.completedJobs);
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="loading-state">
        <Loader2 size={32} className="spinner" />
        <p>Loading completed batches...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <p className="error-text">{error}</p>
        <button onClick={fetchBatches} className="btn-retry">
          Try Again
        </button>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="empty-state">
        <Layers size={48} className="empty-icon" />
        <h3 className="empty-title">No Completed Batches</h3>
        <p className="empty-text">
          You don't have any completed batch jobs yet. Create a batch using the Batch Generation page first.
        </p>
      </div>
    );
  }

  return (
    <div className="batch-selector">
      <div className="selector-header">
        <h3 className="selector-title">Select a Batch to Translate</h3>
        <p className="selector-subtitle">
          Choose from {batches.length} completed batch{batches.length !== 1 ? 'es' : ''} with {batches.reduce((sum, b) => sum + b.completedJobs, 0)} total thumbnails
        </p>
      </div>

      <div className="batches-grid">
        {batches.map((batch) => (
          <button
            key={batch.id}
            onClick={() => handleSelectBatch(batch)}
            className={`batch-card ${selectedBatchId === batch.id ? 'selected' : ''}`}
          >
            {selectedBatchId === batch.id && (
              <div className="selected-indicator">
                <CheckCircle size={20} />
              </div>
            )}

            <div className="batch-icon">
              <Layers size={24} />
            </div>

            <div className="batch-info">
              <h4 className="batch-name">{batch.name}</h4>
              <div className="batch-meta">
                <span className="thumbnail-count">
                  {batch.completedJobs} thumbnail{batch.completedJobs !== 1 ? 's' : ''}
                </span>
                <span className="batch-date">{getRelativeTime(batch.createdAt)}</span>
              </div>
            </div>

            <div className="batch-status">
              <span className="status-badge completed">
                <CheckCircle size={12} />
                Completed
              </span>
            </div>
          </button>
        ))}
      </div>

      {selectedBatchId && (
        <div className="selection-hint">
          <Eye size={16} />
          <span>Batch selected. Choose target languages below to continue.</span>
        </div>
      )}

      <style jsx>{`
        .batch-selector {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 2rem;
        }

        .selector-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .selector-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 0.5rem 0;
          font-family: var(--font-outfit);
        }

        .selector-subtitle {
          font-size: 0.95rem;
          color: #a1a1aa;
          margin: 0;
        }

        .loading-state,
        .error-state,
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
        }

        .spinner {
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
          color: #60a5fa;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .loading-state p,
        .error-text {
          color: #a1a1aa;
          margin: 0;
        }

        .error-text {
          color: #fca5a5;
          margin-bottom: 1rem;
        }

        .btn-retry {
          padding: 0.75rem 1.5rem;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-retry:hover {
          background: rgba(239, 68, 68, 0.25);
        }

        .empty-icon {
          color: #52525b;
          margin: 0 auto 1.5rem;
        }

        .empty-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 0.75rem 0;
        }

        .empty-text {
          font-size: 0.95rem;
          color: #71717a;
          margin: 0;
          max-width: 400px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .batches-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .batch-card {
          position: relative;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .batch-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        .batch-card.selected {
          background: rgba(59, 130, 246, 0.1);
          border-color: #3b82f6;
        }

        .selected-indicator {
          position: absolute;
          top: 1rem;
          right: 1rem;
          color: #3b82f6;
        }

        .batch-icon {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #60a5fa;
        }

        .batch-info {
          flex: 1;
        }

        .batch-name {
          font-size: 1.125rem;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 0.5rem 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .batch-meta {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .thumbnail-count {
          font-size: 0.875rem;
          font-weight: 500;
          color: #a1a1aa;
        }

        .batch-date {
          font-size: 0.8rem;
          color: #71717a;
        }

        .batch-status {
          display: flex;
          justify-content: flex-start;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-badge.completed {
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
        }

        .selection-hint {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 8px;
          color: #60a5fa;
          font-size: 0.9rem;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .batch-selector {
            padding: 1.5rem;
          }

          .batches-grid {
            grid-template-columns: 1fr;
          }

          .selector-title {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}
