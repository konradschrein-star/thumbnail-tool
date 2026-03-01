'use client';

import { signIn } from 'next-auth/react';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';

interface LoginFormProps {
  className?: string;
  variant?: 'glass' | 'minimal' | 'liquid';
}

export default function LoginForm({ className = '', variant = 'glass' }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showRequest, setShowRequest] = useState(false);
  const [requestName, setRequestName] = useState('');
  const [requestEmail, setRequestEmail] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);

  const handleRequestAccess = async (e: FormEvent) => {
    e.preventDefault();
    setRequestLoading(true);
    setRequestSuccess('');

    try {
      const resp = await fetch('/api/auth/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: requestName,
          email: requestEmail,
          reason: requestReason
        })
      });

      const data = await resp.json();
      if (data.success) {
        setRequestSuccess(data.message);
        setRequestName('');
        setRequestEmail('');
        setRequestReason('');
      } else {
        setError(data.error || 'Failed to send request');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setRequestLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else if (result?.ok) {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`login-form-wrapper ${variant} ${className}`}>
      <div className="login-card">
        <div className="card-header">
          <h2 className="title">
            {showRequest ? "Apply for Access" : "Type your credentials here"}
          </h2>
          <p className="subtitle">
            {showRequest
              ? "Join the elite creator network."
              : "or request access."}
          </p>
        </div>

        {!showRequest ? (
          <form onSubmit={handleSubmit} className="form-content">
            <div className="input-group">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                placeholder="admin@titan.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="login-password">Secret</label>
              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="status-message error"
                >
                  <AlertTriangle size={14} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" disabled={loading} className="submit-action">
              {loading ? "Authenticating..." : (
                <>Authorize <ArrowRight size={18} /></>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowRequest(true)}
              className="secondary-toggle"
            >
              Request Access
            </button>
          </form>
        ) : (
          <form onSubmit={handleRequestAccess} className="form-content">
            <div className="input-group">
              <label htmlFor="req-name">Name</label>
              <input
                id="req-name"
                type="text"
                value={requestName}
                onChange={(e) => setRequestName(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="req-email">Email</label>
              <input
                id="req-email"
                type="email"
                value={requestEmail}
                onChange={(e) => setRequestEmail(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="req-purpose">Purpose</label>
              <textarea
                id="req-purpose"
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                rows={2}
                required
              />
            </div>

            <AnimatePresence mode="wait">
              {requestSuccess && (
                <motion.div className="status-message success">
                  <ShieldCheck size={14} />
                  {requestSuccess}
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" disabled={requestLoading || !!requestSuccess} className="submit-action">
              {requestLoading ? "Sending..." : "Submit Application"}
            </button>

            <button
              type="button"
              onClick={() => setShowRequest(false)}
              className="secondary-toggle"
            >
              Back to Login
            </button>
          </form>
        )}

        <div className="card-footer">
          <p>Demo: test@titan.ai / test</p>
        </div>
      </div>

      <style jsx>{`
        .login-form-wrapper {
          width: 100%;
          max-width: 400px;
          position: relative;
          font-family: 'Times New Roman', Times, serif;
          pointer-events: auto;
        }

        .login-card {
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        /* Glass Variant */
        .glass .login-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }

        /* Minimal Variant */
        .minimal .login-card {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0;
        }

        /* Liquid Variant */
        .liquid .login-card {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(40px) saturate(200%);
          -webkit-backdrop-filter: blur(40px) saturate(200%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 48px;
          box-shadow: 
            0 0 0 1px rgba(255, 255, 255, 0.05),
            0 20px 50px rgba(0, 0, 0, 0.5),
            inset 0 0 20px rgba(255, 255, 255, 0.02);
          position: relative;
          overflow: hidden;
        }

        .liquid .login-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg, 
            transparent 0%, 
            rgba(139, 92, 246, 0.05) 50%, 
            transparent 100%
          );
          pointer-events: none;
        }

        .card-header {
          text-align: center;
        }

        .title {
          font-size: 1.25rem;
          font-weight: 400;
          font-style: italic;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 0.25rem;
        }

        .icon {
          color: rgba(255, 255, 255, 0.6);
        }

        .subtitle {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.4);
          font-weight: 500;
        }

        .form-content {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .input-group label {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(255, 255, 255, 0.3);
          padding-left: 0.5rem;
        }

        .input-group input, 
        .input-group textarea {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0.75rem 1rem;
          border-radius: 12px;
          color: #fff;
          font-size: 0.95rem;
          transition: all 0.2s;
        }

        .input-group input:focus,
        .input-group textarea:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .status-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          font-size: 0.8rem;
          border-radius: 10px;
        }

        .status-message.error {
          background: rgba(239, 68, 68, 0.1);
          color: #fca5a5;
        }

        .status-message.success {
          background: rgba(34, 197, 94, 0.1);
          color: #86efac;
        }

        .submit-action {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: #fff;
          color: #000;
          border: none;
          padding: 0.875rem;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .liquid .submit-action {
          background: linear-gradient(135deg, #a855f7 0%, #7e22ce 100%);
          color: #fff;
          border: none;
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.4),
                      0 0 40px rgba(168, 85, 247, 0.2);
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          letter-spacing: 0.05em;
        }

        .liquid .submit-action:hover {
          background: linear-gradient(135deg, #c084fc 0%, #9333ea 100%);
          box-shadow: 0 0 30px rgba(168, 85, 247, 0.6),
                      0 0 60px rgba(168, 85, 247, 0.3);
          transform: translateY(-3px) scale(1.02);
        }

        .submit-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .secondary-toggle {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.3);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
          transition: color 0.2s;
        }

        .secondary-toggle:hover {
          color: rgba(255, 255, 255, 0.6);
        }

        .card-footer {
          text-align: center;
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.2);
          font-weight: 600;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 1rem;
        }
      `}</style>
    </div>
  );
}
