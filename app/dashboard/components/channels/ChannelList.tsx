'use client';

import { useState } from 'react';
import Table from '../shared/Table';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import ErrorMessage from '../shared/ErrorMessage';
import ChannelForm from './ChannelForm';
import useChannels, { type Channel } from '../../hooks/useChannels';
import { BlurFade } from '../ui/blur-fade';
import { Tv } from 'lucide-react';

export default function ChannelList() {
  const { channels, loading, error, createChannel, updateChannel, deleteChannel } = useChannels();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [deletingChannel, setDeletingChannel] = useState<Channel | null>(null);
  const [actionError, setActionError] = useState('');

  const handleCreate = async (data: any) => {
    try {
      await createChannel(data);
      setShowCreateModal(false);
      setActionError('');
    } catch (err: any) {
      throw err;
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingChannel) return;
    try {
      await updateChannel(editingChannel.id, data);
      setEditingChannel(null);
      setActionError('');
    } catch (err: any) {
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deletingChannel) return;
    try {
      setActionError('');
      await deleteChannel(deletingChannel.id);
      setDeletingChannel(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete channel');
    }
  };

  const truncateText = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const columns = [
    { header: 'Name', key: 'name', width: '25%' },
    {
      header: 'Persona Description',
      key: 'personaDescription',
      render: (value: string) => <span className="muted-text">{truncateText(value, 80)}</span>,
    },
    {
      header: 'Archetypes',
      key: 'archetypesCount',
      width: '12%',
      render: (_: any, row: Channel) => (
        <span className="badge">{row._count?.archetypes || 0}</span>
      ),
    },
    {
      header: 'Jobs',
      key: 'jobsCount',
      width: '10%',
      render: (_: any, row: Channel) => row._count?.generationJobs || 0,
    },
    {
      header: 'Actions',
      key: 'actions',
      width: '150px',
      render: (_: any, row: Channel) => (
        <div className="action-btns">
          <Button size="small" variant="ghost" onClick={() => setEditingChannel(row)}>
            Edit
          </Button>
          <Button size="small" variant="ghost" className="delete-btn" onClick={() => setDeletingChannel(row)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  if (loading && channels.length === 0) {
    return <div className="loading">Loading channels...</div>;
  }

  return (
    <>
      <BlurFade delay={0.1} inView>
        <div className="view-container">
          <div className="view-header">
            <div>
              <h2 className="view-title">Channels</h2>
              <p className="view-subtitle">Manage your YouTube channel personas and generation settings</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <span>+</span> Create Channel
            </Button>
          </div>

          {error && <ErrorMessage message={error} />}
          {actionError && <ErrorMessage message={actionError} onDismiss={() => setActionError('')} />}

          {channels.length === 0 ? (
            <div className="empty-state glass">
              <div className="empty-icon text-muted-foreground"><Tv size={48} /></div>
              <h3>No channels yet</h3>
              <p>Create your first channel to start generating branded thumbnails.</p>
              <Button onClick={() => setShowCreateModal(true)}>
                Create Channel
              </Button>
            </div>
          ) : (
            <div className="table-container">
              <Table columns={columns} data={channels} emptyMessage="No channels found" />
            </div>
          )}
        </div>
      </BlurFade>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Channel"
      >
        <ChannelForm
          mode="create"
          onSubmit={handleCreate}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingChannel}
        onClose={() => setEditingChannel(null)}
        title="Edit Channel"
      >
        {editingChannel && (
          <ChannelForm
            mode="edit"
            initialData={editingChannel}
            onSubmit={handleUpdate}
            onCancel={() => setEditingChannel(null)}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingChannel}
        onClose={() => setDeletingChannel(null)}
        title="Delete Channel"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingChannel(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete Channel
            </Button>
          </>
        }
      >
        <div className="delete-confirm">
          <p>Are you sure you want to delete <strong>{deletingChannel?.name}</strong>?</p>
          <p className="warning-text">
            This action cannot be undone. All associated archetypes and generation jobs will be permanently removed.
          </p>
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

        .loading {
          text-align: center;
          padding: 3rem;
          color: var(--muted-foreground);
        }

        .muted-text {
          color: var(--muted-foreground);
          font-size: 0.8125rem;
        }

        .badge {
          background: var(--muted);
          color: var(--foreground);
          padding: 0.125rem 0.6rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid var(--border);
        }

        .action-btns {
          display: flex;
          gap: 0.5rem;
        }

        :global(.delete-btn:hover) {
          color: #ef4444 !important;
          background: rgba(239, 68, 68, 0.1) !important;
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
          line-height: 1.5;
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
    </>
  );
}
