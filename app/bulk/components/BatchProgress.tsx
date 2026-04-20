'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, Loader, XCircle, Download } from 'lucide-react';

interface BatchJob {
  id: string;
  name: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  outputZipUrl?: string;
  createdAt: string;
  updatedAt: string;
  jobs: Array<{
    id: string;
    status: string;
    outputUrl?: string;
    errorMessage?: string;
    videoTopic: string;
    thumbnailText: string;
    completedAt?: string;
  }>;
  jobsByStatus: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  progressPercentage: number;
}

interface BatchProgressProps {
  batchId: string | null;
}

export function BatchProgress({ batchId }: BatchProgressProps) {
  const [batchJob, setBatchJob] = useState<BatchJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (!batchId) return;

    const fetchStatus = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/batch/status?batchJobId=${batchId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch batch status');
        }

        const data = await response.json();
        setBatchJob(data.data);

        // Auto-enable refresh if still processing
        if (['PENDING', 'PROCESSING'].includes(data.data.status)) {
          setAutoRefresh(true);
        } else {
          setAutoRefresh(false);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch batch status');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    // Auto-refresh every 5 seconds if processing
    const interval = autoRefresh
      ? setInterval(fetchStatus, 5000)
      : undefined;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [batchId, autoRefresh]);

  if (!batchId) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center">
        <p className="text-slate-400">Select a batch job to view progress</p>
      </div>
    );
  }

  if (loading && !batchJob) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 flex items-center justify-center">
        <Loader className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (error && !batchJob) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!batchJob) return null;

  const statusColors = {
    PENDING: 'bg-yellow-900/20 text-yellow-300 border-yellow-800',
    PROCESSING: 'bg-blue-900/20 text-blue-300 border-blue-800',
    COMPLETED: 'bg-green-900/20 text-green-300 border-green-800',
    FAILED: 'bg-red-900/20 text-red-300 border-red-800',
    PARTIAL: 'bg-orange-900/20 text-orange-300 border-orange-800',
  };

  const statusIcon = {
    PENDING: <Clock className="w-5 h-5" />,
    PROCESSING: <Loader className="w-5 h-5 animate-spin" />,
    COMPLETED: <CheckCircle className="w-5 h-5" />,
    FAILED: <XCircle className="w-5 h-5" />,
    PARTIAL: <AlertCircle className="w-5 h-5" />,
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{batchJob.name}</h2>
              <p className="text-slate-400 text-sm">
                Created {new Date(batchJob.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${statusColors[batchJob.status]}`}>
              {statusIcon[batchJob.status]}
              <span className="font-medium">{batchJob.status}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Overall Progress</p>
              <p className="text-sm font-medium text-white">{batchJob.progressPercentage}%</p>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-400 h-full transition-all"
                style={{ width: `${batchJob.progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">Total Jobs</p>
            <p className="text-2xl font-bold text-white">{batchJob.totalJobs}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">Completed</p>
            <p className="text-2xl font-bold text-green-400">{batchJob.completedJobs}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">Failed</p>
            <p className="text-2xl font-bold text-red-400">{batchJob.failedJobs}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">Processing</p>
            <p className="text-2xl font-bold text-blue-400">{batchJob.jobsByStatus.processing}</p>
          </div>
        </div>

        {/* Download Button */}
        {batchJob.status === 'COMPLETED' && batchJob.outputZipUrl && (
          <a
            href={batchJob.outputZipUrl}
            download
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download All Thumbnails
          </a>
        )}
      </div>

      {/* Job Details Table */}
      {batchJob.jobs.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="font-bold text-white">Job Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-300 font-medium">Topic</th>
                  <th className="px-4 py-3 text-left text-slate-300 font-medium">Text</th>
                  <th className="px-4 py-3 text-left text-slate-300 font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-slate-300 font-medium">Completed</th>
                </tr>
              </thead>
              <tbody>
                {batchJob.jobs.slice(0, 10).map((job) => (
                  <tr key={job.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-slate-300 truncate">{job.videoTopic}</td>
                    <td className="px-4 py-3 text-slate-300 truncate">{job.thumbnailText}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          job.status === 'completed'
                            ? 'bg-green-900/30 text-green-300'
                            : job.status === 'failed'
                              ? 'bg-red-900/30 text-red-300'
                              : job.status === 'processing'
                                ? 'bg-blue-900/30 text-blue-300'
                                : 'bg-slate-600 text-slate-300'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">
                      {job.completedAt
                        ? new Date(job.completedAt).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {batchJob.jobs.length > 10 && (
            <div className="px-6 py-3 border-t border-slate-700 text-sm text-slate-400">
              Showing 10 of {batchJob.jobs.length} jobs
            </div>
          )}
        </div>
      )}
    </div>
  );
}
