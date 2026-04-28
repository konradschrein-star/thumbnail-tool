'use client';

import { useState } from 'react';

export interface GeneratePayload {
  channelId: string;
  archetypeId: string;
  videoTopic: string;
  thumbnailText: string;
  softwareSubject?: string;
  customPrompt?: string;
  versionCount?: number;
  includeBrandColors?: boolean;
  includePersona?: boolean;
}

export interface JobResult {
  id: string;
  outputUrl: string;
  status: string;
  errorMessage?: string;
  fallbackUsed?: boolean;
  fallbackMessage?: string;
}

export interface GenerateResult {
  success: boolean;
  jobs: JobResult[];
  job: JobResult; // Fallback
}

export default function useGenerate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);

  const generateThumbnail = async (payload: GeneratePayload): Promise<GenerateResult> => {
    setLoading(true);
    setError('');
    setSuccess(false);
    setResult(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setSuccess(true);
      setResult(data);
      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate thumbnail';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setError('');
    setSuccess(false);
    setResult(null);
  };

  return {
    loading,
    error,
    success,
    result,
    generateThumbnail,
    reset,
  };
}
