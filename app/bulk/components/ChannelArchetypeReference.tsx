'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  _count?: {
    archetypes: number;
  };
}

interface Archetype {
  id: string;
  name: string;
  channelId: string;
  channel?: {
    name: string;
  };
}

export function ChannelArchetypeReference() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<'channels' | 'archetypes' | null>('channels');

  useEffect(() => {
    async function fetchData() {
      try {
        const [channelsRes, archetypesRes] = await Promise.all([
          fetch('/api/channels'),
          fetch('/api/archetypes'),
        ]);

        if (channelsRes.ok && archetypesRes.ok) {
          const channelsData = await channelsRes.json();
          const archetypesData = await archetypesRes.json();
          setChannels(channelsData);
          setArchetypes(archetypesData);
        }
      } catch (error) {
        console.error('Failed to fetch reference data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <div className="reference-card">
        <div className="header">
          <BookOpen size={24} />
          <h3>Channel & Archetype IDs</h3>
        </div>
        <p className="loading-text">Loading reference data...</p>
        <style jsx>{`
          .reference-card {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 1.5rem;
            margin-top: 2rem;
          }
          .header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1rem;
            color: #ffffff;
          }
          .header h3 {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 700;
          }
          .loading-text {
            color: #71717a;
            font-size: 0.9rem;
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="reference-card">
      <div className="header">
        <BookOpen size={24} />
        <h3>Channel & Archetype IDs Reference</h3>
      </div>
      <p className="description">
        Copy these IDs to use in your CSV file. Click any ID to copy it to clipboard.
      </p>

      {/* Channels Section */}
      <div className="section">
        <button
          className="section-header"
          onClick={() => setExpandedSection(expandedSection === 'channels' ? null : 'channels')}
        >
          <div className="section-title">
            <span className="badge">{channels.length}</span>
            Channels
          </div>
          {expandedSection === 'channels' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSection === 'channels' && (
          <div className="items-list">
            {channels.map((channel) => (
              <div key={channel.id} className="item">
                <div className="item-info">
                  <div className="item-name">{channel.name}</div>
                  <div className="item-meta">
                    {channel._count?.archetypes || 0} archetype{channel._count?.archetypes !== 1 ? 's' : ''}
                  </div>
                </div>
                <button
                  className="copy-btn"
                  onClick={() => copyToClipboard(channel.id, `channel-${channel.id}`)}
                  title="Copy channel ID"
                >
                  {copiedId === `channel-${channel.id}` ? (
                    <Check size={16} className="check-icon" />
                  ) : (
                    <Copy size={16} />
                  )}
                  <code className="id-text">{channel.id}</code>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Archetypes Section */}
      <div className="section">
        <button
          className="section-header"
          onClick={() => setExpandedSection(expandedSection === 'archetypes' ? null : 'archetypes')}
        >
          <div className="section-title">
            <span className="badge">{archetypes.length}</span>
            Archetypes
          </div>
          {expandedSection === 'archetypes' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSection === 'archetypes' && (
          <div className="items-list">
            {archetypes.map((archetype) => (
              <div key={archetype.id} className="item">
                <div className="item-info">
                  <div className="item-name">{archetype.name}</div>
                  {archetype.channel && (
                    <div className="item-meta">
                      Channel: {archetype.channel.name}
                    </div>
                  )}
                </div>
                <button
                  className="copy-btn"
                  onClick={() => copyToClipboard(archetype.id, `archetype-${archetype.id}`)}
                  title="Copy archetype ID"
                >
                  {copiedId === `archetype-${archetype.id}` ? (
                    <Check size={16} className="check-icon" />
                  ) : (
                    <Copy size={16} />
                  )}
                  <code className="id-text">{archetype.id}</code>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .reference-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 1.5rem;
          margin-top: 2rem;
        }

        .header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
          color: #ffffff;
        }

        .header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
        }

        .description {
          color: #a1a1aa;
          font-size: 0.875rem;
          margin: 0 0 1.5rem 0;
          line-height: 1.5;
        }

        .section {
          margin-bottom: 1rem;
        }

        .section:last-child {
          margin-bottom: 0;
        }

        .section-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .section-header:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
          padding: 0 0.5rem;
          background: rgba(59, 130, 246, 0.2);
          border-radius: 12px;
          color: #3b82f6;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .items-list {
          margin-top: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          transition: all 0.2s;
          gap: 1rem;
        }

        .item:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .item-info {
          flex: 1;
          min-width: 0;
        }

        .item-name {
          color: #ffffff;
          font-size: 0.9rem;
          font-weight: 500;
          margin-bottom: 0.125rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-meta {
          color: #71717a;
          font-size: 0.8rem;
        }

        .copy-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 6px;
          color: #3b82f6;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .copy-btn:hover {
          background: rgba(59, 130, 246, 0.15);
          border-color: rgba(59, 130, 246, 0.3);
          transform: translateY(-1px);
        }

        .copy-btn:active {
          transform: translateY(0);
        }

        .id-text {
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 0.75rem;
          color: #3b82f6;
        }

        .check-icon {
          color: #22c55e;
        }

        @media (max-width: 768px) {
          .reference-card {
            padding: 1rem;
          }

          .item {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }

          .copy-btn {
            justify-content: space-between;
          }

          .id-text {
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      `}</style>
    </div>
  );
}
