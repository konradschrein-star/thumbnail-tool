'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Archetype {
  id: string;
  name: string;
  channelId?: string | null;
  imageUrl: string;
  layoutInstructions: string;
  category?: string | null;
  createdAt: string;
  updatedAt: string;
  channel?: {
    id: string;
    name: string;
  };
}

export interface CreateArchetypeData {
  name: string;
  channelId: string;
  imageUrl: string;
  layoutInstructions: string;
}

export interface UpdateArchetypeData {
  name?: string;
  imageUrl?: string;
  layoutInstructions?: string;
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

      setArchetypes(data.archetypes);
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
