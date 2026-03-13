'use client';

import { useState, useEffect, useCallback } from 'react';

export interface HistoryJob {
  id: string;
  channelId: string;
  archetypeId: string;
  videoTopic: string;
  thumbnailText: string;
  customPrompt: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outputUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  isManual: boolean;
  channel: {
    id: string;
    name: string;
  };
  archetype: {
    id: string;
    name: string;
    category?: string | null;
    imageUrl: string;
  };
}

export default function useHistory() {
  const [jobs, setJobs] = useState<HistoryJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/history');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch history');
      }

      setJobs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    jobs,
    loading,
    error,
    refetch: fetchHistory,
  };
}
