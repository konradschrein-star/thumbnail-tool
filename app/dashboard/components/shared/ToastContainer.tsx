'use client';

import React from 'react';
import { useToast } from '../../hooks/useToast';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function ToastContainer() {
    const { toasts, removeToast } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <div key={toast.id} className={`toast toast-${toast.type} glass-dark`}>
                    <div className="toast-icon">
                        {toast.type === 'success' && <CheckCircle2 size={18} className="text-green-500" />}
                        {toast.type === 'error' && <AlertCircle size={18} className="text-red-500" />}
                        {toast.type === 'info' && <Info size={18} className="text-blue-500" />}
                    </div>
                    <div className="toast-message">{toast.message}</div>
                    <button
                        className="toast-close"
                        onClick={() => removeToast(toast.id)}
                        title="Close"
                        aria-label="Close"
                    >
                        <X size={14} />
                    </button>
                </div>
            ))}

            <style jsx>{`
        .toast-container {
          position: fixed;
          top: 1.5rem;
          right: 1.5rem;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          pointer-events: none;
        }

        .toast {
          pointer-events: auto;
          min-width: 300px;
          max-width: 400px;
          padding: 1rem 1.25rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        .toast-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
        }

        .toast-message {
          flex-grow: 1;
          font-size: 0.875rem;
          color: #f1f5f9;
          line-height: 1.4;
        }

        .toast-close {
          flex-shrink: 0;
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .toast-close:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        .text-green-500 { color: #22c55e; }
        .text-red-500 { color: #ef4444; }
        .text-blue-500 { color: #3b82f6; }
      `}</style>
        </div>
    );
}
