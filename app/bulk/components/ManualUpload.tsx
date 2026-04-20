'use client';

import { Upload } from 'lucide-react';

export function ManualUpload() {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <div className="text-center py-12">
        <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Manual Upload</h2>
        <p className="text-slate-400 mb-6">
          Upload a CSV file with thumbnail generation data to create a batch job
        </p>

        <div className="bg-slate-700/50 rounded-lg p-8 border-2 border-dashed border-slate-600">
          <p className="text-slate-400 mb-4">Coming soon</p>
          <p className="text-sm text-slate-500">
            CSV format: channelId, archetypeId, videoTopic, thumbnailText
          </p>
        </div>

        <p className="text-xs text-slate-500 mt-6">
          This feature is currently under development. For now, use Google Sheets integration
          for bulk operations.
        </p>
      </div>
    </div>
  );
}
