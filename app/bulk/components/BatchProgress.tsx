'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, Loader, XCircle, Download, TrendingUp, ArrowLeft } from 'lucide-react';

interface BatchJob {
  id: string;
  name: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  outputZipUrl?: string;
  createdAt: string;
  updatedAt: string;
  jobs: Array<{
    id: string;
    status: string;
    outputUrl?: string;
    errorMessage?: string;
    videoTopic: string;
    thumbnailText: string;
    completedAt?: string;
  }>;
  jobsByStatus: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  progressPercentage: number;
}

interface BatchProgressProps {
  batchId: string | null;
  onClose?: () => void;
}

export function BatchProgress({ batchId, onClose }: BatchProgressProps) {
  const [batchJob, setBatchJob] = useState<BatchJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (!batchId) return;

    const fetchStatus = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/batch/status?batchJobId=${batchId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch batch status');
        }

        const data = await response.json();
        setBatchJob(data.data);

        // Auto-enable refresh if still processing
        if (['PENDING', 'PROCESSING'].includes(data.data.status)) {
          setAutoRefresh(true);
        } else {
          setAutoRefresh(false);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch batch status');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    // Auto-refresh every 5 seconds if processing
    const interval = autoRefresh
      ? setInterval(fetchStatus, 5000)
      : undefined;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [batchId, autoRefresh]);

  if (!batchId) {
    return (
      <div className="empty-card">
        <p>Select a batch job to view progress</p>
        <style jsx>{`
          .empty-card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 3rem 2rem;
            text-align: center;
            color: #71717a;
            font-size: 0.9375rem;
          }
        `}</style>
      </div>
    );
  }

  if (loading && !batchJob) {
    return (
      <div className="loading-card">
        <Loader className="spinner" />
        <style jsx>{`
          .loading-card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 3rem 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .spinner {
            width: 32px;
            height: 32px;
            color: #60a5fa;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error && !batchJob) {
    return (
      <div className="error-card">
        <div className="error-content">
          <AlertCircle className="icon" />
          <p>{error}</p>
        </div>
        <style jsx>{`
          .error-card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 2rem;
          }
          .error-content {
            display: flex;
            gap: 0.75rem;
            align-items: flex-start;
          }
          .icon {
            width: 20px;
            height: 20px;
            color: #f87171;
            flex-shrink: 0;
          }
          .error-content p {
            margin: 0;
            color: #fca5a5;
            font-size: 0.9375rem;
          }
        `}</style>
      </div>
    );
  }

  if (!batchJob) return null;

  const statusConfig = {
    PENDING: { color: '#facc15', bgColor: 'rgba(250, 204, 21, 0.1)', borderColor: 'rgba(250, 204, 21, 0.2)', icon: <Clock size={20} /> },
    PROCESSING: { color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.1)', borderColor: 'rgba(96, 165, 250, 0.2)', icon: <Loader size={20} className="spinner" /> },
    COMPLETED: { color: '#4ade80', bgColor: 'rgba(74, 222, 128, 0.1)', borderColor: 'rgba(74, 222, 128, 0.2)', icon: <CheckCircle size={20} /> },
    FAILED: { color: '#f87171', bgColor: 'rgba(248, 113, 113, 0.1)', borderColor: 'rgba(248, 113, 113, 0.2)', icon: <XCircle size={20} /> },
    PARTIAL: { color: '#fb923c', bgColor: 'rgba(251, 146, 60, 0.1)', borderColor: 'rgba(251, 146, 60, 0.2)', icon: <AlertCircle size={20} /> },
  };

  const currentStatus = statusConfig[batchJob.status];

  return (
    <div className="container">
      {onClose && (
        <button onClick={onClose} className="back-button">
          <ArrowLeft size={18} />
          Back to List
        </button>
      )}
      <div className="main-card">
        <div className="header">
          <div>
            <h2 className="title">{batchJob.name}</h2>
            <p className="subtitle">
              Created {new Date(batchJob.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="status-badge" style={{
            backgroundColor: currentStatus.bgColor,
            borderColor: currentStatus.borderColor,
            color: currentStatus.color
          }}>
            {currentStatus.icon}
            <span>{batchJob.status}</span>
          </div>
        </div>

        <div className="progress-section">
          <div className="progress-header">
            <div className="progress-label">
              <TrendingUp size={16} />
              <span>Overall Progress</span>
            </div>
            <span className="progress-percentage">{batchJob.progressPercentage}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${batchJob.progressPercentage}%` }} />
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-label">Total Jobs</p>
            <p className="stat-value">{batchJob.totalJobs}</p>
          </div>
          <div className="stat-card success">
            <p className="stat-label">Completed</p>
            <p className="stat-value">{batchJob.completedJobs}</p>
          </div>
          <div className="stat-card danger">
            <p className="stat-label">Failed</p>
            <p className="stat-value">{batchJob.failedJobs}</p>
          </div>
          <div className="stat-card info">
            <p className="stat-label">Processing</p>
            <p className="stat-value">{batchJob.jobsByStatus.processing}</p>
          </div>
        </div>

        {batchJob.status === 'COMPLETED' && batchJob.outputZipUrl && (
          <a href={batchJob.outputZipUrl} download className="download-button">
            <Download size={18} />
            Download All Thumbnails
          </a>
        )}
      </div>

      {batchJob.jobs.length > 0 && (
        <div className="details-card">
          <div className="details-header">
            <h3 className="details-title">Job Details</h3>
          </div>
          <div className="table-wrapper">
            <table className="details-table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Text</th>
                  <th>Status</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {batchJob.jobs.slice(0, 10).map((job) => (
                  <tr key={job.id}>
                    <td className="truncate">{job.videoTopic}</td>
                    <td className="truncate">{job.thumbnailText}</td>
                    <td>
                      <span className={`job-status ${job.status}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="date">
                      {job.completedAt
                        ? new Date(job.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {batchJob.jobs.length > 10 && (
            <div className="table-footer">
              Showing 10 of {batchJob.jobs.length} jobs
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #a1a1aa;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          align-self: flex-start;
        }

        .back-button:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          transform: translateX(-2px);
        }

        .main-card,
        .details-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 2rem;
        }

        .header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 2rem;
        }

        .title {
          font-size: 1.875rem;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 0.5rem 0;
          font-family: var(--font-outfit);
          letter-spacing: -0.02em;
        }

        .subtitle {
          font-size: 0.875rem;
          color: #71717a;
          margin: 0;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.75rem 1.25rem;
          border-radius: 12px;
          border: 1px solid;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .progress-section {
          margin-bottom: 2rem;
        }

        .progress-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.875rem;
        }

        .progress-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #a1a1aa;
        }

        .progress-percentage {
          font-size: 1.125rem;
          font-weight: 700;
          color: #ffffff;
        }

        .progress-bar {
          width: 100%;
          height: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 9999px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);
          transition: width 0.5s ease;
          border-radius: 9999px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1.25rem;
        }

        .stat-card.success {
          border-color: rgba(74, 222, 128, 0.15);
        }

        .stat-card.danger {
          border-color: rgba(248, 113, 113, 0.15);
        }

        .stat-card.info {
          border-color: rgba(96, 165, 250, 0.15);
        }

        .stat-label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 0.625rem 0;
        }

        .stat-value {
          font-size: 1.875rem;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
        }

        .stat-card.success .stat-value {
          color: #4ade80;
        }

        .stat-card.danger .stat-value {
          color: #f87171;
        }

        .stat-card.info .stat-value {
          color: #60a5fa;
        }

        .download-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          width: 100%;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          color: #ffffff;
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 12px;
          font-size: 0.9375rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .download-button:hover {
          background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(34, 197, 94, 0.3);
        }

        .details-header {
          padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          margin-bottom: 1.5rem;
        }

        .details-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          font-family: var(--font-outfit);
        }

        .table-wrapper {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .details-table {
          width: 100%;
          font-size: 0.875rem;
          border-collapse: collapse;
        }

        .details-table thead {
          background: rgba(255, 255, 255, 0.03);
        }

        .details-table th {
          padding: 0.875rem 1rem;
          text-align: left;
          color: #a1a1aa;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }

        .details-table tbody tr {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          transition: background 0.15s ease;
        }

        .details-table tbody tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .details-table td {
          padding: 0.875rem 1rem;
          color: #d4d4d8;
        }

        .details-table td.truncate {
          max-width: 250px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .details-table td.date {
          color: #a1a1aa;
          font-size: 0.8125rem;
        }

        .job-status {
          padding: 0.375rem 0.75rem;
          border-radius: 6px;
          font-size: 0.8125rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .job-status.completed {
          background: rgba(74, 222, 128, 0.1);
          color: #4ade80;
          border: 1px solid rgba(74, 222, 128, 0.2);
        }

        .job-status.failed {
          background: rgba(248, 113, 113, 0.1);
          color: #f87171;
          border: 1px solid rgba(248, 113, 113, 0.2);
        }

        .job-status.processing {
          background: rgba(96, 165, 250, 0.1);
          color: #60a5fa;
          border: 1px solid rgba(96, 165, 250, 0.2);
        }

        .job-status.pending {
          background: rgba(113, 113, 122, 0.1);
          color: #a1a1aa;
          border: 1px solid rgba(113, 113, 122, 0.2);
        }

        .table-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 0.875rem;
          color: #71717a;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .main-card,
          .details-card {
            padding: 1.5rem;
          }

          .header {
            flex-direction: column;
            gap: 1rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .details-table {
            font-size: 0.8125rem;
          }

          .details-table th,
          .details-table td {
            padding: 0.75rem 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
