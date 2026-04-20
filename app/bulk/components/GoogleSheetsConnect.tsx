'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface GoogleSheetsConnectProps {
  isConnected: boolean;
  onConnected: () => void;
}

export function GoogleSheetsConnect({ isConnected, onConnected }: GoogleSheetsConnectProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<{
    sheetId?: string;
    sheetName?: string;
    lastSync?: string;
  } | null>(null);

  useEffect(() => {
    // Check if already connected
    if (isConnected) {
      checkConnection();
    }
  }, [isConnected]);

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/sheets/preview');
      if (response.ok) {
        const data = await response.json();
        setConnectionInfo({
          sheetId: data.sheetId,
          sheetName: data.sheetName,
          lastSync: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Failed to check connection:', err);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sheets/connect');
      if (!response.ok) {
        throw new Error('Failed to initiate connection');
      }

      const data = await response.json();
      // Redirect to Google OAuth
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (err: any) {
      setError(err.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sheets/disconnect', { method: 'POST' });
      if (response.ok) {
        setConnectionInfo(null);
        // Optionally refresh or update parent state
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (err: any) {
      setError(err.message || 'Disconnection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Google Sheets Connection</h2>
          <p className="text-slate-400">Connect your Google Sheets to bulk generate thumbnails</p>
        </div>
        {isConnected && <CheckCircle className="w-6 h-6 text-green-400" />}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {isConnected && connectionInfo ? (
        <div className="space-y-4">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">Sheet ID</p>
                <p className="text-white font-mono text-sm break-all">
                  {connectionInfo.sheetId || 'Loading...'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Sheet Name</p>
                <p className="text-white">{connectionInfo.sheetName || 'Loading...'}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Disconnecting...
              </span>
            ) : (
              'Disconnect Google Sheets'
            )}
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
              </svg>
              Connect Google Sheets
            </>
          )}
        </button>
      )}
    </div>
  );
}
