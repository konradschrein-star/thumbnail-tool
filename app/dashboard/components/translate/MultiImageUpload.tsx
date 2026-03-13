'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

interface MultiImageUploadProps {
  onUploadComplete: (urls: string[]) => void;
  maxImages?: number;
}

export default function MultiImageUpload({ onUploadComplete, maxImages = 5 }: MultiImageUploadProps) {
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // File type validation
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return `${file.name}: Invalid file type. Only JPG, PNG, and WEBP are allowed.`;
    }

    // File size validation (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return `${file.name}: File too large. Maximum size is 5MB.`;
    }

    return null;
  };

  const uploadSingleFile = async (file: File, retries = 3): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'translate-temp');

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Upload failed');
        }

        const data = await response.json();
        return data.url;
      } catch (err: any) {
        if (attempt === retries - 1) throw err;
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }

    throw new Error('Upload failed after retries');
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const availableSlots = maxImages - uploadedUrls.length;
    if (availableSlots <= 0) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    const fileArray = Array.from(files).slice(0, availableSlots);

    // Validate all files first
    const validationErrors: string[] = [];
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) validationErrors.push(error);
    }

    if (validationErrors.length > 0) {
      setError(validationErrors.join(' '));
      return;
    }

    setUploading(true);
    setError('');

    const uploadPromises = fileArray.map(async (file) => {
      const fileId = `${file.name}_${Date.now()}`;
      setUploadProgress(prev => ({ ...prev, [fileId]: true }));

      try {
        const url = await uploadSingleFile(file);
        setUploadProgress(prev => ({ ...prev, [fileId]: false }));
        return { success: true, url };
      } catch (err: any) {
        setUploadProgress(prev => ({ ...prev, [fileId]: false }));
        return { success: false, error: `${file.name}: ${err.message}` };
      }
    });

    try {
      const results = await Promise.all(uploadPromises);

      const successUrls = results
        .filter((r): r is { success: true; url: string } => r.success)
        .map(r => r.url);

      const errors = results
        .filter((r): r is { success: false; error: string } => !r.success)
        .map(r => r.error);

      if (errors.length > 0) {
        setError(errors.join(' | '));
      }

      if (successUrls.length > 0) {
        const newUrls = [...uploadedUrls, ...successUrls];
        setUploadedUrls(newUrls);
        onUploadComplete(newUrls);
      }
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  const handleRemove = (url: string) => {
    const newUrls = uploadedUrls.filter(u => u !== url);
    setUploadedUrls(newUrls);
    onUploadComplete(newUrls);
    setError('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="multi-upload">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={(e) => handleFileSelect(e.target.files)}
        style={{ display: 'none' }}
      />

      <div className="upload-grid">
        {uploadedUrls.map((url, index) => (
          <div key={url} className="preview-item">
            <img src={url} alt={`Uploaded ${index + 1}`} />
            <button
              onClick={() => handleRemove(url)}
              className="remove-btn"
              disabled={uploading}
              title="Remove image"
            >
              <X size={16} />
            </button>
          </div>
        ))}

        {uploadedUrls.length < maxImages && (
          <div
            className="upload-slot"
            onClick={() => !uploading && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {uploading ? (
              <>
                <Loader2 className="animate-spin" size={32} />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload size={32} />
                <span>Add Image</span>
                <span className="hint">Click or drag & drop</span>
              </>
            )}
          </div>
        )}
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="upload-info">
        <ImageIcon size={14} />
        <span>
          {uploadedUrls.length}/{maxImages} images • JPG, PNG, WEBP • Max 5MB each
        </span>
      </div>

      <style jsx>{`
        .multi-upload {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .upload-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 1rem;
        }

        .preview-item {
          position: relative;
          aspect-ratio: 16 / 9;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: rgba(0, 0, 0, 0.3);
        }

        .preview-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .remove-btn {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          color: #fff;
          cursor: pointer;
          transition: all 0.2s;
          opacity: 0;
        }

        .preview-item:hover .remove-btn {
          opacity: 1;
        }

        .remove-btn:hover:not(:disabled) {
          background: #ef4444;
          border-color: #ef4444;
        }

        .remove-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .upload-slot {
          aspect-ratio: 16 / 9;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          border: 2px dashed var(--border);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.02);
          cursor: pointer;
          transition: all 0.2s;
          color: var(--muted-foreground);
        }

        .upload-slot:hover {
          border-color: #52525b;
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
        }

        .upload-slot span {
          font-size: 0.875rem;
          font-weight: 500;
        }

        .upload-slot .hint {
          font-size: 0.75rem;
          font-weight: 400;
          opacity: 0.7;
        }

        .error-text {
          font-size: 0.875rem;
          color: #ef4444;
          padding: 0.75rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 6px;
        }

        .upload-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: var(--muted-foreground);
          padding: 0.5rem 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
}
