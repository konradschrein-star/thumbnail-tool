'use client';

import { useState, useEffect, useCallback } from 'react';

export interface HistoryJob {
  id: string;
  channelId: string;
  archetypeId: string;
  videoTopic: string;
  thumbnailText: string;
  customPrompt: string | null;
  promptUsed: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outputUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  isManual: boolean;
  batchJobId?: string | null;
  userId: string | null;
  metadata?: {
    isVariant?: boolean;
    language?: string;
    translationMode?: string;
    originalText?: string;
    [key: string]: any;
  };
  channel: {
    id: string;
    name: string;
    personaDescription: string;
    personaAssetPath: string | null;
    logoAssetPath: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    tags: string | null;
    createdAt: string;
    updatedAt: string;
    userId: string | null;
  };
  archetype: {
    id: string;
    name: string;
    category: string | null;
    imageUrl: string;
    layoutInstructions: string;
    basePrompt: string | null;
    isAdminOnly: boolean;
    createdAt: string;
    updatedAt: string;
    userId: string | null;
  };
}

interface UseHistoryOptions {
  type?: string;
  status?: string;
}

export default function useHistory(options?: UseHistoryOptions) {
  const [jobs, setJobs] = useState<HistoryJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (options?.type) params.append('type', options.type);
      if (options?.status) params.append('status', options.status);

      const url = `/api/history${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
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
  }, [options?.type, options?.status]);

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
