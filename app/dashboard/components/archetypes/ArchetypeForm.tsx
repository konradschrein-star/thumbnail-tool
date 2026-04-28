'use client';

import { useState, useEffect } from 'react';
import { Lightbulb, X } from 'lucide-react';
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
  const [channelIds, setChannelIds] = useState<string[]>(() => {
    // Extract channel IDs from initial data
    if (initialData?.channels && Array.isArray(initialData.channels)) {
      return initialData.channels.map((c: any) => c.channel?.id || c.channelId).filter(Boolean);
    }
    return preselectedChannelId ? [preselectedChannelId] : [];
  });
  const [selectedChannelToAdd, setSelectedChannelToAdd] = useState('');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [layoutInstructions, setLayoutInstructions] = useState(
    initialData?.layoutInstructions || ''
  );
  const [basePrompt, setBasePrompt] = useState(
    initialData?.basePrompt || ''
  );
  const [featuresLogo, setFeaturesLogo] = useState(initialData?.featuresLogo || false);
  const [errors, setErrors] = useState<{
    name?: string;
    channels?: string;
    imageUrl?: string;
    layoutInstructions?: string;
    basePrompt?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const addChannel = (channelId: string) => {
    if (channelId && !channelIds.includes(channelId)) {
      setChannelIds([...channelIds, channelId]);
      setSelectedChannelToAdd('');
    }
  };

  const removeChannel = (channelId: string) => {
    setChannelIds(channelIds.filter(id => id !== channelId));
  };

  useEffect(() => {
    if (initialData) {
      setName(initialData.name ?? '');
      setImageUrl(initialData.imageUrl ?? '');
      setLayoutInstructions(initialData.layoutInstructions ?? '');
      setBasePrompt(initialData.basePrompt ?? '');
      setFeaturesLogo(initialData.featuresLogo || false);
      // Extract channel IDs from initial data
      if (initialData.channels && Array.isArray(initialData.channels)) {
        const ids = initialData.channels.map((c: any) => c.channel?.id || c.channelId).filter(Boolean);
        setChannelIds(ids);
      }
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: any = {};

    if (!name.trim()) {
      newErrors.name = 'Archetype name is required';
    }

    // Channels are optional - archetypes can exist without being assigned to channels

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
        basePrompt: basePrompt.trim(),
        featuresLogo: featuresLogo,
        channelIds: channelIds, // Always send channelIds array
      };

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
              Channels
            </label>

            {/* Selected channels as chips */}
            {channelIds.length > 0 && (
              <div className="channel-chips">
                {channelIds.map(id => {
                  const channel = channels.find(c => c.id === id);
                  return channel ? (
                    <div key={id} className="channel-chip">
                      <span>{channel.name}</span>
                      <button
                        type="button"
                        onClick={() => removeChannel(id)}
                        className="chip-remove"
                        disabled={isSubmitting}
                        title="Remove channel"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            )}

            {/* Dropdown to add channels */}
            <select
              value={selectedChannelToAdd}
              onChange={(e) => {
                addChannel(e.target.value);
              }}
              disabled={isSubmitting}
              className="form-select"
              title="Add Channel"
            >
              <option value="">+ Add channel...</option>
              {channels
                .filter(ch => !channelIds.includes(ch.id))
                .map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
            </select>
            {errors.channels && (
              <div className="error-text">{errors.channels}</div>
            )}
            <p className="help-text">Assign this archetype to one or more channels</p>
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
            label="Layout Instructions (Visual reference mapping)"
            value={layoutInstructions}
            onChange={setLayoutInstructions}
            placeholder="Describe the layout, text placement, style, etc."
            multiline
            rows={4}
            required
            error={errors.layoutInstructions}
            disabled={isSubmitting}
          />

          <Input
            label="Base Prompt (Vibe / Global AI Style)"
            value={basePrompt}
            onChange={setBasePrompt}
            placeholder="e.g. 'Give the image a striking, attention-grabbing vibe with bold, intense lighting.' (Optional)"
            multiline
            rows={4}
            disabled={isSubmitting}
          />

          <div className="checkbox-container">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={featuresLogo}
                onChange={(e) => setFeaturesLogo(e.target.checked)}
                disabled={isSubmitting}
                className="custom-checkbox"
              />
              <span className="checkbox-text">Features Replaceable Logo</span>
            </label>
            <p className="help-text">
              Check if this archetype includes a software/platform logo that should be replaced based on video topic
            </p>
          </div>
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

        .channel-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .channel-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.75rem;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          font-size: 0.875rem;
          color: var(--foreground);
          transition: all 0.2s ease;
        }

        .channel-chip:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        .chip-remove {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          background: none;
          border: none;
          color: var(--muted-foreground);
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .chip-remove:hover {
          color: #ef4444;
        }

        .chip-remove:disabled {
          cursor: not-allowed;
          opacity: 0.5;
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
