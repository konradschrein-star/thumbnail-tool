'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';

interface Language {
  code: string;
  label: string;
}

interface CustomLanguageManagerProps {
  onLanguagesUpdate: (languages: Language[]) => void;
}

export default function CustomLanguageManager({ onLanguagesUpdate }: CustomLanguageManagerProps) {
  const [customLanguages, setCustomLanguages] = useState<Language[]>([]);
  const [newCode, setNewCode] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchCustomLanguages();
  }, []);

  const fetchCustomLanguages = async () => {
    try {
      const response = await fetch('/api/user/preferences');
      if (!response.ok) throw new Error('Failed to load preferences');

      const data = await response.json();
      const languages = data.preferences?.customLanguages || [];
      setCustomLanguages(languages);
      onLanguagesUpdate(languages);
    } catch (err: any) {
      console.error('Failed to load custom languages:', err);
      setError('Failed to load custom languages');
    } finally {
      setInitialLoading(false);
    }
  };

  const saveCustomLanguages = async (languages: Language[]) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customLanguages: languages })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      setCustomLanguages(languages);
      onLanguagesUpdate(languages);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newCode.trim() || !newLabel.trim()) {
      setError('Both code and label are required');
      return;
    }

    // Check for duplicates
    if (customLanguages.some(lang => lang.code.toLowerCase() === newCode.trim().toLowerCase())) {
      setError('This language code already exists');
      return;
    }

    const newLanguage = { code: newCode.trim(), label: newLabel.trim() };
    const updated = [...customLanguages, newLanguage];

    const success = await saveCustomLanguages(updated);
    if (success) {
      setNewCode('');
      setNewLabel('');
      setShowAddForm(false);
    }
  };

  const handleRemove = async (code: string) => {
    const updated = customLanguages.filter(lang => lang.code !== code);
    await saveCustomLanguages(updated);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === 'Escape') {
      setShowAddForm(false);
      setNewCode('');
      setNewLabel('');
      setError('');
    }
  };

  if (initialLoading) {
    return (
      <div className="custom-lang-manager loading">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  return (
    <div className="custom-lang-manager">
      {customLanguages.length > 0 && (
        <div className="lang-list">
          <h4>Your Custom Languages</h4>
          <div className="lang-chips">
            {customLanguages.map(lang => (
              <div key={lang.code} className="lang-item">
                <span>{lang.label}</span>
                <button
                  onClick={() => handleRemove(lang.code)}
                  className="remove-btn"
                  disabled={loading}
                  title="Remove language"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          className="add-lang-btn"
          disabled={loading || customLanguages.length >= 20}
        >
          <Plus size={16} />
          Add Custom Language
        </button>
      ) : (
        <div className="add-form">
          <div className="input-row">
            <input
              type="text"
              placeholder="Language name (e.g., Klingon)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={loading}
              autoFocus
              maxLength={50}
            />
            <input
              type="text"
              placeholder="Display label (e.g., Klingon)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={loading}
              maxLength={50}
            />
          </div>
          <div className="button-row">
            <button
              onClick={handleAdd}
              className="save-btn"
              disabled={loading || !newCode.trim() || !newLabel.trim()}
            >
              {loading ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
              Add
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewCode('');
                setNewLabel('');
                setError('');
              }}
              className="cancel-btn"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <div className="error-text">{error}</div>}

      {customLanguages.length >= 20 && (
        <div className="info-text">Maximum of 20 custom languages reached</div>
      )}

      <style jsx>{`
        .custom-lang-manager {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1rem 0;
          border-top: 1px solid var(--border);
        }

        .custom-lang-manager.loading {
          justify-content: center;
          align-items: center;
          padding: 2rem;
        }

        .lang-list h4 {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--muted-foreground);
          margin: 0 0 0.75rem 0;
        }

        .lang-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .lang-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .lang-item:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: #52525b;
        }

        .lang-item span {
          color: #fff;
        }

        .remove-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--muted-foreground);
          cursor: pointer;
          padding: 0;
          transition: color 0.2s;
        }

        .remove-btn:hover:not(:disabled) {
          color: #ef4444;
        }

        .remove-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .add-lang-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed var(--border);
          border-radius: 8px;
          color: var(--muted-foreground);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-lang-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.05);
          border-color: #52525b;
          color: #fff;
        }

        .add-lang-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .add-form {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          border-radius: 8px;
        }

        .input-row {
          display: flex;
          gap: 0.75rem;
        }

        .input-row input {
          flex: 1;
          padding: 0.5rem 0.75rem;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: #fff;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .input-row input:focus {
          border-color: #52525b;
        }

        .input-row input::placeholder {
          color: var(--muted-foreground);
        }

        .input-row input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .button-row {
          display: flex;
          gap: 0.5rem;
        }

        .save-btn,
        .cancel-btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .save-btn {
          background: #fff;
          color: #000;
        }

        .save-btn:hover:not(:disabled) {
          background: #e5e5e5;
        }

        .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .cancel-btn {
          background: rgba(255, 255, 255, 0.05);
          color: var(--muted-foreground);
        }

        .cancel-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .error-text {
          font-size: 0.875rem;
          color: #ef4444;
          padding: 0.5rem 0.75rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 6px;
        }

        .info-text {
          font-size: 0.875rem;
          color: #fbbf24;
          padding: 0.5rem 0.75rem;
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.3);
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
}
