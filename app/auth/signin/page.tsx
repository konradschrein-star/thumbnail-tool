'use client';

import { signIn } from 'next-auth/react';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { GridPattern } from '../../dashboard/components/ui/grid-pattern';
import { Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function SignIn() {
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
    <div className="signin-container">
      <div className="background-effects">
        <GridPattern
          width={60}
          height={60}
          x={-1}
          y={-1}
          className="opacity-10"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="signin-card-wrapper"
      >
        <div className="signin-card glass">
          <div className="card-header">
            <motion.h1
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="logo"
            >
              <Sparkles size={24} style={{ marginRight: '0.8rem', verticalAlign: 'middle' }} />
              Command Center
            </motion.h1>
            <p className="subtitle">
              {showRequest
                ? "Submit your application to gain access to the creator tools."
                : "Enter your credentials to access the command center."}
            </p>
          </div>

          {!showRequest ? (
            <form onSubmit={handleSubmit} className="signin-form">
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Secret Password</label>
                <input
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
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="error-message"
                  >
                    <AlertTriangle size={16} className="error-icon" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="submit-container">
                <button
                  type="submit"
                  disabled={loading}
                  className="submit-btn"
                >
                  {loading ? 'Authenticating...' : 'Gain Access'}
                </button>
              </div>

              <div className="toggle-section">
                <button
                  type="button"
                  onClick={() => { setShowRequest(true); setError(''); }}
                  className="toggle-btn"
                >
                  No account? Request Access
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRequestAccess} className="signin-form">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Konrad Schrein"
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="konrad.schrein@gmail.com"
                  value={requestEmail}
                  onChange={(e) => setRequestEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Why do you need access?</label>
                <textarea
                  placeholder="I'm a designer looking to automate my workflow..."
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  rows={3}
                  className="text-input"
                  required
                />
              </div>

              <AnimatePresence mode="wait">
                {requestSuccess && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="success-message"
                  >
                    <ShieldCheck size={16} className="success-icon" />
                    {requestSuccess}
                  </motion.div>
                )}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="error-message"
                  >
                    <AlertTriangle size={16} className="error-icon" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="submit-container">
                <button
                  type="submit"
                  disabled={requestLoading || !!requestSuccess}
                  className="submit-btn"
                >
                  {requestLoading ? 'Sending...' : 'Send Request'}
                </button>
              </div>

              <div className="toggle-section">
                <button
                  type="button"
                  onClick={() => { setShowRequest(false); setError(''); setRequestSuccess(''); }}
                  className="toggle-btn"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}

          <div className="card-footer">
            <p className="hint">
              Test Account: <span className="highlight">test@titan.ai / test</span>
            </p>
            <p className="hint-sub">
              (Shared 10 generations per day group limit)
            </p>
          </div>
        </div>

        <div className="footer-links">
          <span>&copy; 2026 Schreiner Content Systems LLC</span>
        </div>
      </motion.div>

      <style jsx>{`
        .signin-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #000000;
          position: relative;
          color: #f8fafc;
          overflow: hidden;
          padding: 2rem;
        }

        .background-effects {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .signin-card-wrapper {
          width: 100%;
          max-width: 440px;
          position: relative;
          z-index: 10;
        }

        .signin-card {
          padding: 3rem;
          border-radius: 24px;
          background: rgba(15, 23, 42, 0.4);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .glass {
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%);
        }

        .card-header {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .logo {
          font-size: 1.75rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          background: linear-gradient(to bottom right, #fff, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          color: #94a3b8;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .signin-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding-left: 0.25rem;
        }

        .form-group input {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 0.875rem 1rem;
          color: #fff;
          font-size: 1rem;
          transition: all 0.2s ease;
        }

        .form-group input:focus {
          outline: none;
          border-color: #ffffff;
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.05);
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          color: #fca5a5;
          font-size: 0.875rem;
          overflow: hidden;
        }

        .submit-btn {
          width: 100%;
          height: 3rem;
          background: #ffffff;
          color: #000000;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .submit-btn:hover {
          background: #e4e4e7;
          transform: translateY(-1px);
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .submit-container {
          margin-top: 0.5rem;
        }

        .card-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 1.5rem;
          text-align: center;
        }

        .hint {
          font-size: 0.8125rem;
          color: #475569;
        }

        .highlight {
          color: #94a3b8;
          font-weight: 500;
        }

        .toggle-section {
          text-align: center;
          margin-top: 0.5rem;
        }

        .toggle-btn {
          background: none;
          border: none;
          color: #64748b;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: color 0.2s ease;
          text-decoration: underline;
        }

        .toggle-btn:hover {
          color: #94a3b8;
        }

        .success-message {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
          border-radius: 12px;
          color: #86efac;
          font-size: 0.875rem;
          overflow: hidden;
        }

        .text-input {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 0.875rem 1rem;
          color: #fff;
          font-size: 1rem;
          transition: all 0.2s ease;
          resize: none;
        }

        .text-input:focus {
          outline: none;
          border-color: #ffffff;
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.05);
        }

        .footer-links {
          margin-top: 2rem;
          text-align: center;
          font-size: 0.75rem;
          color: #334155;
        }
      `}</style>
    </div>
  );
}
