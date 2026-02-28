'use client';

import { useState, useEffect } from 'react';
import { Lightbulb } from 'lucide-react';
import Input from '../shared/Input';
import Button from '../shared/Button';
import FileUpload from '../shared/FileUpload';
import useChannels from '../../hooks/useChannels';
import type { Archetype, CreateArchetypeData, UpdateArchetypeData } from '../../hooks/useArchetypes';

interface ArchetypeFormProps {
  mode: 'create' | 'edit';
  initialData?: Archetype;
  preselectedChannelId?: string;
  onSubmit: (data: CreateArchetypeData | UpdateArchetypeData) => Promise<void>;
  onCancel: () => void;
}

export default function ArchetypeForm({
  mode,
  initialData,
  preselectedChannelId,
  onSubmit,
  onCancel,
}: ArchetypeFormProps) {
  const { channels } = useChannels();
  const [name, setName] = useState(initialData?.name || '');
  const [channelId, setChannelId] = useState(
    initialData?.channelId || preselectedChannelId || ''
  );
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [layoutInstructions, setLayoutInstructions] = useState(
    initialData?.layoutInstructions || ''
  );
  const [errors, setErrors] = useState<{
    name?: string;
    channelId?: string;
    imageUrl?: string;
    layoutInstructions?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name ?? '');
      setChannelId(initialData.channelId ?? '');
      setImageUrl(initialData.imageUrl ?? '');
      setLayoutInstructions(initialData.layoutInstructions ?? '');
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: any = {};

    if (!name.trim()) {
      newErrors.name = 'Archetype name is required';
    }

    if (!channelId) {
      newErrors.channelId = 'Channel is required';
    }

    if (!imageUrl.trim()) {
      newErrors.imageUrl = 'Image is required';
    }

    if (!layoutInstructions.trim()) {
      newErrors.layoutInstructions = 'Layout instructions are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const data: any = {
        name: name.trim(),
        imageUrl: imageUrl.trim(),
        layoutInstructions: layoutInstructions.trim(),
      };

      if (mode === 'create') {
        data.channelId = channelId;
      }

      await onSubmit(data);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to save archetype');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-container">
      <div className="form-grid">
        <div className="form-column">
          <div className="input-field-group">
            <label className="field-label">
              Channel <span className="required">*</span>
            </label>
            <select
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              disabled={mode === 'edit' || isSubmitting}
              className={`form-select ${errors.channelId ? 'has-error' : ''}`}
              title="Select Channel"
            >
              <option value="">Select a channel</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
            {errors.channelId && (
              <div className="error-text">{errors.channelId}</div>
            )}
            {mode === 'edit' && (
              <p className="help-text">Channel cannot be changed after creation.</p>
            )}
          </div>

          <Input
            label="Archetype Name"
            value={name}
            onChange={setName}
            placeholder="e.g., Bold Title Centered"
            required
            error={errors.name}
            disabled={isSubmitting}
          />

          <Input
            label="Layout Instructions"
            value={layoutInstructions}
            onChange={setLayoutInstructions}
            placeholder="Describe the layout, text placement, style, etc."
            multiline
            rows={6}
            required
            error={errors.layoutInstructions}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-column">
          <FileUpload
            label="Reference Image"
            value={imageUrl}
            onChange={setImageUrl}
            folder="archetypes"
            required
            onError={(error) => setErrors({ ...errors, imageUrl: error })}
          />
          {errors.imageUrl && !imageUrl && (
            <div className="error-text">{errors.imageUrl}</div>
          )}

          <div className="tip-box">
            <div className="tip-icon"><Lightbulb size={16} /></div>
            <p><strong>Pro Tip:</strong> Use high-quality reference images that clearly show font styles
              and element placements. The AI uses this as a visual anchor.</p>
          </div>
        </div>
      </div>

      {submitError && <div className="error-alert">{submitError}</div>}

      <div className="form-actions">
        <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Archetype' : 'Save Changes'}
        </Button>
      </div>

      <style jsx>{`
        .form-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 2rem;
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }

        .form-column {
          display: flex;
          flex-direction: column;
        }

        .input-field-group {
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .field-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--muted-foreground);
        }

        .required {
          color: #ef4444;
          margin-left: 0.25rem;
        }

        .form-select {
          width: 100%;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--foreground);
          font-family: inherit;
          font-size: 0.875rem;
          transition: all 0.2s ease;
          outline: none;
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717a' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          background-size: 1.25rem;
        }

        .form-select option {
          background-color: #09090b;
          color: #fafafa;
        }

        .form-select:focus {
          border-color: #52525b;
          background-color: rgba(255, 255, 255, 0.05);
        }

        .form-select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background-color: rgba(255, 255, 255, 0.01);
        }

        .form-select.has-error {
          border-color: #ef4444;
        }

        .error-text {
          font-size: 0.75rem;
          color: #ef4444;
        }

        .help-text {
          font-size: 0.75rem;
          color: var(--muted-foreground);
          margin: 0;
        }

        .tip-box {
          font-size: 0.8125rem;
          color: var(--muted-foreground);
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          line-height: 1.5;
          margin-top: auto;
        }

        .error-alert {
          color: #fca5a5;
          padding: 0.75rem 1rem;
          background: rgba(127, 29, 29, 0.1);
          border: 1px dotted rgba(127, 29, 29, 0.5);
          border-radius: var(--radius);
          font-size: 0.875rem;
        }

        .form-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
        }
      `}</style>
    </form>
  );
}
