'use client';

import { BlurFade } from '../components/ui/blur-fade';
import {
    BookOpen,
    Settings,
    Zap,
    HelpCircle,
    Image as ImageIcon,
    Palette,
    Layout,
    Info
} from 'lucide-react';

export default function GuidePage() {
    return (
        <div className="guide-container">
            <BlurFade delay={0.1}>
                <header className="guide-header">
                    <BookOpen className="icon" />
                    <h1>Software Usage Guide</h1>
                    <p>Learn how to master the V3 Thumbnail Creator tools.</p>
                </header>

                <div className="guide-grid">
                    <section className="guide-section card">
                        <h2><Zap className="icon" /> Core Workflow</h2>
                        <ol>
                            <li><strong>Select Channel:</strong> Each channel has its own persona and branding tokens (V3).</li>
                            <li><strong>Pick Archetype:</strong> Select a layout template. Global templates are marked as <code>[General]</code>.</li>
                            <li><strong>Input Topic:</strong> Describe the video. V3 uses keyword detection for dynamic styling.</li>
                            <li><strong>Refine Draft:</strong> Open the "Editable Generation Prompt" to tweak instructions manually (V3).</li>
                        </ol>
                    </section>

                    <section className="guide-section card">
                        <h2><Palette className="icon" /> Dynamic Branding</h2>
                        <p>
                            The AI now recognizes specific topics. If your topic contains brands like
                            <code>Snapchat</code>, <code>WhatsApp</code>, or <code>YouTube</code>, it automatically
                            injects the corresponding brand colors into the generation.
                        </p>
                        <div className="info-box">
                            <Info size={16} />
                            <span>You can configure channel-specific "Color Tokens" in the Channels settings.</span>
                        </div>
                    </section>

                    <section className="guide-section card">
                        <h2><Layout className="icon" /> Archetype Management</h2>
                        <p>
                            Archetypes are now categorized. You can search for specific layout styles
                            directly in the generation form.
                        </p>
                        <ul>
                            <li><strong>Global Archetypes:</strong> Templates available to all channels.</li>
                            <li><strong>Channel Archetypes:</strong> Specific to one brand's visual identity.</li>
                        </ul>
                    </section>

                    <section className="guide-section card">
                        <h2><Settings className="icon" /> Pro Tips</h2>
                        <ul>
                            <li>Use high-contrast text descriptions for better AI interpretation.</li>
                            <li>Persona images are used as structural references; ensure they have clear outlines.</li>
                            <li>Logo references are now optional in V3 - the AI will stylize branding without them if needed.</li>
                        </ul>
                    </section>
                </div>
            </BlurFade>

            <style jsx>{`
        .guide-container {
          max-width: 1200px;
          margin: 0 auto;
          padding-bottom: 4rem;
        }

        .guide-header {
          text-align: center;
          margin-bottom: 4rem;
        }

        .guide-header h1 {
          font-family: var(--font-outfit);
          font-size: 2.5rem;
          margin: 1rem 0 0.5rem;
        }

        .guide-header p {
          color: var(--muted-foreground);
        }

        .guide-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
        }

        .guide-section {
          padding: 2rem;
        }

        .guide-section h2 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.25rem;
          margin-bottom: 1.5rem;
          font-family: var(--font-outfit);
        }

        .guide-section p {
          color: var(--muted-foreground);
          line-height: 1.6;
          margin-bottom: 1rem;
        }

        .guide-section ol, .guide-section ul {
          padding-left: 1.25rem;
          color: var(--muted-foreground);
        }

        .guide-section li {
          margin-bottom: 0.75rem;
        }

        .card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .card:hover {
          border-color: #404040;
          transform: translateY(-2px);
        }

        .icon {
          color: #ffffff;
        }

        .info-box {
          display: flex;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          font-size: 0.85rem;
          color: var(--muted-foreground);
          margin-top: 1rem;
        }

        code {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-size: 0.9em;
          color: #ffffff;
        }
      `}</style>
        </div>
    );
}
