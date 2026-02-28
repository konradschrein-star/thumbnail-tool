'use client';

import React from 'react';
import Button from '../shared/Button';
import type { Archetype } from '../../hooks/useArchetypes';
import { Image as ImageIcon } from 'lucide-react';

interface ArchetypeCardProps {
  archetype: Archetype;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ArchetypeCard({ archetype, onEdit, onDelete }: ArchetypeCardProps) {
  const truncateText = (text: string, maxLength: number = 80): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="archetype-card-wrapper glass">
      <div className="archetype-card">


        <div className="image-preview">
          <img
            src={archetype.imageUrl}
            alt={archetype.name}
            className="preview-img"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = document.createElement('div');
              fallback.className = 'fallback-icon';
              fallback.innerHTML = '<div class="fallback-icon-lucide"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';
              e.currentTarget.parentElement?.appendChild(fallback);
            }}
          />
          <div className="image-overlay">
            <Button size="small" variant="secondary" onClick={onEdit} className="overlay-btn">
              Edit Pattern
            </Button>
          </div>
        </div>

        <div className="card-content">
          <div className="card-header">
            <h4 className="card-title">{archetype.name}</h4>
            {archetype.channel && (
              <span className="channel-tag">{archetype.channel.name}</span>
            )}
          </div>

          <p className="card-description">
            {truncateText(archetype.layoutInstructions || 'No layout instructions')}
          </p>

          <div className="card-actions">
            <Button size="small" variant="ghost" className="delete-btn" onClick={onDelete}>
              Delete
            </Button>
            <Button size="small" onClick={onEdit}>
              Edit Details
            </Button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .archetype-card-wrapper {
          height: 100%;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(15, 23, 42, 0.3) !important;
          backdrop-filter: blur(8px);
          transition: transform 0.3s ease;
        }

        .archetype-card-wrapper:hover {
          transform: translateY(-4px);
        }

        .archetype-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          position: relative;
          overflow: hidden;
        }

        .image-preview {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          background: #020617;
          overflow: hidden;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .preview-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .archetype-card-wrapper:hover .preview-img {
          transform: scale(1.1);
        }

        .image-overlay {
          position: absolute;
          inset: 0;
          background: rgba(2, 6, 23, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: all 0.3s ease;
          backdrop-filter: blur(4px);
        }

        .archetype-card-wrapper:hover .image-overlay {
          opacity: 1;
        }

        .card-content {
          padding: 1.5rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .card-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: #f8fafc;
          letter-spacing: -0.01em;
        }

        .channel-tag {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.2rem 0.6rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #a1a1aa;
          white-space: nowrap;
        }

        .card-description {
          font-size: 0.8125rem;
          color: #94a3b8;
          line-height: 1.6;
          margin: 0;
          flex: 1;
        }

        .card-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.5rem;
          padding-top: 1.25rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        :global(.delete-btn:hover) {
          color: #ef4444 !important;
          background: rgba(239, 68, 68, 0.1) !important;
        }

        :global(.fallback-icon) {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          color: #1e293b;
        }
      `}</style>
    </div>
  );
}
