'use client';

import { useState, useEffect } from 'react';
import ErrorMessage from '@/app/dashboard/components/shared/ErrorMessage';
import JobRow from './JobRow';
import useHistory, { HistoryJob } from '@/app/dashboard/hooks/useHistory';
import useChannels from '@/app/dashboard/hooks/useChannels';
import { BlurFade } from '@/app/dashboard/components/ui/blur-fade';
import { ClipboardList } from 'lucide-react';

// Helper to group jobs by date
function groupJobsByDate(jobs: HistoryJob[]) {
  const groups: { [key: string]: HistoryJob[] } = {
    'Today': [],
    'Yesterday': [],
    'Last 7 Days': [],
    'Older': []
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  jobs.forEach(job => {
    const jobDate = new Date(job.createdAt);
    if (jobDate >= today) {
      groups['Today'].push(job);
    } else if (jobDate >= yesterday) {
      groups['Yesterday'].push(job);
    } else if (jobDate >= lastWeek) {
      groups['Last 7 Days'].push(job);
    } else {
      groups['Older'].push(job);
    }
  });

  return groups;
}

interface JobHistoryTableProps {
  onRedo?: (job: HistoryJob) => void;
}

export default function JobHistoryTable({ onRedo }: JobHistoryTableProps) {
  const { channels } = useChannels();
  const [channelFilter, setChannelFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { jobs, loading, error, refetch } = useHistory({
    type: typeFilter === 'all' ? undefined : typeFilter,
    status: statusFilter || undefined,
  });

  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Selection handlers
  const handleToggleJob = (jobId: string) => {
    const newSelection = new Set(selectedJobIds);
    if (newSelection.has(jobId)) {
      newSelection.delete(jobId);
    } else {
      newSelection.add(jobId);
    }
    setSelectedJobIds(newSelection);
  };

  const handleToggleAll = () => {
    if (selectedJobIds.size === filteredJobs.length && filteredJobs.length > 0) {
      // Deselect all
      setSelectedJobIds(new Set());
    } else {
      // Select all visible jobs
      const allIds = new Set(filteredJobs.map(job => job.id));
      setSelectedJobIds(allIds);
    }
  };

  const handleClearSelection = () => {
    setSelectedJobIds(new Set());
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/jobs/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobIds: Array.from(selectedJobIds) }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete jobs');
      }

      const result = await response.json();

      // Show success message
      alert(`Successfully deleted ${result.deletedCount} job(s)`);

      // Clear selection and refetch
      setSelectedJobIds(new Set());
      setShowDeleteModal(false);
      await refetch();
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete jobs');
    } finally {
      setIsDeleting(false);
    }
  };

  // Auto-refresh when jobs are pending or processing
  useEffect(() => {
    const hasActiveJobs = jobs.some(
      (job) => job.status === 'pending' || job.status === 'processing'
    );

    if (!hasActiveJobs) return;

    // Only poll when page is visible
    const handleVisibilityChange = () => {
      if (!document.hidden && hasActiveJobs) {
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Poll every 10 seconds
    const interval = setInterval(() => {
      if (!document.hidden) {
        refetch();
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [jobs, refetch]);

  if (loading && jobs.length === 0) {
    return <div className="loading">Loading generation history...</div>;
  }

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.videoTopic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChannel = !channelFilter || job.channelId === channelFilter;
    const matchesStatus = !statusFilter || job.status === statusFilter;
    return matchesSearch && matchesChannel && matchesStatus;
  });
  const groupedJobs = groupJobsByDate(filteredJobs);

  return (
    <BlurFade delay={0.1} inView>
      <div className="view-container">
        <div className="view-header">
          <div>
            <h2 className="view-title">Generation History</h2>
            <p className="view-subtitle">Track and manage your last 30 AI-generated thumbnails</p>
          </div>
        </div>

        {/* Filters */}
        <div className="filter-bar glass">
          <div className="filter-group search-group">
            <label className="filter-label">Search Topic</label>
            <input
              type="text"
              placeholder="Search by video topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="filter-select"
              title="Filter by Job Type"
            >
              <option value="all">All Jobs</option>
              <option value="single">Single Generations</option>
              <option value="batch">Batch Jobs</option>
              <option value="translation">Translations</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Channel</label>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="filter-select"
              title="Filter by Channel"
            >
              <option value="">All Channels</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
              title="Filter by Status"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {filteredJobs.length === 0 ? (
          <div className="empty-state glass">
            <div className="empty-icon text-muted-foreground"><ClipboardList size={48} /></div>
            <h3>No jobs found</h3>
            <p>
              {channelFilter || statusFilter || searchQuery
                ? 'No generation jobs match your current search criteria.'
                : 'Start generating thumbnails to see your history here.'}
            </p>
          </div>
        ) : (
          <div className="history-list">
            {Object.entries(groupedJobs).map(([dateGroup, groupJobs]) => {
              if (groupJobs.length === 0) return null;
              return (
                <div key={dateGroup} className="date-group">
                  <h3 className="date-group-title">{dateGroup}</h3>
                  <div className="table-container">
                    <table className="job-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>
                            <input
                              type="checkbox"
                              checked={selectedJobIds.size === filteredJobs.length && filteredJobs.length > 0}
                              onChange={handleToggleAll}
                              aria-label="Select all jobs"
                              style={{ cursor: 'pointer' }}
                            />
                          </th>
                          <th>Preview</th>
                          <th>Timestamp</th>
                          <th>Channel</th>
                          <th>Archetype</th>
                          <th>Video Topic</th>
                          <th>Status</th>
                          <th className="action-header">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupJobs.map((job) => (
                          <JobRow
                            key={job.id}
                            job={job}
                            onRedo={onRedo}
                            isSelected={selectedJobIds.has(job.id)}
                            onToggleSelect={() => handleToggleJob(job.id)}
                            onDelete={async () => {
                              // Handle individual delete
                              try {
                                const response = await fetch(`/api/jobs/${job.id}`, {
                                  method: 'DELETE',
                                });

                                if (!response.ok) {
                                  const error = await response.json();
                                  throw new Error(error.error || 'Failed to delete job');
                                }

                                await refetch();
                                alert('Job deleted successfully');
                              } catch (error) {
                                console.error('Delete error:', error);
                                alert(error instanceof Error ? error.message : 'Failed to delete job');
                              }
                            }}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bulk Action Bar */}
        {selectedJobIds.size > 0 && (
          <div className="bulk-action-bar glass">
            <span className="selection-count">
              {selectedJobIds.size} job{selectedJobIds.size !== 1 ? 's' : ''} selected
            </span>
            <div className="bulk-actions">
              <button
                onClick={handleClearSelection}
                className="btn-secondary"
              >
                Clear
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="btn-danger"
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="modal-overlay" onClick={() => !isDeleting && setShowDeleteModal(false)}>
            <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
              <h3>Delete {selectedJobIds.size} Job{selectedJobIds.size !== 1 ? 's' : ''}?</h3>
              <p>This action cannot be undone. All selected jobs and their data will be permanently deleted.</p>
              <div className="modal-actions">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="btn-secondary"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="btn-danger"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          .view-container {
            display: flex;
            flex-direction: column;
          }

          .view-header {
            margin-bottom: 2rem;
          }

          .view-title {
            font-size: 1.875rem;
            font-weight: 700;
            margin: 0;
            color: #fafafa;
            letter-spacing: -0.025em;
          }

          .view-subtitle {
            color: #94a3b8;
            margin: 0.25rem 0 0 0;
            font-size: 0.875rem;
          }

          .filter-bar {
            padding: 1.25rem;
            margin-bottom: 2rem;
            display: flex;
            gap: 1.5rem;
            align-items: flex-end;
          }

          .history-list {
            display: flex;
            flex-direction: column;
            gap: 3rem;
          }

          .date-group {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .date-group-title {
            font-size: 0.875rem;
            font-weight: 700;
            color: #ffffff;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            padding-left: 0.5rem;
            border-left: 2px solid #ffffff;
          }

          .filter-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            min-width: 200px;
          }

          .filter-label {
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
          }

            .filter-select, .filter-input {
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 8px;
              color: #fafafa;
              font-size: 0.9375rem;
              padding: 0.6rem 0.8rem;
              outline: none;
              cursor: pointer;
              transition: all 0.2s ease;
            }

            .filter-input {
              cursor: text;
              width: 100%;
            }

            .search-group {
              flex: 1;
              min-width: 300px;
            }

            .filter-select option {
              background-color: #09090b;
              color: #fafafa;
            }

            .filter-select:focus, .filter-input:focus {
              border-color: #ffffff;
              background: rgba(255, 255, 255, 0.05);
            }

          .loading {
            text-align: center;
            padding: 4rem;
            color: #94a3b8;
            font-weight: 500;
          }

          .table-container {
            overflow-x: auto;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            background: rgba(15, 23, 42, 0.3);
            backdrop-filter: blur(8px);
            min-height: 600px;
          }

          .job-table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            table-layout: fixed;
          }

          .job-table th {
            padding: 1rem 0.75rem;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            background: rgba(255, 255, 255, 0.01);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .action-header {
            text-align: right;
            padding-right: 1.5rem !important;
          }

          .empty-state {
            padding: 5rem 2rem;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.25rem;
          }

          .empty-icon {
            font-size: 3.5rem;
            margin-bottom: 0.5rem;
            filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.1));
          }

          .empty-state h3 {
            margin: 0;
            font-size: 1.25rem;
            color: #f8fafc;
          }

          .empty-state p {
            color: #64748b;
            margin: 0;
            max-width: 400px;
            line-height: 1.6;
          }

          @media (max-width: 768px) {
            .filter-bar {
              flex-direction: column;
              align-items: stretch;
            }
          }

          .bulk-action-bar {
            position: fixed;
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%);
            padding: 1rem 2rem;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            gap: 2rem;
            z-index: 100;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          }

          .selection-count {
            font-size: 0.9375rem;
            font-weight: 600;
            color: #fafafa;
          }

          .bulk-actions {
            display: flex;
            gap: 1rem;
          }

          .btn-secondary {
            padding: 0.5rem 1rem;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background: rgba(255, 255, 255, 0.05);
            color: #fafafa;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.1);
          }

          .btn-danger {
            padding: 0.5rem 1rem;
            border-radius: 6px;
            border: 1px solid rgba(239, 68, 68, 0.3);
            background: rgba(239, 68, 68, 0.2);
            color: #fca5a5;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-danger:hover {
            background: rgba(239, 68, 68, 0.3);
            color: #fef2f2;
          }

          .btn-danger:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .modal-content {
            padding: 2rem;
            border-radius: 12px;
            max-width: 500px;
            width: 90%;
          }

          .modal-content h3 {
            margin: 0 0 1rem 0;
            font-size: 1.25rem;
            color: #fafafa;
          }

          .modal-content p {
            margin: 0 0 1.5rem 0;
            color: #94a3b8;
            line-height: 1.6;
          }

          .modal-actions {
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
          }
        `}</style>
      </div>
    </BlurFade>
  );
}
