'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Archetype {
  id: string;
  name: string;
  imageUrl: string;
  layoutInstructions: string;
  basePrompt?: string | null;
  featuresLogo?: boolean;
  category?: string | null;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  channels?: Array<{
    id: string;
    channelId: string;
    channel: {
      id: string;
      name: string;
    };
  }>;
  // Legacy fields for backward compatibility
  channelId?: string | null;
  channel?: {
    id: string;
    name: string;
  };
}

export interface CreateArchetypeData {
  name: string;
  channelIds?: string[];
  imageUrl: string;
  layoutInstructions: string;
  basePrompt?: string;
  featuresLogo?: boolean;
}

export interface UpdateArchetypeData {
  name?: string;
  imageUrl?: string;
  layoutInstructions?: string;
  basePrompt?: string | null;
  featuresLogo?: boolean;
  channelIds?: string[];
}

export default function useArchetypes(channelId?: string) {
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchArchetypes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const url = channelId ? `/api/archetypes?channelId=${channelId}` : '/api/archetypes';
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch archetypes');
      }

      setArchetypes(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch archetypes');
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  const createArchetype = async (data: CreateArchetypeData): Promise<Archetype> => {
    const response = await fetch('/api/archetypes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create archetype');
    }

    await fetchArchetypes();
    return result.archetype;
  };

  const updateArchetype = async (id: string, data: UpdateArchetypeData): Promise<Archetype> => {
    const response = await fetch(`/api/archetypes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update archetype');
    }

    await fetchArchetypes();
    return result.archetype;
  };

  const deleteArchetype = async (id: string): Promise<void> => {
    const response = await fetch(`/api/archetypes/${id}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete archetype');
    }

    await fetchArchetypes();
  };

  useEffect(() => {
    fetchArchetypes();
  }, [fetchArchetypes]);

  return {
    archetypes,
    loading,
    error,
    refetch: fetchArchetypes,
    createArchetype,
    updateArchetype,
    deleteArchetype,
  };
}
