'use client';

import { FileSpreadsheet, Code, Download } from 'lucide-react';

export function UploadGuide() {
  const csvExample = `channelId,archetypeId,videoTopic,thumbnailText,customPrompt
cm4abcd1234,cm5efgh5678,How to Code React,REACT TIPS,
cm4abcd1234,cm5efgh5678,Python Tutorial 2024,PYTHON PRO,Add bright colors
cm4abcd1234,cm5efgh5678,JavaScript ES2024,JS MASTER,Modern minimalist style`;

  const jsonExample = `[
  {
    "channelId": "cm4abcd1234",
    "archetypeId": "cm5efgh5678",
    "videoTopic": "How to Code React",
    "thumbnailText": "REACT TIPS",
    "customPrompt": ""
  },
  {
    "channelId": "cm4abcd1234",
    "archetypeId": "cm5efgh5678",
    "videoTopic": "Python Tutorial 2024",
    "thumbnailText": "PYTHON PRO",
    "customPrompt": "Add bright colors"
  }
]`;

  const downloadCSVExample = () => {
    const blob = new Blob([csvExample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'thumbnail-batch-example.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const downloadJSONExample = () => {
    const blob = new Blob([jsonExample], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'thumbnail-batch-example.json';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="upload-guide">
      <h3 className="guide-title">
        <FileSpreadsheet size={20} />
        File Format Guide
      </h3>
      <p className="guide-intro">
        Upload a CSV or JSON file with your thumbnail generation data. Each row creates one thumbnail generation job.
      </p>

      <div className="format-sections">
        {/* CSV Format */}
        <div className="format-section">
          <div className="format-header">
            <Code size={18} />
            <h4>CSV Format</h4>
          </div>
          <div className="code-block">
            <pre>{csvExample}</pre>
          </div>
          <button onClick={downloadCSVExample} className="btn-download">
            <Download size={16} />
            Download CSV Example
          </button>
        </div>

        {/* JSON Format */}
        <div className="format-section">
          <div className="format-header">
            <Code size={18} />
            <h4>JSON Format</h4>
          </div>
          <div className="code-block">
            <pre>{jsonExample}</pre>
          </div>
          <button onClick={downloadJSONExample} className="btn-download">
            <Download size={16} />
            Download JSON Example
          </button>
        </div>
      </div>

      {/* Field Descriptions */}
      <div className="field-descriptions">
        <h4>Field Descriptions</h4>
        <table className="field-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Required</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>channelId</code></td>
              <td><span className="required">Yes</span></td>
              <td>The ID of your channel. Find this in the Channels tab.</td>
            </tr>
            <tr>
              <td><code>archetypeId</code></td>
              <td><span className="required">Yes</span></td>
              <td>The ID of the archetype/style to use. Find this in the Archetypes tab.</td>
            </tr>
            <tr>
              <td><code>videoTopic</code></td>
              <td><span className="required">Yes</span></td>
              <td>Brief description of the video content (max 200 characters).</td>
            </tr>
            <tr>
              <td><code>thumbnailText</code></td>
              <td><span className="required">Yes</span></td>
              <td>The text to display on the thumbnail (max 100 characters).</td>
            </tr>
            <tr>
              <td><code>customPrompt</code></td>
              <td><span className="optional">Optional</span></td>
              <td>Additional instructions for the AI (e.g., "Add bright colors", "Dark theme").</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Limits */}
      <div className="limits-section">
        <h4>Limits & Restrictions</h4>
        <ul className="limits-list">
          <li><strong>Max file size:</strong> 1MB</li>
          <li><strong>Max rows:</strong> 500 thumbnails per upload</li>
          <li><strong>Supported formats:</strong> .csv, .json</li>
          <li><strong>Credits:</strong> 1 credit per thumbnail (same as single generation)</li>
        </ul>
      </div>

      {/* How to Find IDs */}
      <div className="id-help-section">
        <h4>How to Find Channel & Archetype IDs</h4>
        <div className="id-steps">
          <div className="id-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h5>Channel ID</h5>
              <p>Go to <strong>Channels</strong> tab, click on a channel, and copy the ID from the URL or channel details.</p>
            </div>
          </div>
          <div className="id-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h5>Archetype ID</h5>
              <p>Go to <strong>Archetypes</strong> tab, click on an archetype, and copy the ID from the URL or archetype details.</p>
            </div>
          </div>
          <div className="id-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h5>Pro Tip</h5>
              <p>IDs start with "cm" followed by random characters (e.g., cm4abc123def). They're displayed in your browser's address bar.</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .upload-guide {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 2rem;
          margin-top: 2rem;
        }

        .guide-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.25rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 0.75rem 0;
          font-family: var(--font-outfit);
        }

        .guide-intro {
          font-size: 0.95rem;
          color: #a1a1aa;
          margin: 0 0 1.5rem 0;
          line-height: 1.6;
        }

        .format-sections {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .format-section {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1.25rem;
        }

        .format-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .format-header h4 {
          font-size: 1rem;
          font-weight: 600;
          color: #ffffff;
          margin: 0;
        }

        .code-block {
          background: #09090b;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 1rem;
          margin-bottom: 1rem;
          overflow-x: auto;
        }

        .code-block pre {
          margin: 0;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 0.8rem;
          line-height: 1.5;
          color: #22c55e;
          white-space: pre;
        }

        .btn-download {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: rgba(59, 130, 246, 0.15);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 6px;
          color: #60a5fa;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
          justify-content: center;
        }

        .btn-download:hover {
          background: rgba(59, 130, 246, 0.25);
          transform: translateY(-1px);
        }

        .field-descriptions {
          margin-bottom: 2rem;
        }

        .field-descriptions h4 {
          font-size: 1rem;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 1rem 0;
        }

        .field-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          overflow: hidden;
        }

        .field-table th {
          background: rgba(255, 255, 255, 0.05);
          padding: 0.75rem;
          text-align: left;
          font-size: 0.85rem;
          font-weight: 600;
          color: #a1a1aa;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .field-table td {
          padding: 0.875rem 0.75rem;
          font-size: 0.9rem;
          color: #d4d4d8;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .field-table tbody tr:last-child td {
          border-bottom: none;
        }

        .field-table tbody tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .field-table code {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.125rem 0.375rem;
          border-radius: 3px;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 0.85rem;
          color: #22c55e;
        }

        .required {
          display: inline-block;
          padding: 0.125rem 0.5rem;
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .optional {
          display: inline-block;
          padding: 0.125rem 0.5rem;
          background: rgba(161, 161, 170, 0.15);
          color: #a1a1aa;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .limits-section {
          margin-bottom: 2rem;
        }

        .limits-section h4 {
          font-size: 1rem;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 1rem 0;
        }

        .limits-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .limits-list li {
          padding: 0.625rem 1rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          color: #d4d4d8;
        }

        .limits-list li strong {
          color: #ffffff;
        }

        .id-help-section h4 {
          font-size: 1rem;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 1rem 0;
        }

        .id-steps {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .id-step {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: rgba(59, 130, 246, 0.05);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 8px;
        }

        .step-number {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(59, 130, 246, 0.2);
          border-radius: 50%;
          font-weight: 700;
          color: #60a5fa;
        }

        .step-content h5 {
          font-size: 0.9rem;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 0.5rem 0;
        }

        .step-content p {
          font-size: 0.85rem;
          color: #a1a1aa;
          margin: 0;
          line-height: 1.5;
        }

        @media (max-width: 768px) {
          .upload-guide {
            padding: 1.5rem;
          }

          .format-sections,
          .id-steps {
            grid-template-columns: 1fr;
          }

          .code-block pre {
            font-size: 0.7rem;
          }

          .field-table {
            font-size: 0.8rem;
          }

          .field-table th,
          .field-table td {
            padding: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
