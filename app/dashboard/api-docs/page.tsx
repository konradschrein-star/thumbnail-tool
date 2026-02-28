'use client';

import { BlurFade } from '../ui/blur-fade';
import { BookOpen, Code, Terminal, Zap } from 'lucide-react';

export default function APIDocsPage() {
    return (
        <div className="docs-container">
            <BlurFade delay={0.1}>
                <div className="view-header">
                    <h2 className="view-title">API Documentation</h2>
                    <p className="view-subtitle">Integration guide for headless generation from external software</p>
                </div>
            </BlurFade>

            <div className="docs-grid">
                <div className="docs-main glass">
                    <section className="docs-section">
                        <div className="section-header">
                            <Zap size={18} />
                            <h3>Authentication</h3>
                        </div>
                        <p>All API requests must be authenticated using the session cookie or a Bearer token. For local scripts, ensure you handle the NextAuth session properly.</p>
                    </section>

                    <section className="docs-section">
                        <div className="section-header">
                            <Code size={18} />
                            <h3>Endpoints</h3>
                        </div>

                        <div className="endpoint-item">
                            <span className="method post">POST</span>
                            <span className="url">/api/generate</span>
                            <p className="desc">Trigger a new thumbnail generation job.</p>
                            <pre><code>{`{
  "channelId": "string",
  "archetypeId": "string",
  "videoTopic": "string",
  "thumbnailText": "string",
  "customPrompt": "string" // Optional
}`}</code></pre>
                        </div>

                        <div className="endpoint-item">
                            <span className="method post">POST</span>
                            <span className="url">/api/generate/translate</span>
                            <p className="desc">Create localized versions of an existing job.</p>
                            <pre><code>{`{
  "masterJobId": "string",
  "targetLanguages": ["German", "Spanish", "French"]
}`}</code></pre>
                        </div>

                        <div className="endpoint-item">
                            <span className="method get">GET</span>
                            <span className="url">/api/jobs/[id]</span>
                            <p className="desc">Check job status and retrieve the output URL.</p>
                        </div>
                    </section>
                </div>

                <aside className="docs-sidebar glass">
                    <div className="sidebar-section">
                        <Terminal size={18} />
                        <h3>Python Snippet</h3>
                        <pre><code>{`import requests

url = "http://localhost:3071/api/generate"
payload = {
    "channelId": "cl...",
    "videoTopic": "Modern AI Tools",
    "thumbnailText": "TITAN V4"
}
response = requests.post(url, json=payload)`}</code></pre>
                    </div>
                </aside>
            </div>

            <style jsx>{`
        .docs-container { max-width: 1000px; margin: 0 auto; }
        .view-header { margin-bottom: 2rem; }
        .view-title { font-size: 2.25rem; font-weight: 800; }
        .view-subtitle { color: var(--muted-foreground); }

        .docs-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }
        .docs-main, .docs-sidebar { padding: 2rem; border-radius: var(--radius); }

        .docs-section { margin-bottom: 3rem; }
        .section-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; color: #fff; }
        .section-header h3 { margin: 0; font-size: 1.25rem; font-weight: 700; }

        .endpoint-item { margin-bottom: 2rem; padding: 1.5rem; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border); border-radius: 12px; }
        .method { padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 800; margin-right: 0.75rem; }
        .method.post { background: #fff; color: #000; }
        .method.get { background: #27272a; color: #fff; }
        .url { font-family: monospace; font-size: 0.9rem; color: #fff; }
        .desc { font-size: 0.875rem; color: var(--muted-foreground); margin: 0.75rem 0; }

        pre { background: #000; padding: 1rem; border-radius: 8px; font-size: 0.8rem; overflow-x: auto; border: 1px solid var(--border); }
        code { color: #a1a1aa; font-family: 'JetBrains Mono', monospace; }

        .sidebar-section h3 { font-size: 1rem; color: #fff; margin-bottom: 1rem; }
      `}</style>
        </div>
    );
}
