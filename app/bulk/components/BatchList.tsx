'use client';

import { useState, useEffect } from 'react';
import { Eye, Download, RefreshCw, Search, Filter } from 'lucide-react';

interface BatchJob {
  id: string;
  name: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  createdAt: string;
}

interface BatchListProps {
  onSelectBatch: (batchId: string) => void;
}

export function BatchList({ onSelectBatch }: BatchListProps) {
  const [batches, setBatches] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const ITEMS_PER_PAGE = 20;

  const fetchBatches = async () => {
    try {
      setError(null);

      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        offset: (page * ITEMS_PER_PAGE).toString(),
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/batch/list?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch batches');
      }

      setBatches(data.batches || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [page, statusFilter]);

  // Auto-refresh every 10 seconds if any batch is processing
  useEffect(() => {
    const hasProcessing = batches.some(
      (batch) => batch.status === 'PROCESSING' || batch.status === 'PENDING'
    );

    if (!hasProcessing) return;

    const interval = setInterval(() => {
      fetchBatches();
    }, 10000);

    return () => clearInterval(interval);
  }, [batches]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'status-pending',
      PROCESSING: 'status-processing',
      COMPLETED: 'status-completed',
      FAILED: 'status-failed',
      PARTIAL: 'status-partial',
    };

    return styles[status] || 'status-pending';
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleDownloadZip = async (batchId: string, batchName: string) => {
    try {
      const response = await fetch(`/api/batch/${batchId}/download`);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${batchName.replace(/[^a-z0-9]/gi, '_')}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to download ZIP file');
    }
  };

  // Client-side search filter
  const filteredBatches = batches.filter((batch) =>
    batch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  if (loading && batches.length === 0) {
    return (
      <div className="loading-state">
        <RefreshCw size={32} className="spinner" />
        <p>Loading batches...</p>
      </div>
    );
  }

  return (
    <div className="batch-list">
      {/* Header */}
      <div className="list-header">
        <h2 className="list-title">All Batches</h2>
        <button onClick={fetchBatches} className="btn-refresh" title="Refresh">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search batches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-box">
          <Filter size={18} className="filter-icon" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="filter-select"
          >
            <option value="all">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="PARTIAL">Partial</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchBatches} className="btn-retry">
            Retry
          </button>
        </div>
      )}

      {/* Batch Table */}
      {filteredBatches.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No batches found</p>
          <p className="empty-text">
            {searchQuery
              ? 'Try adjusting your search query'
              : statusFilter !== 'all'
              ? 'No batches match the selected status'
              : 'Create your first batch using Google Sheets or Manual Upload'}
          </p>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="batch-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((batch) => (
                  <tr key={batch.id} className="batch-row">
                    <td className="col-name">
                      <div className="batch-name">{batch.name}</div>
                      <div className="batch-count">
                        {batch.totalJobs} job{batch.totalJobs !== 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="col-status">
                      <span className={`status-badge ${getStatusBadge(batch.status)}`}>
                        {batch.status}
                      </span>
                    </td>
                    <td className="col-progress">
                      <div className="progress-bar-container">
                        <div
                          className="progress-bar"
                          style={{
                            width: `${(batch.completedJobs / batch.totalJobs) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="progress-text">
                        {batch.completedJobs}/{batch.totalJobs}
                        {batch.failedJobs > 0 && (
                          <span className="failed-count"> ({batch.failedJobs} failed)</span>
                        )}
                      </div>
                    </td>
                    <td className="col-created">{getRelativeTime(batch.createdAt)}</td>
                    <td className="col-actions">
                      <div className="action-buttons">
                        <button
                          onClick={() => onSelectBatch(batch.id)}
                          className="btn-action btn-view"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {batch.status === 'COMPLETED' && (
                          <button
                            onClick={() => handleDownloadZip(batch.id, batch.name)}
                            className="btn-action btn-download"
                            title="Download ZIP"
                          >
                            <Download size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-page"
              >
                Previous
              </button>
              <span className="page-info">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="btn-page"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .batch-list {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 2rem;
        }

        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .list-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          font-family: var(--font-outfit);
        }

        .btn-refresh {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #a1a1aa;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-refresh:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }

        .filters {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .search-box,
        .filter-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 0.625rem 1rem;
        }

        .search-box {
          flex: 1;
        }

        .search-icon,
        .filter-icon {
          color: #71717a;
          flex-shrink: 0;
        }

        .search-input {
          flex: 1;
          background: none;
          border: none;
          color: #ffffff;
          font-size: 0.9rem;
          outline: none;
        }

        .search-input::placeholder {
          color: #52525b;
        }

        .filter-select {
          background: none;
          border: none;
          color: #ffffff;
          font-size: 0.9rem;
          outline: none;
          cursor: pointer;
        }

        .filter-select option {
          background: #18181b;
          color: #ffffff;
        }

        .loading-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #71717a;
        }

        .spinner {
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .error-message {
          padding: 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          color: #fca5a5;
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .btn-retry {
          padding: 0.5rem 1rem;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 6px;
          color: #ffffff;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-retry:hover {
          background: rgba(239, 68, 68, 0.3);
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
        }

        .empty-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 0.5rem 0;
        }

        .empty-text {
          font-size: 0.95rem;
          color: #71717a;
          margin: 0;
        }

        .table-wrapper {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 1.5rem;
        }

        .batch-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .batch-table thead {
          background: rgba(255, 255, 255, 0.05);
        }

        .batch-table th {
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          font-size: 0.85rem;
          color: #a1a1aa;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .batch-table td {
          padding: 1rem;
          color: #d4d4d8;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 0;
        }

        .batch-row:last-child td {
          border-bottom: none;
        }

        .batch-row:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .batch-name {
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 0.25rem;
        }

        .batch-count {
          font-size: 0.8rem;
          color: #71717a;
        }

        .status-badge {
          display: inline-block;
          padding: 0.375rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-pending {
          background: rgba(161, 161, 170, 0.15);
          color: #a1a1aa;
        }

        .status-processing {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
        }

        .status-completed {
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
        }

        .status-failed {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
        }

        .status-partial {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
        }

        .progress-bar-container {
          width: 120px;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 0.25rem;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
          transition: width 0.3s;
        }

        .progress-text {
          font-size: 0.8rem;
          color: #a1a1aa;
        }

        .failed-count {
          color: #f87171;
        }

        .col-created {
          color: #71717a;
          font-size: 0.875rem;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .btn-action {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-view {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
        }

        .btn-view:hover {
          background: rgba(59, 130, 246, 0.25);
          transform: translateY(-1px);
        }

        .btn-download {
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
        }

        .btn-download:hover {
          background: rgba(34, 197, 94, 0.25);
          transform: translateY(-1px);
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
        }

        .btn-page {
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #ffffff;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-page:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
        }

        .btn-page:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .page-info {
          color: #a1a1aa;
          font-size: 0.875rem;
        }

        @media (max-width: 768px) {
          .batch-list {
            padding: 1.5rem;
          }

          .filters {
            flex-direction: column;
          }

          .batch-table {
            font-size: 0.85rem;
          }

          .batch-table th,
          .batch-table td {
            padding: 0.75rem 0.5rem;
          }

          .col-created {
            display: none;
          }

          .progress-bar-container {
            width: 80px;
          }
        }
      `}</style>
    </div>
  );
}
