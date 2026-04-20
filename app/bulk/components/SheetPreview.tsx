'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, ChevronDown, Loader, Play } from 'lucide-react';

interface SheetPreviewProps {
  onBatchCreated: (batchId: string) => void;
}

interface SheetData {
  rows: Array<{
    channelId: string;
    archetypeId: string;
    videoTopic: string;
    thumbnailText: string;
  }>;
  totalRows: number;
}

export function SheetPreview({ onBatchCreated }: SheetPreviewProps) {
  const [preview, setPreview] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchPreview = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sheets/preview');
      if (!response.ok) {
        throw new Error('Failed to load preview');
      }

      const data = await response.json();
      setPreview(data);
      setIsExpanded(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch('/api/sheets/sync', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to sync sheet');
      }

      const data = await response.json();
      if (data.batchId) {
        onBatchCreated(data.batchId);
      }
    } catch (err: any) {
      setError(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => {
          if (!isExpanded) {
            fetchPreview();
          } else {
            setIsExpanded(false);
          }
        }}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-white">Sheet Preview</h3>
          {preview && (
            <span className="px-3 py-1 bg-blue-900/50 text-blue-300 rounded-full text-sm">
              {preview.totalRows} rows
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-slate-700 px-6 py-4 space-y-4">
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          ) : preview ? (
            <>
              {/* Preview Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-700/50">
                      <th className="px-4 py-2 text-left text-slate-300 font-medium">Channel</th>
                      <th className="px-4 py-2 text-left text-slate-300 font-medium">Archetype</th>
                      <th className="px-4 py-2 text-left text-slate-300 font-medium">Topic</th>
                      <th className="px-4 py-2 text-left text-slate-300 font-medium">Text</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="border-t border-slate-700">
                        <td className="px-4 py-2 text-slate-300 font-mono text-xs">
                          {row.channelId.substring(0, 8)}...
                        </td>
                        <td className="px-4 py-2 text-slate-300 font-mono text-xs">
                          {row.archetypeId.substring(0, 8)}...
                        </td>
                        <td className="px-4 py-2 text-slate-300 truncate max-w-xs">
                          {row.videoTopic}
                        </td>
                        <td className="px-4 py-2 text-slate-300 truncate max-w-xs">
                          {row.thumbnailText}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {preview.totalRows > 5 && (
                <p className="text-sm text-slate-400">
                  Showing 5 of {preview.totalRows} rows
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={fetchPreview}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  Refresh
                </button>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {syncing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Start Generation
                    </>
                  )}
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
