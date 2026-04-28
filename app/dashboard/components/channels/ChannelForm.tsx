'use client';

import { useState, useEffect } from 'react';
import { Lightbulb } from 'lucide-react';
import Input from '../shared/Input';
import Button from '../shared/Button';
import FileUpload from '../shared/FileUpload';
import type { Channel, CreateChannelData, UpdateChannelData } from '../../hooks/useChannels';

interface ChannelFormProps {
  mode: 'create' | 'edit';
  initialData?: Channel;
  onSubmit: (data: CreateChannelData | UpdateChannelData) => Promise<void>;
  onCancel: () => void;
}

export default function ChannelForm({ mode, initialData, onSubmit, onCancel }: ChannelFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [personaDescription, setPersonaDescription] = useState(initialData?.personaDescription || '');
  const [personaAssetPath, setPersonaAssetPath] = useState(initialData?.personaAssetPath || '');
  const [primaryColor, setPrimaryColor] = useState(initialData?.primaryColor || '#ffffff');
  const [secondaryColor, setSecondaryColor] = useState(initialData?.secondaryColor || '#000000');
  // We store tags as an array internally to work with the UI,
  // but it may come from the DB as a comma-separated string.
  const [tags, setTags] = useState<string[]>(
    initialData?.tags
      ? (typeof initialData.tags === 'string' ? initialData.tags.split(',') : initialData.tags)
      : []
  );
  const [errors, setErrors] = useState<{ name?: string; personaDescription?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setPersonaDescription(initialData.personaDescription);
      setPersonaAssetPath(initialData.personaAssetPath || '');
      setPrimaryColor(initialData.primaryColor || '#ffffff');
      setSecondaryColor(initialData.secondaryColor || '#000000');
      setTags(initialData.tags ? (typeof initialData.tags === 'string' ? initialData.tags.split(',') : initialData.tags) : []);
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: { name?: string; personaDescription?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Channel name is required';
    }

    if (!personaDescription.trim()) {
      newErrors.personaDescription = 'Persona description is required';
    } else if (personaDescription.trim().length < 1000) {
      newErrors.personaDescription = 'Persona description must be at least 200 words (~1000 characters) with 15+ specific physical attributes for consistent character generation';
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
      await onSubmit({
        name: name.trim(),
        personaDescription: personaDescription.trim(),
        personaAssetPath: personaAssetPath || undefined,
        primaryColor,
        secondaryColor,
        tags: tags.join(','), // Always serialize out as comma-separated string
      });
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to save channel');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-container">
      <Input
        label="Channel Name"
        value={name}
        onChange={setName}
        placeholder="e.g., Tech Review Channel"
        maxLength={100}
        required
        error={errors.name}
        disabled={isSubmitting}
      />

      <Input
        label="Persona Description"
        value={personaDescription}
        onChange={setPersonaDescription}
        placeholder="Detailed character description (minimum 50 characters, recommended 200+ words)"
        multiline
        rows={8}
        required
        error={errors.personaDescription}
        disabled={isSubmitting}
        minLength={50}
      />

      <FileUpload
        label="Persona Reference Image (Optional)"
        value={personaAssetPath}
        onChange={setPersonaAssetPath}
        folder="personas"
        onError={(error) => console.error('Persona upload error:', error)}
        helperText="Upload a reference photo to improve character consistency. This image is sent to the AI alongside the text description."
      />

      <div className="branding-section">
        <h3>Branding Tokens (V3)</h3>
        <div className="color-grid">
          <Input
            label="Primary Color"
            type="text"
            value={primaryColor}
            onChange={setPrimaryColor}
            placeholder="#ffffff"
          />
          <Input
            label="Secondary Color"
            type="text"
            value={secondaryColor}
            onChange={setSecondaryColor}
            placeholder="#000000"
          />
        </div>
        <div className="input-group">
          <label>Branding Tags (Comma separated)</label>
          <input
            type="text"
            className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
            value={tags.join(', ')}
            onChange={(e) => setTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
            placeholder="minimal, vibrant, dark, tech..."
          />
          <p className="text-xs text-white/50 mt-1">Comma-separated tokens that influence AI style.</p>
        </div>
      </div>

      <div className="tip-box">
        <div className="tip-icon"><Lightbulb size={16} /></div>
        <p><strong>Pro Tip:</strong> For consistent character generation, include 15+ specific attributes:
          age, hair (style & color), eyes, facial structure, build, clothing, complexion, and lighting.</p>
      </div>

      {submitError && (
        <div className="error-alert">
          {submitError}
        </div>
      )}

      <div className="form-actions">
        <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Channel' : 'Save Changes'}
        </Button>
      </div>

      <style jsx>{`
        .form-container {
          display: flex;
          flex-direction: column;
        }

        .tip-box {
          font-size: 0.8125rem;
          color: var(--muted-foreground);
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          line-height: 1.5;
        }

        .error-alert {
          color: #fca5a5;
          margin-bottom: 1.5rem;
          padding: 0.75rem 1rem;
          background: rgba(127, 29, 29, 0.1);
          border: 1px dotted rgba(127, 29, 29, 0.5);
          border-radius: var(--radius);
          font-size: 0.875rem;
          word-break: break-word;
          white-space: pre-wrap;
        }

        .branding-section {
          margin: 1.5rem 0;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          border-radius: var(--radius);
        }

        .branding-section h3 {
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #ffffff;
        }

        .color-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          margin-top: 0.5rem;
        }
      `}</style>
    </form>
  );
}
