'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Channel {
  id: string;
  name: string;
  personaDescription: string;
  personaAssetPath?: string;
  logoAssetPath?: string;
  primaryColor?: string;
  secondaryColor?: string;
  tags?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    archetypes: number;
    generationJobs: number;
  };
}

export interface CreateChannelData {
  name: string;
  personaDescription: string;
  personaAssetPath?: string;
  logoAssetPath?: string;
  primaryColor?: string;
  secondaryColor?: string;
  tags?: string;
}

export interface UpdateChannelData {
  name?: string;
  personaDescription?: string;
  personaAssetPath?: string;
  logoAssetPath?: string;
  primaryColor?: string;
  secondaryColor?: string;
  tags?: string;
}

export default function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/channels');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch channels');
      }

      setChannels(data.channels);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch channels');
    } finally {
      setLoading(false);
    }
  }, []);

  const createChannel = async (data: CreateChannelData): Promise<Channel> => {
    const response = await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create channel');
    }

    await fetchChannels();
    return result.channel;
  };

  const updateChannel = async (id: string, data: UpdateChannelData): Promise<Channel> => {
    const response = await fetch(`/api/channels/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update channel');
    }

    await fetchChannels();
    return result.channel;
  };

  const deleteChannel = async (id: string): Promise<void> => {
    const response = await fetch(`/api/channels/${id}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete channel');
    }

    await fetchChannels();
  };

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  return {
    channels,
    loading,
    error,
    refetch: fetchChannels,
    createChannel,
    updateChannel,
    deleteChannel,
  };
}
