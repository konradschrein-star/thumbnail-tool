'use client';

import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Eye, Download } from 'lucide-react';
import Papa from 'papaparse';
import { useRouter } from 'next/navigation';
import { UploadGuide } from './UploadGuide';
import { ChannelArchetypeReference } from './ChannelArchetypeReference';

interface UploadRow {
  channelId: string;
  archetypeId: string;
  videoTopic: string;
  thumbnailText: string;
  customPrompt?: string;
}

export function ManualUpload() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<UploadRow[]>([]);
  const [batchName, setBatchName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ batchId: string; jobCount: number } | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleFileSelect = async (selectedFile: File) => {
    setError(null);
    setSuccess(null);

    // Validate file type
    const fileName = selectedFile.name.toLowerCase();
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.json')) {
      setError('Only CSV and JSON files are supported');
      return;
    }

    // Validate file size (1MB)
    if (selectedFile.size > 1 * 1024 * 1024) {
      setError(`File too large (${Math.round(selectedFile.size / 1024)}KB). Maximum 1MB allowed.`);
      return;
    }

    setFile(selectedFile);

    // Parse and preview file
    try {
      const fileText = await selectedFile.text();

      if (!fileText.trim()) {
        setError('File is empty');
        setFile(null);
        return;
      }

      let rows: UploadRow[];

      if (fileName.endsWith('.csv')) {
        const parsed = Papa.parse<UploadRow>(fileText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
        });

        if (parsed.errors.length > 0) {
          setError(`CSV parse error: ${parsed.errors[0].message}`);
          setFile(null);
          return;
        }

        rows = parsed.data;
      } else {
        const jsonData = JSON.parse(fileText);
        if (!Array.isArray(jsonData)) {
          setError('JSON must be an array of objects');
          setFile(null);
          return;
        }
        rows = jsonData;
      }

      if (rows.length === 0) {
        setError('File contains no valid rows');
        setFile(null);
        return;
      }

      if (rows.length > 500) {
        setError(`Too many rows (${rows.length}). Maximum 500 allowed.`);
        setFile(null);
        return;
      }

      // Show first 10 rows for preview
      setPreviewData(rows.slice(0, 10));

      // Auto-generate batch name from filename
      if (!batchName) {
        const nameWithoutExt = selectedFile.name.replace(/\.(csv|json)$/i, '');
        setBatchName(nameWithoutExt);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !batchName.trim()) {
      setError('Please provide a file and batch name');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('batchName', batchName.trim());

      const response = await fetch('/api/batch/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setSuccess({
        batchId: data.batchJobId,
        jobCount: data.jobCount,
      });

      // Clear form
      setFile(null);
      setPreviewData([]);
      setBatchName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleViewBatch = () => {
    // Navigate to bulk page history tab (it will refresh and show the new batch)
    router.push('/bulk?tab=history');
  };

  return (
    <div className="card">
      <div className="header">
        <div className="icon-wrapper">
          <Upload size={32} />
        </div>
        <h2 className="title">Manual Upload</h2>
        <p className="description">
          Upload a CSV or JSON file with thumbnail generation data
        </p>
      </div>

      {success ? (
        <div className="success-state">
          <CheckCircle size={48} className="success-icon" />
          <h3 className="success-title">Batch Queued Successfully!</h3>
          <p className="success-message">
            {success.jobCount} thumbnail{success.jobCount !== 1 ? 's' : ''} queued for generation
          </p>
          <div className="button-group">
            <button onClick={handleViewBatch} className="btn-primary">
              <Eye size={18} />
              View Batch
            </button>
            <button
              onClick={() => setSuccess(null)}
              className="btn-secondary"
            >
              Upload Another
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Upload Area */}
          <div
            className={`upload-area ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
            <FileSpreadsheet size={40} className="file-icon" />
            {file ? (
              <>
                <p className="file-name">{file.name}</p>
                <p className="file-size">{Math.round(file.size / 1024)}KB</p>
              </>
            ) : (
              <>
                <p className="upload-text">Drop your file here or click to browse</p>
                <p className="upload-hint">CSV or JSON • Max 1MB • Up to 500 rows</p>
              </>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Preview Table */}
          {previewData.length > 0 && (
            <div className="preview-section">
              <h3 className="preview-title">
                Preview (showing first {previewData.length} rows)
              </h3>
              <div className="table-wrapper">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Channel ID</th>
                      <th>Archetype ID</th>
                      <th>Video Topic</th>
                      <th>Thumbnail Text</th>
                      <th>Custom Prompt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, idx) => (
                      <tr key={idx}>
                        <td>{row.channelId || <span className="missing">-</span>}</td>
                        <td>{row.archetypeId || <span className="missing">-</span>}</td>
                        <td>{row.videoTopic || <span className="missing">-</span>}</td>
                        <td>{row.thumbnailText || <span className="missing">-</span>}</td>
                        <td>{row.customPrompt || <span className="empty">-</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Batch Name Input */}
          {file && (
            <div className="form-section">
              <label className="label">Batch Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., January Thumbnails"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
              />
            </div>
          )}

          {/* Upload Button */}
          {file && (
            <button
              onClick={handleUpload}
              disabled={uploading || !batchName.trim()}
              className="btn-upload"
            >
              {uploading ? (
                <>
                  <Loader2 size={20} className="spinner" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  Upload & Queue Batch
                </>
              )}
            </button>
          )}

        </>
      )}

      {/* Comprehensive Upload Guide */}
      <UploadGuide />

      {/* Channel & Archetype IDs Reference */}
      <ChannelArchetypeReference />

      <style jsx>{`
        .card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 2rem;
        }

        .header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .icon-wrapper {
          width: 64px;
          height: 64px;
          margin: 0 auto 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #71717a;
        }

        .title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 0.5rem 0;
          font-family: var(--font-outfit);
          letter-spacing: -0.02em;
        }

        .description {
          font-size: 0.95rem;
          color: #a1a1aa;
          margin: 0;
        }

        .upload-area {
          background: rgba(255, 255, 255, 0.02);
          border: 2px dashed rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 2.5rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 1.5rem;
        }

        .upload-area:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .upload-area.dragging {
          background: rgba(59, 130, 246, 0.1);
          border-color: #3b82f6;
        }

        .upload-area.has-file {
          background: rgba(34, 197, 94, 0.05);
          border-color: rgba(34, 197, 94, 0.3);
        }

        .file-icon {
          color: #71717a;
          margin: 0 auto 1rem;
        }

        .upload-text {
          font-size: 1rem;
          font-weight: 500;
          color: #ffffff;
          margin: 0 0 0.5rem 0;
        }

        .upload-hint {
          font-size: 0.875rem;
          color: #71717a;
          margin: 0;
        }

        .file-name {
          font-size: 1rem;
          font-weight: 600;
          color: #22c55e;
          margin: 0 0 0.25rem 0;
        }

        .file-size {
          font-size: 0.875rem;
          color: #71717a;
          margin: 0;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
        }

        .alert-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
        }

        .preview-section {
          margin-bottom: 1.5rem;
        }

        .preview-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 0.75rem 0;
        }

        .table-wrapper {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .preview-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }

        .preview-table thead {
          background: rgba(255, 255, 255, 0.05);
        }

        .preview-table th {
          padding: 0.75rem;
          text-align: left;
          font-weight: 600;
          color: #a1a1aa;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .preview-table td {
          padding: 0.75rem;
          color: #d4d4d8;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .preview-table tbody tr:last-child td {
          border-bottom: none;
        }

        .preview-table tbody tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .missing {
          color: #ef4444;
          font-weight: 600;
        }

        .empty {
          color: #52525b;
        }

        .form-section {
          margin-bottom: 1.5rem;
        }

        .label {
          display: block;
          font-size: 0.9rem;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 0.5rem;
        }

        .input {
          width: 100%;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #ffffff;
          font-size: 0.95rem;
          transition: all 0.2s;
        }

        .input:focus {
          outline: none;
          border-color: #3b82f6;
          background: rgba(255, 255, 255, 0.08);
        }

        .input::placeholder {
          color: #52525b;
        }

        .btn-upload {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border: none;
          border-radius: 8px;
          color: #ffffff;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 1.5rem;
        }

        .btn-upload:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
        }

        .btn-upload:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .format-info-box {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 1.25rem;
        }

        .format-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 0.75rem 0;
        }

        .format-examples {
          margin-bottom: 0.75rem;
        }

        .format-example {
          margin-bottom: 0.5rem;
        }

        .format-example strong {
          color: #a1a1aa;
          font-size: 0.85rem;
        }

        .format-example code {
          display: block;
          margin-top: 0.25rem;
          padding: 0.5rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          color: #22c55e;
          font-size: 0.8rem;
          overflow-x: auto;
        }

        .format-note {
          font-size: 0.85rem;
          color: #71717a;
          margin: 0;
          line-height: 1.6;
        }

        .success-state {
          text-align: center;
          padding: 3rem 2rem;
        }

        .success-icon {
          color: #22c55e;
          margin: 0 auto 1.5rem;
        }

        .success-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 0.5rem 0;
        }

        .success-message {
          font-size: 1rem;
          color: #a1a1aa;
          margin: 0 0 2rem 0;
        }

        .button-group {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .btn-primary,
        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: #ffffff;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        @media (max-width: 768px) {
          .card {
            padding: 1.5rem;
          }

          .title {
            font-size: 1.5rem;
          }

          .upload-area {
            padding: 2rem 1.5rem;
          }

          .button-group {
            flex-direction: column;
          }

          .preview-table {
            font-size: 0.75rem;
          }

          .preview-table th,
          .preview-table td {
            padding: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
