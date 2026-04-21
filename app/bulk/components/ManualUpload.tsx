'use client';

import { Upload, FileSpreadsheet } from 'lucide-react';

export function ManualUpload() {
  return (
    <div className="card">
      <div className="empty-state">
        <div className="icon-wrapper">
          <Upload size={48} />
        </div>
        <h2 className="title">Manual Upload</h2>
        <p className="description">
          Upload a CSV or JSON file with thumbnail generation data to create a batch job
        </p>

        <div className="upload-area">
          <FileSpreadsheet size={32} className="file-icon" />
          <p className="coming-soon">Coming Soon</p>
          <p className="format-info">
            Expected CSV format: channelId, archetypeId, videoTopic, thumbnailText
          </p>
        </div>

        <p className="footnote">
          This feature is currently under development. For now, use Google Sheets integration
          for bulk operations.
        </p>
      </div>

      <style jsx>{`
        .card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 3rem 2rem;
        }

        .empty-state {
          text-align: center;
          max-width: 600px;
          margin: 0 auto;
        }

        .icon-wrapper {
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #71717a;
        }

        .title {
          font-size: 2rem;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 0.75rem 0;
          font-family: var(--font-outfit);
          letter-spacing: -0.02em;
        }

        .description {
          font-size: 1rem;
          color: #a1a1aa;
          margin: 0 0 2.5rem 0;
          line-height: 1.6;
        }

        .upload-area {
          background: rgba(255, 255, 255, 0.02);
          border: 2px dashed rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 3rem 2rem;
          margin-bottom: 2rem;
        }

        .file-icon {
          color: #52525b;
          margin: 0 auto 1.5rem;
        }

        .coming-soon {
          font-size: 1.125rem;
          font-weight: 600;
          color: #71717a;
          margin: 0 0 1rem 0;
        }

        .format-info {
          font-size: 0.875rem;
          color: #52525b;
          margin: 0;
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .footnote {
          font-size: 0.8125rem;
          color: #52525b;
          margin: 0;
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .card {
            padding: 2rem 1.5rem;
          }

          .title {
            font-size: 1.5rem;
          }

          .upload-area {
            padding: 2rem 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
