'use client';

import { useState } from 'react';
import { Plus, Palette } from 'lucide-react';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import ErrorMessage from '../shared/ErrorMessage';
import ArchetypeCard from './ArchetypeCard';
import ArchetypeForm from './ArchetypeForm';
import useArchetypes, { type Archetype } from '../../hooks/useArchetypes';
import useChannels from '../../hooks/useChannels';
import { BlurFade } from '../ui/blur-fade';

export default function ArchetypeList() {
  const { channels } = useChannels();
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const { archetypes, loading, error, createArchetype, updateArchetype, deleteArchetype } =
    useArchetypes(selectedChannelId);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingArchetype, setEditingArchetype] = useState<Archetype | null>(null);
  const [deletingArchetype, setDeletingArchetype] = useState<Archetype | null>(null);
  const [actionError, setActionError] = useState('');

  const handleCreate = async (data: any) => {
    try {
      await createArchetype(data);
      setShowCreateModal(false);
      setActionError('');
    } catch (err: any) {
      throw err;
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingArchetype) return;
    try {
      await updateArchetype(editingArchetype.id, data);
      setEditingArchetype(null);
      setActionError('');
    } catch (err: any) {
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deletingArchetype) return;
    try {
      setActionError('');
      await deleteArchetype(deletingArchetype.id);
      setDeletingArchetype(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete archetype');
    }
  };

  if (loading && archetypes.length === 0) {
    return <div className="loading">Loading visual archetypes...</div>;
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2 className="view-title">Visual Archetypes</h2>
          <p className="view-subtitle">Define and manage design patterns for your thumbnails</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={18} style={{ marginRight: '0.4rem' }} /> Create Archetype
        </Button>
      </div>

      {/* Filters */}
      <div className="filter-bar glass">
        <div className="filter-group">
          <label className="filter-label">Filter by Channel</label>
          <select
            value={selectedChannelId}
            onChange={(e) => setSelectedChannelId(e.target.value)}
            className="filter-select"
            title="Filter by Channel"
          >
            <option value="">All Channels</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}
      {actionError && <ErrorMessage message={actionError} onDismiss={() => setActionError('')} />}

      {archetypes.length === 0 ? (
        <div className="empty-state glass">
          <div className="empty-icon"><Palette size={48} /></div>
          <h3>{selectedChannelId ? 'No archetypes for this channel' : 'No archetypes yet'}</h3>
          <p>
            {selectedChannelId
              ? 'Create an archetype for this channel to see it here.'
              : 'Create your first visual archetype to define your channel style.'}
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus size={18} style={{ marginRight: '0.4rem' }} /> Create Archetype
          </Button>
        </div>
      ) : (
        <div className="archetype-grid">
          {archetypes.map((archetype, index) => (
            <BlurFade key={archetype.id} delay={0.1 + index * 0.05} inView>
              <ArchetypeCard
                archetype={archetype}
                onEdit={() => setEditingArchetype(archetype)}
                onDelete={() => setDeletingArchetype(archetype)}
              />
            </BlurFade>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Archetype"
        size="large"
      >
        <ArchetypeForm
          mode="create"
          preselectedChannelId={selectedChannelId}
          onSubmit={handleCreate}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingArchetype}
        onClose={() => setEditingArchetype(null)}
        title="Edit Visual Archetype"
        size="large"
      >
        {editingArchetype && (
          <ArchetypeForm
            mode="edit"
            initialData={editingArchetype}
            onSubmit={handleUpdate}
            onCancel={() => setEditingArchetype(null)}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingArchetype}
        onClose={() => setDeletingArchetype(null)}
        title="Delete Archetype"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingArchetype(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete Archetype
            </Button>
          </>
        }
      >
        <div className="delete-confirm">
          <p>Are you sure you want to delete <strong>{deletingArchetype?.name}</strong>?</p>
          <p className="warning-text">This action is permanent and cannot be undone.</p>
        </div>
      </Modal>

      <style jsx>{`
        .view-container {
          animation: fade-in 0.4s ease-out;
        }

        .view-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 2rem;
        }

        .view-title {
          font-size: 1.875rem;
          font-weight: 700;
          margin: 0;
          color: var(--foreground);
        }

        .view-subtitle {
          color: var(--muted-foreground);
          margin: 0.25rem 0 0 0;
          font-size: 0.875rem;
        }

        .filter-bar {
          padding: 1rem;
          margin-bottom: 2rem;
          border-radius: var(--radius);
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--muted-foreground);
        }

        .filter-select {
          padding: 0.625rem 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--foreground);
          font-size: 0.875rem;
          outline: none;
          max-width: 300px;
          cursor: pointer;
        }

        .filter-select option {
          background-color: #09090b;
          color: #fafafa;
        }

        .filter-select:focus {
          border-color: #52525b;
        }

        .archetype-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 2rem;
          min-height: calc(100vh - 400px);
        }

        .loading {
          text-align: center;
          padding: 3rem;
          color: var(--muted-foreground);
        }

        .empty-state {
          padding: 4rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }

        .empty-state h3 {
          margin: 0;
          font-size: 1.25rem;
        }

        .empty-state p {
          color: var(--muted-foreground);
          margin-bottom: 1rem;
          max-width: 400px;
        }

        .delete-confirm p {
          margin-bottom: 1rem;
        }

        .warning-text {
          color: #fca5a5;
          font-size: 0.8125rem;
          padding: 0.75rem;
          background: rgba(127, 29, 29, 0.1);
          border-radius: var(--radius);
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
