'use client';

import React from 'react';

interface InputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number';
  error?: string;
  required?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  minLength?: number;
  maxLength?: number;
  className?: string;
}

export default function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  required = false,
  disabled = false,
  multiline = false,
  rows = 4,
  minLength,
  maxLength,
  className = '',
}: InputProps) {
  const Component = multiline ? 'textarea' : 'input';

  return (
    <div className={`input-group ${className} ${error ? 'has-error' : ''}`}>
      {label && (
        <label className="input-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}

      <Component
        {...(multiline ? { rows } : { type })}
        value={value}
        onChange={(e) => onChange((e.target as any).value)}
        placeholder={placeholder}
        disabled={disabled}
        minLength={minLength}
        maxLength={maxLength}
        className="input-field"
      />

      {error && <div className="error-text">{error}</div>}

      <style jsx>{`
        .input-group {
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .input-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--muted-foreground);
        }

        .required {
          color: #ef4444;
          margin-left: 0.25rem;
        }

        .input-field {
          width: 100%;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--foreground);
          font-family: inherit;
          font-size: 0.875rem;
          transition: all 0.2s ease;
          outline: none;
        }

        .input-field:focus {
          border-color: #52525b;
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.05);
        }

        .input-field:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .has-error .input-field {
          border-color: #ef4444;
        }

        .error-text {
          font-size: 0.75rem;
          color: #ef4444;
        }

        textarea.input-field {
          resize: vertical;
          min-height: 100px;
        }
      `}</style>
    </div>
  );
}
