'use client';

import { useState } from 'react';
import { GoogleSheetsConnect } from './components/GoogleSheetsConnect';
import { SheetPreview } from './components/SheetPreview';
import { BatchProgress } from './components/BatchProgress';
import { ManualUpload } from './components/ManualUpload';

export default function BulkOperationsPage() {
  const [activeTab, setActiveTab] = useState<'sheets' | 'manual' | 'history'>('sheets');
  const [isConnected, setIsConnected] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Bulk Thumbnail Generation</h1>
          <p className="text-slate-400">Generate multiple thumbnails efficiently using Google Sheets or manual uploads</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('sheets')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'sheets'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Google Sheets Integration
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'manual'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Manual Upload
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'history'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Batch History
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'sheets' && (
            <div className="space-y-6">
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
            <div className="space-y-6">
              <ManualUpload />
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <BatchProgress batchId={selectedBatchId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
