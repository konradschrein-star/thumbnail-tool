'use client';

import { useState } from 'react';
import { BlurFade } from '../components/ui/blur-fade';
import { Languages, Globe, ArrowRight, CheckCircle2, Loader2, Play } from 'lucide-react';
import Button from '../components/shared/Button';
import ErrorMessage from '../components/shared/ErrorMessage';
import useJobs from '../hooks/useJobs';
import { ShimmerButton } from '../components/ui/shimmer-button';

const LANGUAGES = [
    { code: 'German', label: 'German' },
    { code: 'Spanish', label: 'Spanish' },
    { code: 'French', label: 'French' },
    { code: 'Italian', label: 'Italian' },
    { code: 'Portuguese', label: 'Portuguese' },
    { code: 'Dutch', label: 'Dutch' },
    { code: 'Japanese', label: 'Japanese' },
];

export default function TranslatePage() {
    const { jobs, loading: jobsLoading } = useJobs();
    const [selectedJobId, setSelectedJobId] = useState('');
    const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const completedJobs = jobs.filter((j: any) => j.status === 'completed');

    const toggleLang = (code: string) => {
        setSelectedLangs(prev =>
            prev.includes(code) ? prev.filter(l => l !== code) : [...prev, code]
        );
    };

    const handleTranslate = async () => {
        if (!selectedJobId || selectedLangs.length === 0) return;

        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/generate/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    masterJobId: selectedJobId,
                    targetLanguages: selectedLangs
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to trigger translation');

            setSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="translate-container">
            <BlurFade delay={0.1}>
                <div className="view-header">
                    <h2 className="view-title">Batch Translation</h2>
                    <p className="view-subtitle">Scale your content globally by localizing successful thumbnails</p>
                </div>
            </BlurFade>

            {success ? (
                <BlurFade delay={0.2}>
                    <div className="success-state glass">
                        <CheckCircle2 size={48} className="text-success" />
                        <h3>Translations Queued</h3>
                        <p>Your localized thumbnails are being generated in the background. You can track progress in the History tab.</p>
                        <Button onClick={() => setSuccess(false)}>Queue More</Button>
                    </div>
                </BlurFade>
            ) : (
                <div className="translate-grid">
                    <BlurFade delay={0.2} direction="right">
                        <div className="selection-card glass">
                            <div className="card-header">
                                <Play size={18} />
                                <h3>1. Select Master Job</h3>
                            </div>

                            <div className="jobs-list">
                                {jobsLoading ? (
                                    <div className="loading-jobs"><Loader2 className="animate-spin" /></div>
                                ) : completedJobs.length === 0 ? (
                                    <p className="empty-msg">No completed jobs found to translate.</p>
                                ) : (
                                    completedJobs.map((job: any) => (
                                        <div
                                            key={job.id}
                                            className={`job-item ${selectedJobId === job.id ? 'active' : ''}`}
                                            onClick={() => setSelectedJobId(job.id)}
                                        >
                                            <img src={job.outputUrl || ''} alt="Job thumbnail" />
                                            <div className="job-info">
                                                <span className="job-topic">{job.videoTopic}</span>
                                                <span className="job-date">{new Date(job.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </BlurFade>

                    <BlurFade delay={0.3} direction="left">
                        <div className="options-card glass">
                            <div className="card-header">
                                <Globe size={18} />
                                <h3>2. Target Languages</h3>
                            </div>

                            <div className="lang-grid">
                                {LANGUAGES.map(lang => (
                                    <button
                                        key={lang.code}
                                        className={`lang-chip ${selectedLangs.includes(lang.code) ? 'active' : ''}`}
                                        onClick={() => toggleLang(lang.code)}
                                    >
                                        {lang.label}
                                    </button>
                                ))}
                            </div>

                            {error && <ErrorMessage message={error} />}

                            <div className="action-footer">
                                <ShimmerButton
                                    onClick={handleTranslate}
                                    disabled={loading || !selectedJobId || selectedLangs.length === 0}
                                    className="translate-btn"
                                    background="#ffffff"
                                >
                                    {loading ? 'Queueing...' : `Generate ${selectedLangs.length} Versions`}
                                </ShimmerButton>
                            </div>
                        </div>
                    </BlurFade>
                </div>
            )}

            <style jsx>{`
        .translate-container {
          max-width: 1000px;
          margin: 0 auto;
        }
        .view-header { margin-bottom: 2rem; }
        .view-title { font-size: 2.25rem; font-weight: 800; }
        .view-subtitle { color: var(--muted-foreground); }

        .translate-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        .selection-card, .options-card {
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

        .card-header h3 { margin: 0; font-size: 1.125rem; color: #fff; }

        .jobs-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-height: 400px;
          overflow-y: auto;
          padding-right: 0.5rem;
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

        .job-item:hover { background: rgba(255, 255, 255, 0.05); }
        .job-item.active { border-color: #fff; background: rgba(255, 255, 255, 0.1); }

        .job-item img {
          width: 80px;
          height: 45px;
          object-fit: cover;
          border-radius: 4px;
        }

        .job-info { display: flex; flex-direction: column; gap: 0.25rem; }
        .job-topic { font-size: 0.9rem; font-weight: 500; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .job-date { font-size: 0.75rem; color: var(--muted-foreground); }

        .lang-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 0.75rem;
        }

        .lang-chip {
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 0.875rem;
          color: var(--muted-foreground);
          transition: all 0.2s;
          cursor: pointer;
        }

        .lang-chip:hover { border-color: #52525b; }
        .lang-chip.active { background: #fff; color: #000; border-color: #fff; font-weight: 600; }

        .action-footer { margin-top: auto; }
        :global(.translate-btn) { width: 100%; }

        .success-state {
          padding: 4rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          border-radius: var(--radius);
        }

        .text-success { color: #fff; }
      `}</style>
        </div>
    );
}
