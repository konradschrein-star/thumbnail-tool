'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../dashboard/components/layout/DashboardLayout';
import { GoogleSheetsConnect } from './components/GoogleSheetsConnect';
import { SheetPreview } from './components/SheetPreview';
import { BatchProgress } from './components/BatchProgress';
import { ManualUpload } from './components/ManualUpload';
import { Layers, FileSpreadsheet, Upload, History } from 'lucide-react';

export default function BulkOperationsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'sheets' | 'manual' | 'history'>('sheets');
  const [isConnected, setIsConnected] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Loading batch generation...</p>
        <style jsx>{`
          .loading-container {
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #09090b;
            color: #a1a1aa;
          }
          .loader {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top-color: #ffffff;
            border-radius: 50%;
            animation: spin 1s ease-in-out infinite;
            margin-bottom: 1rem;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="header-icon">
          <Layers size={32} />
        </div>
        <div>
          <h1 className="page-title">Batch Generation</h1>
          <p className="page-description">Generate multiple thumbnails efficiently using Google Sheets or manual uploads</p>
        </div>
      </div>

      <div className="tab-nav">
        <button
          onClick={() => setActiveTab('sheets')}
          className={`tab-button ${activeTab === 'sheets' ? 'active' : ''}`}
        >
          <FileSpreadsheet size={18} />
          <span>Google Sheets</span>
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`tab-button ${activeTab === 'manual' ? 'active' : ''}`}
        >
          <Upload size={18} />
          <span>Manual Upload</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
        >
          <History size={18} />
          <span>Batch History</span>
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'sheets' && (
          <div className="content-section">
            <GoogleSheetsConnect
              isConnected={isConnected}
              onConnected={() => setIsConnected(true)}
            />
            {isConnected && (
              <>
                <SheetPreview onBatchCreated={(batchId) => {
                  setSelectedBatchId(batchId);
                  setActiveTab('history');
                }} />
                <BatchProgress batchId={selectedBatchId} />
              </>
            )}
          </div>
        )}

        {activeTab === 'manual' && (
          <div className="content-section">
            <ManualUpload />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="content-section">
            <BatchProgress batchId={selectedBatchId} />
          </div>
        )}
      </div>

      <style jsx>{`
        .page-header {
          display: flex;
          align-items: flex-start;
          gap: 1.5rem;
          margin-bottom: 2.5rem;
          animation: slideUp 0.5s ease-out;
        }

        .header-icon {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          flex-shrink: 0;
        }

        .page-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 0.5rem 0;
          letter-spacing: -0.02em;
          font-family: var(--font-outfit);
        }

        .page-description {
          font-size: 1rem;
          color: #a1a1aa;
          margin: 0;
          line-height: 1.5;
        }

        .tab-nav {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 14px;
          animation: slideUp 0.6s ease-out;
        }

        .tab-button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          background: transparent;
          border: none;
          border-radius: 10px;
          color: #71717a;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .tab-button:hover {
          color: #a1a1aa;
          background: rgba(255, 255, 255, 0.03);
        }

        .tab-button.active {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .tab-content {
          animation: slideUp 0.4s ease-out;
        }

        .content-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            gap: 1rem;
          }

          .page-title {
            font-size: 2rem;
          }

          .tab-nav {
            flex-direction: column;
          }

          .tab-button {
            justify-content: flex-start;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
