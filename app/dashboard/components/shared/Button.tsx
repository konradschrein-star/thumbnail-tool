'use client';

import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'normal' | 'small' | 'large';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'normal',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`btn btn-${variant} btn-${size} ${className}`}
    >
      {children}
      <style jsx>{`
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid transparent;
          white-space: nowrap;
          outline: none;
        }

        .btn:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        /* Sizes */
        .btn-normal {
          padding: 0.625rem 1.25rem;
          font-size: 0.875rem;
        }

        .btn-small {
          padding: 0.375rem 0.75rem;
          font-size: 0.75rem;
        }

        .btn-large {
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
        }

        /* Variants */
        .btn-primary {
          background: var(--primary);
          color: var(--primary-foreground);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .btn-primary:hover:not(:disabled) {
          background: #e4e4e7;
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: var(--secondary);
          color: var(--secondary-foreground);
          border-color: var(--border);
        }

        .btn-secondary:hover:not(:disabled) {
          background: #3f3f46;
          border-color: #52525b;
        }

        .btn-danger {
          background: #ef4444;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #dc2626;
        }

        .btn-ghost {
          background: transparent;
          color: var(--muted-foreground);
        }

        .btn-ghost:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.05);
          color: var(--foreground);
        }

        /* Shine Effect for Primary */
        .btn-primary::after {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          transition: 0.5s;
        }

        .btn-primary:hover::after {
          left: 100%;
        }
      `}</style>
    </button>
  );
}
