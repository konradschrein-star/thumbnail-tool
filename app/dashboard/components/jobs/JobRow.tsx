'use client';

import { useState } from 'react';
import React from 'react';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Eye,
  Download,
  RotateCcw,
  Image as ImageIcon,
  Globe,
  Layers,
  Sparkles,
  Trash2,
  Copy,
  FileText,
  MessageSquare
} from 'lucide-react';
import { HistoryJob } from '@/app/dashboard/hooks/useHistory';
import { generateProfessionalFilename, downloadRemoteImage } from '@/lib/download-utils';
import { copyImageToClipboard, copyTextToClipboard, formatJobDetails } from '@/lib/clipboard-utils';

interface JobRowProps {
  job: HistoryJob;
  onRedo?: (job: HistoryJob) => void;
  isSelected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
}

export default function JobRow({ job, onRedo, isSelected, onToggleSelect, onDelete }: JobRowProps) {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const rowRef = React.useRef<HTMLTableRowElement>(null);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: HistoryJob['status']) => {
    const config: Record<HistoryJob['status'], { label: string; icon: React.ReactNode }> = {
      pending: { label: 'Pending', icon: <Clock size={12} /> },
      processing: { label: 'Processing', icon: <Loader2 size={12} className="animate-spin" /> },
      completed: { label: 'Completed', icon: <CheckCircle2 size={12} /> },
      failed: { label: 'Failed', icon: <XCircle size={12} /> },
    };

    const { label, icon } = config[status];

    // Determine job type
    const isBatch = job.batchJobId;
    const isTranslation = job.metadata && typeof job.metadata === 'object' && 'isVariant' in job.metadata && job.metadata.isVariant;
    const isSingle = job.isManual && !isBatch;

    return (
      <div className="status-badges-wrapper">
        <span className={`status-badge ${status}`}>
          {icon}
          {label}
        </span>
        {isTranslation && (
          <span className="status-badge variant">
            <Globe size={12} />
            {(job.metadata as any)?.language}
          </span>
        )}
        {isBatch && (
          <span className="status-badge batch">
            <Layers size={12} />
            Batch
          </span>
        )}
        {isSingle && (
          <span className="status-badge single">
            <Sparkles size={12} />
            Single
          </span>
        )}
      </div>
    );
  };

  const truncateText = (text: string, maxLength: number = 40): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleOpenPreview = () => {
    setShowPreviewModal(true);
    // Scroll the row into view smoothly when opening preview
    setTimeout(() => {
      rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  return (
    <>
      <tr
        ref={rowRef}
        className="job-row"
        onDoubleClick={(e) => {
          // Don't navigate if clicking on a button or checkbox
          const target = e.target as HTMLElement;
          if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.closest('button')) {
            return;
          }

          // Only navigate to detail page if job is completed
          if (job.status === 'completed') {
            window.location.href = `/dashboard/job/${job.id}`;
          }
        }}
        style={{ cursor: job.status === 'completed' ? 'pointer' : 'default' }}
      >
        <td className="checkbox-cell">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select job ${job.id}`}
          />
        </td>
        <td className="job-cell preview">
          {job.status === 'completed' && job.outputUrl ? (
            <div className="thumbnail-preview-mini glass-dark" onClick={handleOpenPreview}>
              <img src={job.outputUrl} alt="Thumbnail preview" />
            </div>
          ) : (
            <div className="thumbnail-placeholder-mini glass-dark">
              {job.status === 'processing' ? <Loader2 size={14} className="animate-spin text-muted-foreground" /> : <ImageIcon size={14} className="text-muted-foreground opacity-20" />}
            </div>
          )}
        </td>
        <td className="job-cell timestamp">
          {formatDate(job.createdAt)}
        </td>
        <td className="job-cell channel">
          <span className="channel-tag">{job.channel?.name || 'Unknown Channel'}</span>
        </td>
        <td className="job-cell archetype">
          <span className="secondary-text">{job.archetype?.name || 'Unknown Archetype'}</span>
        </td>
        <td className="job-cell topic">
          {truncateText(job.videoTopic)}
        </td>
        <td className="job-cell status">
          {getStatusBadge(job.status)}
        </td>
        <td className="job-cell actions">
          <div className="action-wrapper">
            {job.status === 'completed' && (
              <>
                <Button
                  size="small"
                  variant="ghost"
                  onClick={() => {
                    const filename = generateProfessionalFilename(
                      job.channel?.name || 'Channel',
                      job.archetype?.category || 'General',
                      job.metadata?.isVariant ? `${job.videoTopic}_${(job.metadata as any)?.language}` : job.videoTopic,
                      1
                    );
                    downloadRemoteImage(job.outputUrl!, filename);
                  }}
                  title="Download"
                >
                  <Download size={14} />
                </Button>
                <Button
                  size="small"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await copyImageToClipboard(job.outputUrl!);
                      alert('Image copied to clipboard!');
                    } catch (error) {
                      alert('Failed to copy image. Please try downloading instead.');
                    }
                  }}
                  title="Copy Image"
                >
                  <Copy size={14} />
                </Button>
                <Button size="small" variant="secondary" onClick={handleOpenPreview}>
                  <Eye size={14} className="action-icon" /> View
                </Button>
              </>
            )}
            <Button
              size="small"
              variant="ghost"
              onClick={async () => {
                try {
                  const details = formatJobDetails(job);
                  await copyTextToClipboard(details);
                  alert('Job details copied to clipboard!');
                } catch (error) {
                  alert('Failed to copy details');
                }
              }}
              title="Copy Details"
            >
              <FileText size={14} />
            </Button>
            {job.promptUsed && (
              <Button
                size="small"
                variant="ghost"
                onClick={async () => {
                  try {
                    await copyTextToClipboard(job.promptUsed!);
                    alert('Prompt copied to clipboard!');
                  } catch (error) {
                    alert('Failed to copy prompt');
                  }
                }}
                title="Copy Prompt"
              >
                <MessageSquare size={14} />
              </Button>
            )}
            <Button
              size="small"
              variant="ghost"
              onClick={() => {
                if (onRedo) {
                  onRedo(job);
                } else {
                  window.location.href = `/dashboard?tab=generate&jobId=${job.id}`;
                }
              }}
              title="Load to Editor (Redo)"
            >
              <RotateCcw size={14} />
            </Button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this job? This action cannot be undone.')) {
                  onDelete();
                }
              }}
              className="delete-btn"
              title="Delete job"
            >
              <Trash2 size={16} />
            </button>
            {job.status === 'failed' && (
              <Button size="small" variant="ghost" className="error-btn" onClick={() => setShowErrorModal(true)}>
                Error
              </Button>
            )}
            {(job.status === 'pending' || job.status === 'processing') && (
              <span className="loading-spinner-small"></span>
            )}
          </div>
        </td>
      </tr>

      {/* Preview Modal */}
      {job.status === 'completed' && job.outputUrl && (
        <Modal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title="Thumbnail Preview"
          size="xl"
        >
          <div className="preview-container">
            <div className="preview-image-wrapper glass">
              <img
                src={job.outputUrl}
                alt="Generated thumbnail"
                className="preview-image"
              />
              <div className="image-actions">
                <Button
                  variant="primary"
                  onClick={() => {
                    const filename = generateProfessionalFilename(
                      job.channel?.name || 'Channel',
                      job.archetype?.category || 'General',
                      job.metadata?.isVariant ? `${job.videoTopic}_${(job.metadata as any)?.language}` : job.videoTopic,
                      1
                    );
                    downloadRemoteImage(job.outputUrl!, filename);
                  }}
                >
                  <Download size={16} style={{ marginRight: '0.5rem' }} /> Download HD
                </Button>
              </div>
            </div>

            <div className="preview-info glass">
              <div className="info-item">
                <span className="info-label">Video Topic</span>
                <span className="info-value">{job.videoTopic}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Thumbnail Text</span>
                <span className="info-value">{job.thumbnailText}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Channel</span>
                <span className="info-value">{job.channel?.name || 'Unknown'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Archetype</span>
                <span className="info-value">{job.archetype?.name || 'Unknown'}</span>
              </div>
              {job.metadata?.isVariant && (
                <>
                  <div className="info-item">
                    <span className="info-label">Language</span>
                    <span className="info-value">{(job.metadata as any)?.language}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Original Text</span>
                    <span className="info-value">{job.metadata.originalText}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Error Modal */}
      {job.status === 'failed' && (
        <Modal
          isOpen={showErrorModal}
          onClose={() => setShowErrorModal(false)}
          title="Generation Error"
        >
          <div className="error-modal-content">
            <div className="error-box glass">
              <div className="error-header">
                <AlertCircle className="error-icon-lucide" size={20} />
                <span className="error-title">Technical Details</span>
              </div>
              <div className="error-message">
                {job.errorMessage || 'An unknown error occurred during generation.'}
              </div>
            </div>

            <div className="job-meta-list glass">
              <div className="meta-item">
                <span>Timestamp:</span>
                <span>{formatDate(job.createdAt)}</span>
              </div>
              <div className="meta-item">
                <span>Archetype:</span>
                <span>{job.archetype?.name || 'Unknown'}</span>
              </div>
            </div>

            <div className="modal-footer">
              <Button onClick={() => setShowErrorModal(false)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      <style jsx>{`
        /* ... existing styles ... */
        .action-icon {
          margin-right: 0.4rem;
        }

        .modal-footer {
          margin-top: 1.5rem;
          display: flex;
          justify-content: flex-end;
        }
        .job-row {
          transition: background-color 0.2s ease;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .job-row:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .thumbnail-preview-mini {
          width: 120px;
          height: 68px;
          border-radius: 4px;
          overflow: hidden;
          cursor: zoom-in;
          transition: transform 0.2s ease;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .thumbnail-preview-mini:hover {
          transform: scale(1.1);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .thumbnail-preview-mini img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .thumbnail-placeholder-mini {
          width: 120px;
          height: 68px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .job-cell {
          padding: 1rem 0.75rem;
          vertical-align: middle;
          font-size: 0.875rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 0;
        }

        .timestamp {
          color: #94a3b8;
          font-size: 0.8125rem;
          white-space: nowrap;
        }

        .channel-tag {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.125rem 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          color: #a1a1aa;
        }

        .secondary-text {
          color: #94a3b8;
        }

        .topic {
          font-weight: 500;
          color: #f8fafc;
        }

        .action-wrapper {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.2rem 0.625rem;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .status-badges-wrapper {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .status-badge.variant {
          background: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
          border-color: rgba(59, 130, 246, 0.2);
        }

        /* Status Colors - Monochrome Grayscale */
        .status-badge.pending {
          background: rgba(255, 255, 255, 0.03);
          color: #a1a1aa;
        }

        .status-badge.processing {
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
        }

        .status-badge.completed {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.2);
        }

        .status-badge.failed {
          background: rgba(255, 255, 255, 0.03);
          color: #71717a;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }

        /* Modal Styles */
        .preview-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .preview-info {
          padding: 1.25rem;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .info-label {
          font-size: 0.75rem;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }

        .info-value {
          font-size: 0.9375rem;
          color: #f8fafc;
        }

        .preview-image-wrapper {
          width: 100%;
          border-radius: 12px;
          background: #020617;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          position: relative;
        }

        .preview-image {
          width: 100%;
          height: auto;
          object-fit: contain;
          display: block;
          border-radius: 12px;
        }

        .image-actions {
          position: absolute;
          bottom: 1.5rem;
          right: 1.5rem;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .preview-image-wrapper:hover .image-actions {
          opacity: 1;
        }

        .error-modal-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .error-box {
          padding: 1.5rem;
          border-left: 4px solid #ef4444;
        }

        .error-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .error-title {
          font-size: 1rem;
          font-weight: 700;
          color: #f8fafc;
        }

        .error-message {
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 0.875rem;
          color: #ef4444;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .job-meta-list {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .meta-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
        }

        .meta-item span:first-child {
          color: #94a3b8;
        }

        .meta-item span:last-child {
          color: #f8fafc;
          font-weight: 500;
        }

        .error-btn:hover {
          color: #ef4444 !important;
          background: rgba(239, 68, 68, 0.1) !important;
        }

        .loading-spinner-small {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .checkbox-cell {
          padding: 0.75rem;
          text-align: center;
        }

        .checkbox-cell input[type="checkbox"] {
          cursor: pointer;
          width: 16px;
          height: 16px;
        }

        .delete-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          border: none;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .delete-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
        }
      `}</style>
    </>
  );
}
