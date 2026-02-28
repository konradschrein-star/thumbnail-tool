'use client';

import { useState, useRef } from 'react';
import { Upload, Loader2, Image as ImageIcon, X } from 'lucide-react';
import Button from './Button';

interface FileUploadProps {
  label?: string;
  value?: string; // URL of uploaded file
  onChange: (url: string) => void;
  onError?: (error: string) => void;
  folder?: string; // 'archetypes' or 'personas'
  accept?: string;
  maxSizeMB?: number;
  required?: boolean;
}

export default function FileUpload({
  label,
  value,
  onChange,
  onError,
  folder = 'archetypes',
  accept = 'image/jpeg,image/jpg,image/png,image/webp',
  maxSizeMB = 5,
  required = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string>(value || '');
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    const allowedTypes = accept.split(',');
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Only JPG, PNG, and WEBP images are allowed.';
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File too large. Maximum size is ${maxSizeMB}MB.`;
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setPreview(data.url);
      onChange(data.url);
    } catch (err: any) {
      const errorMessage = err.message || 'Upload failed';
      setError(errorMessage);
      if (onError) onError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      if (onError) onError(validationError);
      return;
    }

    await uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileSelect(files[0]);
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileSelect(files[0]);
    }
  };

  const handleClear = () => {
    setPreview('');
    setError('');
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="upload-container">
      {label && (
        <label className="upload-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden-input"
        title="File input"
        aria-hidden="true"
      />

      {preview ? (
        <div
          className={`drop-zone has-preview ${isDragging ? 'dragging' : ''} ${error ? 'has-error' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          aria-label="File preview"
        >
          <div className="preview-container">
            <img src={preview} alt="Preview" className="preview-image" />
            <div className="preview-actions">
              <Button
                size="small"
                variant="secondary"
                onClick={(e) => {
                  e?.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Change
              </Button>
              <Button
                size="small"
                variant="secondary"
                className="remove-btn"
                onClick={(e) => {
                  e?.stopPropagation();
                  handleClear();
                }}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''} ${error ? 'has-error' : ''} ${isUploading ? 'uploading' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          aria-label="Upload file"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              !isUploading && fileInputRef.current?.click();
            }
          }}
        >
          <div className="upload-placeholder">
            <div className="upload-icon">
              {isUploading ? <Loader2 className="animate-spin" size={32} /> : <Upload size={32} />}
            </div>
            <div className="upload-text">
              {isUploading ? (
                <strong>Uploading...</strong>
              ) : (
                <>
                  <strong>Drop image here</strong> or click to browse
                </>
              )}
            </div>
            <div className="upload-meta">
              JPG, PNG, WEBP (max {maxSizeMB}MB)
            </div>
          </div>
        </div>
      )}

      {error && <div className="error-text">{error}</div>}

      <style jsx>{`
        .upload-container {
          margin-bottom: 1.5rem;
        }

        .upload-label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          font-size: 0.875rem;
          color: var(--muted-foreground);
        }

        .required {
          color: #ef4444;
          margin-left: 0.25rem;
        }

        .drop-zone {
          border: 2px dashed var(--border);
          border-radius: var(--radius);
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.02);
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .drop-zone:hover {
          border-color: #52525b;
          background: rgba(255, 255, 255, 0.04);
        }

        .drop-zone.dragging {
          border-color: var(--foreground);
          background: rgba(255, 255, 255, 0.08);
          transform: scale(1.01);
        }

        .drop-zone.has-error {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.05);
        }

        .drop-zone.uploading {
          cursor: wait;
          opacity: 0.7;
        }

        .drop-zone.has-preview {
          cursor: default;
          background: rgba(255, 255, 255, 0.01);
          border-style: solid;
        }

        .preview-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .preview-image {
          max-width: 200px;
          max-height: 200px;
          border-radius: var(--radius);
          object-fit: contain;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .preview-actions {
          display: flex;
          gap: 0.5rem;
        }

        :global(.remove-btn:hover) {
          color: #ef4444 !important;
        }

        .upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .upload-icon {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }

        .upload-text {
          color: var(--foreground);
          font-size: 0.875rem;
        }

        .upload-meta {
          color: var(--muted-foreground);
          font-size: 0.75rem;
        }

        .hidden-input {
          display: none;
        }

        .error-text {
          margin-top: 0.5rem;
          color: #ef4444;
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
}
