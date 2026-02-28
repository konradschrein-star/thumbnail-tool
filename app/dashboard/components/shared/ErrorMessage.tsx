'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div className="error-box">
      <div className="error-content">
        <span className="error-icon"><AlertTriangle size={18} /></span>
        <div className="error-text">
          <strong>Error:</strong> {message}
        </div>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="dismiss-btn" aria-label="Dismiss error">
          ×
        </button>
      )}

      <style jsx>{`
        .error-box {
          background: rgba(127, 29, 29, 0.1);
          border: 1px solid rgba(127, 29, 29, 0.3);
          color: #fca5a5;
          padding: 1rem;
          border-radius: var(--radius);
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }

        .error-content {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .error-icon {
          font-size: 1.125rem;
        }

        .error-text {
          font-size: 0.875rem;
        }

        .dismiss-btn {
          background: transparent;
          border: none;
          font-size: 1.5rem;
          color: #fca5a5;
          cursor: pointer;
          padding: 0.5rem;
          line-height: 1;
          transition: opacity 0.2s ease;
        }

        .dismiss-btn:hover {
          opacity: 0.7;
        }

        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  );
}
