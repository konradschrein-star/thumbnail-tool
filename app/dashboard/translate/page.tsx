'use client';

import { useState } from 'react';
import { BlurFade } from '@/app/dashboard/components/ui/blur-fade';
import { Languages, Upload, CheckCircle2, Loader2, Play, Image as ImageIcon, Layers } from 'lucide-react';
import { ShimmerButton } from '@/app/dashboard/components/ui/shimmer-button';
import ErrorMessage from '@/app/dashboard/components/shared/ErrorMessage';
import useHistory from '@/app/dashboard/hooks/useHistory';
import CustomLanguageManager from '@/app/dashboard/components/translate/CustomLanguageManager';
import MultiImageUpload from '@/app/dashboard/components/translate/MultiImageUpload';
import { BatchSelector } from '@/app/dashboard/components/translate/BatchSelector';

const DEFAULT_LANGUAGES = [
  { code: 'German', label: 'German' },
  { code: 'Spanish', label: 'Spanish' },
  { code: 'French', label: 'French' },
  { code: 'Italian', label: 'Italian' },
  { code: 'Portuguese', label: 'Portuguese' },
  { code: 'Dutch', label: 'Dutch' },
  { code: 'Japanese', label: 'Japanese' },
];

type TranslateMode = 'JOB' | 'UPLOAD' | 'BATCH';

export default function TranslatePage() {
  const { jobs, loading: jobsLoading } = useHistory();
  const [mode, setMode] = useState<TranslateMode>('JOB');

  // Job mode state
  const [selectedJobId, setSelectedJobId] = useState('');

  // Upload mode state
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [originalText, setOriginalText] = useState('');

  // Batch mode state
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedBatchName, setSelectedBatchName] = useState('');
  const [selectedBatchCount, setSelectedBatchCount] = useState(0);

  // Shared state
  const [customLanguages, setCustomLanguages] = useState<Array<{ code: string; label: string }>>([]);
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  const completedJobs = jobs.filter((j: any) => j.status === 'completed');
  const allLanguages = [...DEFAULT_LANGUAGES, ...customLanguages];

  const toggleLang = (code: string) => {
    setSelectedLangs(prev =>
      prev.includes(code) ? prev.filter(l => l !== code) : [...prev, code]
    );
    setError('');
  };

  const handleTranslate = async () => {
    setLoading(true);
    setError('');

    try {
      if (mode === 'BATCH') {
        // Batch translation uses different endpoint
        if (!selectedBatchId) {
          throw new Error('Please select a batch to translate');
        }

        const response = await fetch('/api/batch/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchJobId: selectedBatchId,
            targetLanguages: selectedLangs,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Batch translation failed');
        }

        setResultMessage(data.message || `Queued ${data.translationCount} translations`);
        setSuccess(true);
      } else {
        // Job and upload modes use existing endpoint
        const payload: any = { targetLanguages: selectedLangs };

        if (mode === 'JOB') {
          if (!selectedJobId) {
            throw new Error('Please select a job to translate');
          }
          payload.masterJobId = selectedJobId;
        } else {
          if (uploadedImages.length === 0) {
            throw new Error('Please upload at least one image');
          }
          if (!originalText.trim()) {
            throw new Error('Please enter the original text that appears on the images');
          }
          payload.uploadedImages = uploadedImages;
          payload.originalText = originalText.trim();
        }

        const response = await fetch('/api/generate/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Translation failed');
        }

        setResultMessage(data.message || 'Translation completed successfully');
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Translation request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccess(false);
    setResultMessage('');
    setError('');
    setSelectedLangs([]);
    setSelectedJobId('');
    setUploadedImages([]);
    setOriginalText('');
    setSelectedBatchId('');
    setSelectedBatchName('');
    setSelectedBatchCount(0);
  };

  const handleSelectBatch = (batchId: string, batchName: string, thumbnailCount: number) => {
    setSelectedBatchId(batchId);
    setSelectedBatchName(batchName);
    setSelectedBatchCount(thumbnailCount);
    setError('');
  };

  const canTranslate =
    selectedLangs.length > 0 &&
    ((mode === 'JOB' && selectedJobId) ||
     (mode === 'UPLOAD' && uploadedImages.length > 0 && originalText.trim()) ||
     (mode === 'BATCH' && selectedBatchId));

  return (
    <div className="translate-container">
      <BlurFade delay={0.1}>
        <div className="view-header">
          <h2 className="view-title">Batch Translation</h2>
          <p className="view-subtitle">
            Localize your thumbnails with AI-powered translation to any language
          </p>
        </div>
      </BlurFade>

      {success ? (
        <BlurFade delay={0.2}>
          <div className="success-state glass">
            <CheckCircle2 size={48} className="text-success" />
            <h3>Translations Queued</h3>
            <p>{resultMessage}</p>
            <p className="hint">
              Your translated thumbnails are being generated. Check the History tab to view results.
            </p>
            <button onClick={handleReset} className="reset-btn">
              Translate More
            </button>
          </div>
        </BlurFade>
      ) : (
        <>
          {/* Mode Selector */}
          <BlurFade delay={0.15}>
            <div className="mode-tabs">
              <button
                className={`mode-tab ${mode === 'JOB' ? 'active' : ''}`}
                onClick={() => setMode('JOB')}
              >
                <Play size={16} />
                From Existing Job
              </button>
              <button
                className={`mode-tab ${mode === 'BATCH' ? 'active' : ''}`}
                onClick={() => setMode('BATCH')}
              >
                <Layers size={16} />
                From Batch
              </button>
              <button
                className={`mode-tab ${mode === 'UPLOAD' ? 'active' : ''}`}
                onClick={() => setMode('UPLOAD')}
              >
                <Upload size={16} />
                Upload Images
              </button>
            </div>
          </BlurFade>

          <div className="translate-grid">
            {/* LEFT: Source Selection */}
            <BlurFade delay={0.2} direction="right">
              <div className="selection-card glass">
                <div className="card-header">
                  {mode === 'JOB' ? <Play size={18} /> : mode === 'BATCH' ? <Layers size={18} /> : <ImageIcon size={18} />}
                  <h3>1. Select Source</h3>
                </div>

                {mode === 'BATCH' ? (
                  <BatchSelector onSelectBatch={handleSelectBatch} />
                ) : mode === 'JOB' ? (
                  <div className="jobs-list">
                    {jobsLoading ? (
                      <div className="loading-jobs">
                        <Loader2 className="animate-spin" size={24} />
                        <span>Loading jobs...</span>
                      </div>
                    ) : completedJobs.length === 0 ? (
                      <p className="empty-msg">
                        No completed jobs found. Generate a thumbnail first, then translate it here.
                      </p>
                    ) : (
                      completedJobs.map((job: any) => (
                        <div
                          key={job.id}
                          className={`job-item ${selectedJobId === job.id ? 'active' : ''}`}
                          onClick={() => setSelectedJobId(job.id)}
                        >
                          <img src={job.outputUrl} alt="Job thumbnail" />
                          <div className="job-info">
                            <span className="job-topic">{job.videoTopic}</span>
                            <span className="job-text">{job.thumbnailText}</span>
                            <span className="job-date">
                              {new Date(job.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="upload-mode">
                    <MultiImageUpload onUploadComplete={setUploadedImages} maxImages={5} />

                    <div className="text-input-group">
                      <label htmlFor="original-text">
                        Original Text
                        <span className="required">*</span>
                      </label>
                      <input
                        id="original-text"
                        type="text"
                        placeholder="e.g., CLICK NOW, MUST WATCH, etc."
                        value={originalText}
                        onChange={(e) => setOriginalText(e.target.value)}
                        className="text-input"
                        maxLength={100}
                      />
                      <span className="hint">
                        Enter the text that appears on your uploaded images
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </BlurFade>

            {/* RIGHT: Language Selection */}
            <BlurFade delay={0.3} direction="left">
              <div className="options-card glass">
                <div className="card-header">
                  <Languages size={18} />
                  <h3>2. Target Languages</h3>
                </div>

                <div className="lang-section">
                  <h4>Standard Languages</h4>
                  <div className="lang-grid">
                    {allLanguages.map(lang => (
                      <button
                        key={lang.code}
                        className={`lang-chip ${selectedLangs.includes(lang.code) ? 'active' : ''}`}
                        onClick={() => toggleLang(lang.code)}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                <CustomLanguageManager onLanguagesUpdate={setCustomLanguages} />

                {error && <ErrorMessage message={error} />}

                <div className="action-footer">
                  <ShimmerButton
                    onClick={handleTranslate}
                    disabled={loading || !canTranslate}
                    className="translate-btn"
                    background="#ffffff"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Translating...
                      </>
                    ) : (
                      `Generate ${selectedLangs.length} ${selectedLangs.length === 1 ? 'Version' : 'Versions'}`
                    )}
                  </ShimmerButton>

                  {!canTranslate && (
                    <span className="help-text">
                      {selectedLangs.length === 0
                        ? 'Select at least one target language'
                        : mode === 'JOB'
                        ? 'Select a job to translate'
                        : uploadedImages.length === 0
                        ? 'Upload images to translate'
                        : 'Enter the original text'}
                    </span>
                  )}
                </div>
              </div>
            </BlurFade>
          </div>
        </>
      )}

      <style jsx>{`
        .translate-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .view-header {
          margin-bottom: 2rem;
        }

        .view-title {
          font-size: 2.25rem;
          font-weight: 800;
          margin: 0 0 0.5rem 0;
        }

        .view-subtitle {
          color: var(--muted-foreground);
          font-size: 1rem;
        }

        .mode-tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          border-radius: 12px;
          width: fit-content;
        }

        .mode-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--muted-foreground);
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mode-tab:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
        }

        .mode-tab.active {
          background: #fff;
          color: #000;
        }

        .translate-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        .selection-card,
        .options-card {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          min-height: 500px;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: var(--muted-foreground);
        }

        .card-header h3 {
          margin: 0;
          font-size: 1.125rem;
          color: #fff;
        }

        .jobs-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-height: 500px;
          overflow-y: auto;
          padding-right: 0.5rem;
        }

        .loading-jobs {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 3rem;
          color: var(--muted-foreground);
        }

        .job-item {
          display: flex;
          gap: 1rem;
          padding: 0.75rem;
          border-radius: var(--radius);
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .job-item:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: #52525b;
        }

        .job-item.active {
          border-color: #fff;
          background: rgba(255, 255, 255, 0.1);
        }

        .job-item img {
          width: 80px;
          height: 45px;
          object-fit: cover;
          border-radius: 4px;
        }

        .job-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex: 1;
        }

        .job-topic {
          font-size: 0.9rem;
          font-weight: 500;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .job-text {
          font-size: 0.875rem;
          color: var(--muted-foreground);
          font-weight: 600;
        }

        .job-date {
          font-size: 0.75rem;
          color: var(--muted-foreground);
        }

        .empty-msg {
          color: var(--muted-foreground);
          text-align: center;
          padding: 3rem 1rem;
          line-height: 1.6;
        }

        .upload-mode {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .text-input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .text-input-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #fff;
        }

        .required {
          color: #ef4444;
          margin-left: 0.25rem;
        }

        .text-input {
          padding: 0.75rem 1rem;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: #fff;
          font-size: 0.9375rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .text-input:focus {
          border-color: #52525b;
        }

        .text-input::placeholder {
          color: var(--muted-foreground);
        }

        .hint {
          font-size: 0.75rem;
          color: var(--muted-foreground);
        }

        .lang-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .lang-section h4 {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--muted-foreground);
          margin: 0;
        }

        .lang-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 0.75rem;
        }

        .lang-chip {
          padding: 0.625rem 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 0.875rem;
          color: var(--muted-foreground);
          transition: all 0.2s;
          cursor: pointer;
          font-weight: 500;
        }

        .lang-chip:hover {
          border-color: #52525b;
          background: rgba(255, 255, 255, 0.05);
        }

        .lang-chip.active {
          background: #fff;
          color: #000;
          border-color: #fff;
          font-weight: 600;
        }

        .action-footer {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        :global(.translate-btn) {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .help-text {
          font-size: 0.875rem;
          color: var(--muted-foreground);
          text-align: center;
        }

        .success-state {
          padding: 4rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          border-radius: var(--radius);
        }

        .text-success {
          color: #10b981;
        }

        .success-state h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
        }

        .success-state p {
          color: var(--muted-foreground);
          line-height: 1.6;
          max-width: 500px;
          margin: 0;
        }

        .reset-btn {
          padding: 0.75rem 2rem;
          background: #fff;
          color: #000;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .reset-btn:hover {
          background: #e5e5e5;
        }

        @media (max-width: 768px) {
          .translate-grid {
            grid-template-columns: 1fr;
          }

          .mode-tabs {
            width: 100%;
          }

          .mode-tab {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}
