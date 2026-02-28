'use client';

import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'normal' | 'large' | 'small' | 'xl';
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'normal'
}: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getMaxWidth = () => {
    switch (size) {
      case 'small': return '400px';
      case 'large': return '800px';
      case 'xl': return '1100px';
      default: return '600px';
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal-content glass-dark modal-${size}`}>
        <header className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button onClick={onClose} className="close-btn" aria-label="Close modal">
            ×
          </button>
        </header>

        <div className="modal-body">{children}</div>

        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
          animation: fade-in 0.2s ease;
        }

        .modal-content {
          width: 100%;
          max-width: ${getMaxWidth()};
          max-height: 90vh;
          overflow: hidden;
          border-radius: var(--radius);
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
          border: 1px solid var(--border);
          animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .modal-header {
          padding: 1.25rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.02);
        }

        .modal-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--foreground);
          letter-spacing: -0.01em;
        }

        .close-btn {
          background: transparent;
          border: none;
          font-size: 1.5rem;
          color: var(--muted-foreground);
          cursor: pointer;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s ease;
          line-height: 1;
        }

        .close-btn:hover {
          color: var(--foreground);
          background: rgba(255, 255, 255, 0.05);
        }

        .modal-body {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
        }

        .modal-footer {
          padding: 1rem 1.5rem;
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          border-top: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.02);
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slide-up {
          from { 
            transform: translateY(16px) scale(0.98);
            opacity: 0;
          }
          to { 
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
