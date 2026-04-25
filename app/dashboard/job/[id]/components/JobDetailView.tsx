'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Button from '@/app/dashboard/components/shared/Button';
import useChannels from '@/app/dashboard/hooks/useChannels';
import { HistoryJob } from '@/app/dashboard/hooks/useHistory';

interface JobDetailViewProps {
  jobId: string;
}

export default function JobDetailView({ jobId }: JobDetailViewProps) {
  const router = useRouter();
  const { channels } = useChannels();
  const [job, setJob] = useState<HistoryJob | null>(null);
  const [archetypes, setArchetypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [videoTopic, setVideoTopic] = useState('');
  const [thumbnailText, setThumbnailText] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [selectedArchetypeId, setSelectedArchetypeId] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  // Fetch job details
  useEffect(() => {
    async function fetchJob() {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);

        if (response.status === 404) {
          setError('Job not found');
          setLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch job');
        }

        const data = await response.json();
        setJob(data);

        // Populate form fields
        setVideoTopic(data.videoTopic || '');
        setThumbnailText(data.thumbnailText || '');
        setSelectedChannelId(data.channelId || '');
        setSelectedArchetypeId(data.archetypeId || '');
        setCustomPrompt(data.customPrompt || data.promptUsed || '');

        setLoading(false);
      } catch (err) {
        console.error('Error fetching job:', err);
        setError('Failed to load job details');
        setLoading(false);
      }
    }

    fetchJob();
  }, [jobId]);

  // Fetch archetypes when channel changes
  useEffect(() => {
    async function fetchArchetypes() {
      if (!selectedChannelId) {
        setArchetypes([]);
        return;
      }

      try {
        const response = await fetch(`/api/archetypes?channelId=${selectedChannelId}`);
        if (!response.ok) throw new Error('Failed to fetch archetypes');

        const data = await response.json();
        setArchetypes(data);
      } catch (err) {
        console.error('Error fetching archetypes:', err);
        setArchetypes([]);
      }
    }

    fetchArchetypes();
  }, [selectedChannelId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error || !job) {
    return (
      <div className="error-state">
        <h2>{error || 'Job not found'}</h2>
        <p>The job you're looking for doesn't exist or you don't have access to it.</p>
        <Button onClick={() => router.push('/dashboard?tab=history')}>
          <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} />
          Back to History
        </Button>

        <style jsx>{`
          .error-state {
            padding: 4rem 2rem;
            text-align: center;
            max-width: 600px;
            margin: 0 auto;
          }

          h2 {
            color: #fafafa;
            margin-bottom: 1rem;
          }

          p {
            color: #94a3b8;
            margin-bottom: 2rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="job-detail-container">
      {/* Header */}
      <div className="detail-header">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard?tab=history')}
        >
          <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} />
          Back to History
        </Button>
        <h1>Job #{job.id.substring(0, 8)}...</h1>
      </div>

      {/* Main Content */}
      <div className="detail-content">
        {/* Thumbnail Preview */}
        <div className="thumbnail-section">
          {job.status === 'completed' && job.outputUrl ? (
            <img
              src={job.outputUrl}
              alt="Generated thumbnail"
              className="large-thumbnail"
            />
          ) : (
            <div className="thumbnail-placeholder">
              <p>
                {job.status === 'pending' && 'Job is pending...'}
                {job.status === 'processing' && 'Job is processing...'}
                {job.status === 'failed' && `Failed: ${job.errorMessage}`}
              </p>
            </div>
          )}
        </div>

        {/* Edit Form */}
        <div className="form-section glass">
          <h2>Edit & Regenerate</h2>

          <div className="form-group">
            <label htmlFor="videoTopic">Video Topic</label>
            <input
              id="videoTopic"
              type="text"
              value={videoTopic}
              onChange={(e) => setVideoTopic(e.target.value)}
              className="form-input"
              placeholder="e.g., How to master TypeScript"
            />
          </div>

          <div className="form-group">
            <label htmlFor="thumbnailText">Thumbnail Text</label>
            <input
              id="thumbnailText"
              type="text"
              value={thumbnailText}
              onChange={(e) => setThumbnailText(e.target.value)}
              className="form-input"
              placeholder="e.g., MASTER TYPESCRIPT"
            />
          </div>

          <div className="form-group">
            <label htmlFor="channel">Channel</label>
            <select
              id="channel"
              value={selectedChannelId}
              onChange={(e) => {
                setSelectedChannelId(e.target.value);
                setSelectedArchetypeId(''); // Reset archetype
              }}
              className="form-select"
            >
              <option value="">Select Channel</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="archetype">Archetype</label>
            <select
              id="archetype"
              value={selectedArchetypeId}
              onChange={(e) => setSelectedArchetypeId(e.target.value)}
              className="form-select"
              disabled={!selectedChannelId}
            >
              <option value="">Select Archetype</option>
              {archetypes.map((archetype) => (
                <option key={archetype.id} value={archetype.id}>
                  {archetype.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="prompt">Custom Prompt (Optional)</label>
            <textarea
              id="prompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="form-textarea"
              rows={6}
              placeholder="Leave empty to use default prompt..."
            />
            <small>Character count: {customPrompt.length} / 2000</small>
          </div>

          {/* Action Buttons - Placeholders for now, will be implemented in Task 8 */}
          <div className="form-actions">
            <Button variant="secondary" disabled>
              Regenerate (Coming soon)
            </Button>
            <Button variant="primary" disabled>
              Iterate (Coming soon)
            </Button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .job-detail-container {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .detail-header {
          display: flex;
          align-items: center;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .detail-header h1 {
          font-size: 1.5rem;
          color: #fafafa;
          margin: 0;
        }

        .detail-content {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 2rem;
        }

        .thumbnail-section {
          background: rgba(15, 23, 42, 0.3);
          border-radius: 12px;
          padding: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .large-thumbnail {
          width: 100%;
          aspect-ratio: 16 / 9;
          object-fit: contain;
          border-radius: 8px;
        }

        .thumbnail-placeholder {
          width: 100%;
          aspect-ratio: 16 / 9;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          border: 2px dashed rgba(255, 255, 255, 0.1);
        }

        .thumbnail-placeholder p {
          color: #64748b;
          font-size: 0.875rem;
        }

        .form-section {
          padding: 1.5rem;
          border-radius: 12px;
          height: fit-content;
        }

        .form-section h2 {
          font-size: 1.125rem;
          color: #fafafa;
          margin: 0 0 1.5rem 0;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-group label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #94a3b8;
          margin-bottom: 0.5rem;
        }

        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #fafafa;
          font-size: 0.9375rem;
          padding: 0.625rem 0.75rem;
          outline: none;
          transition: all 0.2s;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          border-color: #ffffff;
          background: rgba(255, 255, 255, 0.05);
        }

        .form-textarea {
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 0.8125rem;
          resize: vertical;
        }

        .form-group small {
          display: block;
          margin-top: 0.25rem;
          font-size: 0.75rem;
          color: #64748b;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }

        @media (max-width: 1024px) {
          .detail-content {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
