'use client';

/**
 * Enhanced Admin Panel with Comprehensive Monitoring
 *
 * Features:
 * - Tabbed interface (Users, Channels, Jobs, Activity)
 * - Channel ownership management and transfer
 * - Jobs monitoring across all users
 * - User activity tracking
 * - System statistics dashboard
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Users,
  Coins,
  TrendingUp,
  Gift,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Shield,
  AlertCircle,
  Tv,
  Image as ImageIcon,
  ArrowRightLeft,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Wrench,
  UserPlus,
  Edit3,
  Trash2,
  Key,
  Save,
  X as XIcon,
  Minus,
  Plus,
} from 'lucide-react';

type TabType = 'users' | 'channels' | 'jobs' | 'stats';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  credits: number;
  totalCreditsGranted: number;
  totalCreditsConsumed: number;
  createdAt: string;
}

interface Channel {
  id: string;
  name: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  _count: {
    archetypes: number;
    generationJobs: number;
  };
  createdAt: string;
}

interface Job {
  id: string;
  videoTopic: string;
  thumbnailText: string | null;
  status: string;
  outputUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  channel: {
    id: string;
    name: string;
  } | null;
  archetype: {
    id: string;
    name: string;
    imageUrl: string | null;
  } | null;
}

interface Stats {
  users: {
    total: number;
    admins: number;
    active: number;
    withCredits: number;
  };
  credits: {
    totalAvailable: number;
    totalGranted: number;
    totalConsumed: number;
  };
  jobs: {
    byStatus: Record<string, number>;
    total: number;
  };
}

interface Transaction {
  id: string;
  transactionType: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
  adminUser?: { email: string; name: string | null } | null;
}

export default function EnhancedAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('stats');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  // Filter states
  const [userSearchEmail, setUserSearchEmail] = useState('');
  const [channelSearchTerm, setChannelSearchTerm] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState<string>('all');
  const [jobUserFilter, setJobUserFilter] = useState<string>('all');

  // Grant/Deduct credits form state
  const [grantEmail, setGrantEmail] = useState('');
  const [grantAmount, setGrantAmount] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantSuccess, setGrantSuccess] = useState<string | null>(null);
  const [grantError, setGrantError] = useState<string | null>(null);

  // Create user form state
  const [createEmail, setCreateEmail] = useState('');
  const [createName, setCreateName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<'USER' | 'ADMIN'>('USER');
  const [createCredits, setCreateCredits] = useState('0');
  const [createLoading, setCreateLoading] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit user state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'USER' | 'ADMIN'>('USER');
  const [resetPassword, setResetPassword] = useState('');

  // Channel transfer state
  const [transferChannelId, setTransferChannelId] = useState('');
  const [transferTargetEmail, setTransferTargetEmail] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Fix ownership state
  const [fixOwnershipLoading, setFixOwnershipLoading] = useState(false);
  const [fixOwnershipSuccess, setFixOwnershipSuccess] = useState<string | null>(null);
  const [fixOwnershipError, setFixOwnershipError] = useState<string | null>(null);
  const [fixOwnershipResults, setFixOwnershipResults] = useState<any>(null);

  // Expanded rows
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [userTransactions, setUserTransactions] = useState<Map<string, Transaction[]>>(new Map());

  // Redirect if not admin
  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    loadData();
  }, [status, session, router]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsRes, usersRes, channelsRes, jobsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch(`/api/admin/users?limit=50${userSearchEmail ? `&email=${userSearchEmail}` : ''}`),
        fetch('/api/admin/channels/transfer'),
        fetch('/api/admin/jobs?limit=50'),
      ]);

      if (!statsRes.ok || !usersRes.ok || !channelsRes.ok || !jobsRes.ok) {
        throw new Error('Failed to load admin data');
      }

      const [statsData, usersData, channelsData, jobsData] = await Promise.all([
        statsRes.json(),
        usersRes.json(),
        channelsRes.json(),
        jobsRes.json(),
      ]);

      setStats(statsData.stats);
      setUsers(usersData.users);
      setChannels(channelsData.channels);
      setJobs(jobsData.jobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleGrantCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    setGrantLoading(true);
    setGrantError(null);
    setGrantSuccess(null);

    try {
      const amount = parseInt(grantAmount, 10);

      if (isNaN(amount) || amount === 0) {
        throw new Error('Amount must be a non-zero number');
      }

      const res = await fetch('/api/admin/credits/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: grantEmail,
          amount,
          reason: grantReason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to modify credits');
      }

      const action = amount > 0 ? 'granted' : 'deducted';
      setGrantSuccess(`Successfully ${action} ${Math.abs(amount)} credits ${amount > 0 ? 'to' : 'from'} ${grantEmail}`);
      setGrantEmail('');
      setGrantAmount('');
      setGrantReason('');
      loadData();
    } catch (err) {
      setGrantError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setGrantLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const credits = parseInt(createCredits, 10) || 0;

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createEmail,
          name: createName || null,
          password: createPassword || undefined,
          role: createRole,
          credits,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setCreateSuccess(`User created! ${data.message}`);
      setCreateEmail('');
      setCreateName('');
      setCreatePassword('');
      setCreateRole('USER');
      setCreateCredits('0');
      loadData();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditUser = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          email: editEmail,
          name: editName,
          role: editRole,
          newPassword: resetPassword || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      if (data.newPassword) {
        alert(`User updated! New password: ${data.newPassword}\n\nPlease save this password and share it with the user.`);
      }

      setEditingUserId(null);
      setResetPassword('');
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleResetPassword = async (userId: string, userEmail: string) => {
    const newPassword = prompt(`Enter new password for ${userEmail} (leave empty to auto-generate):`);
    if (newPassword === null) return; // User cancelled

    const password = newPassword.trim() || Math.random().toString(36).slice(-12);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          newPassword: password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      alert(`Password reset successfully!\n\nNew password: ${password}\n\nPlease save this and share it with the user.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reset password');
    }
  };

  const handleTransferChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferLoading(true);
    setTransferError(null);
    setTransferSuccess(null);

    try {
      const res = await fetch('/api/admin/channels/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: transferChannelId,
          targetUserEmail: transferTargetEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to transfer channel');
      }

      setTransferSuccess(data.message);
      setTransferChannelId('');
      setTransferTargetEmail('');
      loadData();
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleFixOwnership = async () => {
    setFixOwnershipLoading(true);
    setFixOwnershipError(null);
    setFixOwnershipSuccess(null);
    setFixOwnershipResults(null);

    try {
      const res = await fetch('/api/admin/fix-ownership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAdminEmail: 'konrad.schrein@gmail.com',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fix ownership');
      }

      setFixOwnershipSuccess(data.message);
      setFixOwnershipResults(data.results);
      loadData();
    } catch (err) {
      setFixOwnershipError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setFixOwnershipLoading(false);
    }
  };

  const toggleUserExpand = async (userId: string) => {
    const newExpanded = new Set(expandedUsers);

    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
      setExpandedUsers(newExpanded);
    } else {
      newExpanded.add(userId);
      setExpandedUsers(newExpanded);

      if (!userTransactions.has(userId)) {
        try {
          const res = await fetch(`/api/admin/credits/transactions?userId=${userId}&limit=20`);
          if (res.ok) {
            const data = await res.json();
            setUserTransactions(new Map(userTransactions.set(userId, data.transactions)));
          }
        } catch (err) {
          console.error('Failed to load transactions:', err);
        }
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'processing':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Filter data based on search/filter terms
  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(channelSearchTerm.toLowerCase()) ||
    channel.user.email.toLowerCase().includes(channelSearchTerm.toLowerCase())
  );

  const filteredJobs = jobs.filter(job => {
    const statusMatch = jobStatusFilter === 'all' || job.status === jobStatusFilter;
    const userMatch = jobUserFilter === 'all' || job.user.id === jobUserFilter;
    return statusMatch && userMatch;
  });

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="flex items-center gap-3 text-white">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="text-lg">Loading admin panel...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-400 mb-2">
            <AlertCircle className="w-6 h-6" />
            <h2 className="text-xl font-bold">Error</h2>
          </div>
          <p className="text-red-300">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold">Admin Control Panel</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-700">
          {[
            { id: 'stats' as TabType, label: 'Dashboard', icon: TrendingUp },
            { id: 'users' as TabType, label: 'Users & Credits', icon: Users },
            { id: 'channels' as TabType, label: 'Channels', icon: Tv },
            { id: 'jobs' as TabType, label: 'Jobs & Thumbnails', icon: ImageIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-all ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'stats' && stats && (
          <div>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold">{stats.users.total}</h3>
                <p className="text-gray-400 text-sm">Total Users</p>
                <p className="text-xs text-gray-500 mt-2">
                  {stats.users.active} active • {stats.users.admins} admins
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <Coins className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold">{stats.credits.totalAvailable.toLocaleString()}</h3>
                <p className="text-gray-400 text-sm">Credits Available</p>
                <p className="text-xs text-gray-500 mt-2">
                  {stats.users.withCredits} users with credits
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <Gift className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold">{stats.credits.totalGranted.toLocaleString()}</h3>
                <p className="text-gray-400 text-sm">Credits Granted</p>
              </div>

              <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-orange-400" />
                </div>
                <h3 className="text-2xl font-bold">{stats.credits.totalConsumed.toLocaleString()}</h3>
                <p className="text-gray-400 text-sm">Credits Consumed</p>
              </div>
            </div>

            {/* Jobs Statistics */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">Jobs Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.jobs.byStatus).map(([status, count]) => (
                  <div key={status} className="bg-gray-900/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(status)}
                      <span className="text-sm text-gray-400 capitalize">{status}</span>
                    </div>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* System Maintenance */}
            <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Wrench className="w-6 h-6 text-orange-400" />
                  <h2 className="text-xl font-bold">System Maintenance</h2>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-2">Fix Channel Ownership</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Automatically transfers admin channels (Peter's Help, Harry, Gary's Guides) to the admin account
                    and ensures test channels (test, test2) are owned by the test account.
                  </p>
                  <button
                    onClick={handleFixOwnership}
                    disabled={fixOwnershipLoading}
                    className="px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    {fixOwnershipLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Fixing...
                      </>
                    ) : (
                      <>
                        <Wrench className="w-4 h-4" />
                        Fix Ownership Now
                      </>
                    )}
                  </button>
                </div>

                {fixOwnershipSuccess && (
                  <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-green-400 mb-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-semibold">{fixOwnershipSuccess}</span>
                    </div>
                    {fixOwnershipResults && (
                      <div className="mt-3 space-y-2 text-sm">
                        {fixOwnershipResults.transferred && fixOwnershipResults.transferred.length > 0 && (
                          <div className="bg-gray-900/50 rounded p-3">
                            <p className="font-semibold text-white mb-2">Transferred:</p>
                            {fixOwnershipResults.transferred.map((t: any, i: number) => (
                              <div key={i} className="text-gray-300 ml-2">
                                • "{t.name}" from {t.from} → {t.to}
                              </div>
                            ))}
                          </div>
                        )}
                        {fixOwnershipResults.skipped && fixOwnershipResults.skipped.length > 0 && (
                          <div className="bg-gray-900/50 rounded p-3">
                            <p className="font-semibold text-white mb-2">Skipped (already correct):</p>
                            {fixOwnershipResults.skipped.map((s: any, i: number) => (
                              <div key={i} className="text-gray-400 ml-2">
                                • "{s.name}" - {s.reason}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {fixOwnershipError && (
                  <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      <span>{fixOwnershipError}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Create User Form */}
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-blue-400" />
                Create New User
              </h2>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Email *</label>
                    <input
                      type="email"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      required
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="user@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Name</label>
                    <input
                      type="text"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Password (auto-gen if empty)</label>
                    <input
                      type="text"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="Auto-generate"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Role</label>
                    <select
                      value={createRole}
                      onChange={(e) => setCreateRole(e.target.value as 'USER' | 'ADMIN')}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Initial Credits</label>
                    <input
                      type="number"
                      value={createCredits}
                      onChange={(e) => setCreateCredits(e.target.value)}
                      min="0"
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="0"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  {createLoading ? 'Creating...' : 'Create User'}
                </button>
              </form>

              {createSuccess && (
                <div className="mt-4 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 whitespace-pre-wrap">
                  {createSuccess}
                </div>
              )}
              {createError && (
                <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
                  {createError}
                </div>
              )}
            </div>

            {/* Grant/Deduct Credits Form */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Gift className="w-6 h-6 text-purple-400" />
                Grant or Deduct Credits
              </h2>

              <form onSubmit={handleGrantCredits} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">User Email</label>
                    <input
                      type="email"
                      value={grantEmail}
                      onChange={(e) => setGrantEmail(e.target.value)}
                      required
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                      placeholder="user@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Amount (positive to grant, negative to deduct)
                    </label>
                    <input
                      type="number"
                      value={grantAmount}
                      onChange={(e) => setGrantAmount(e.target.value)}
                      required
                      min="-10000"
                      max="10000"
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                      placeholder="50 or -20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Reason</label>
                    <input
                      type="text"
                      value={grantReason}
                      onChange={(e) => setGrantReason(e.target.value)}
                      required
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                      placeholder="Welcome credits / Refund / etc."
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={grantLoading}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Coins className="w-4 h-4" />
                    {grantLoading ? 'Processing...' : 'Modify Credits'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGrantAmount('100')}
                    className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-sm transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    +100
                  </button>
                  <button
                    type="button"
                    onClick={() => setGrantAmount('-50')}
                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-sm transition-colors flex items-center gap-1"
                  >
                    <Minus className="w-3 h-3" />
                    -50
                  </button>
                </div>
              </form>

              {grantSuccess && (
                <div className="mt-4 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400">
                  {grantSuccess}
                </div>
              )}
              {grantError && (
                <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
                  {grantError}
                </div>
              )}
            </div>

            {/* User Search */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={userSearchEmail}
                  onChange={(e) => setUserSearchEmail(e.target.value)}
                  placeholder="Search users by email..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-white"
                />
                <button
                  onClick={loadData}
                  className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg transition-colors"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Credits
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Total Granted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Total Consumed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {users.map((user) => (
                      <React.Fragment key={user.id}>
                        <tr className="hover:bg-gray-900/30">
                          <td className="px-6 py-4">
                            {editingUserId === user.id ? (
                              <div className="space-y-2">
                                <input
                                  type="email"
                                  value={editEmail}
                                  onChange={(e) => setEditEmail(e.target.value)}
                                  className="w-full px-3 py-1 bg-gray-900 border border-gray-700 rounded text-sm"
                                  placeholder="Email"
                                />
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full px-3 py-1 bg-gray-900 border border-gray-700 rounded text-sm"
                                  placeholder="Name"
                                />
                                <input
                                  type="text"
                                  value={resetPassword}
                                  onChange={(e) => setResetPassword(e.target.value)}
                                  className="w-full px-3 py-1 bg-gray-900 border border-yellow-700 rounded text-sm"
                                  placeholder="New password (optional)"
                                />
                              </div>
                            ) : (
                              <div>
                                <div className="text-sm font-medium text-white">{user.email}</div>
                                {user.name && (
                                  <div className="text-sm text-gray-400">{user.name}</div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingUserId === user.id ? (
                              <select
                                value={editRole}
                                onChange={(e) => setEditRole(e.target.value as 'USER' | 'ADMIN')}
                                className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-sm"
                              >
                                <option value="USER">USER</option>
                                <option value="ADMIN">ADMIN</option>
                              </select>
                            ) : (
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded ${
                                  user.role === 'ADMIN'
                                    ? 'bg-purple-500/20 text-purple-400'
                                    : 'bg-gray-500/20 text-gray-400'
                                }`}
                              >
                                {user.role}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                            {user.credits}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {user.totalCreditsGranted}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {user.totalCreditsConsumed}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {editingUserId === user.id ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEditUser(user.id)}
                                  className="text-green-400 hover:text-green-300 flex items-center gap-1"
                                  title="Save changes"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingUserId(null);
                                    setResetPassword('');
                                  }}
                                  className="text-gray-400 hover:text-gray-300 flex items-center gap-1"
                                  title="Cancel"
                                >
                                  <XIcon className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingUserId(user.id);
                                    setEditEmail(user.email);
                                    setEditName(user.name || '');
                                    setEditRole(user.role as 'USER' | 'ADMIN');
                                    setResetPassword('');
                                  }}
                                  className="text-blue-400 hover:text-blue-300"
                                  title="Edit user"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleResetPassword(user.id, user.email)}
                                  className="text-yellow-400 hover:text-yellow-300"
                                  title="Reset password"
                                >
                                  <Key className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => toggleUserExpand(user.id)}
                                  className="text-purple-400 hover:text-purple-300"
                                  title="View transactions"
                                >
                                  {expandedUsers.has(user.id) ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id, user.email)}
                                  className="text-red-400 hover:text-red-300"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                        {expandedUsers.has(user.id) && (
                          <tr>
                            <td colSpan={6} className="px-6 py-4 bg-gray-900/50">
                              <div className="space-y-2">
                                <h4 className="font-medium text-white mb-2">Transaction History</h4>
                                {userTransactions.get(user.id)?.length === 0 && (
                                  <p className="text-sm text-gray-400">No transactions found.</p>
                                )}
                                {userTransactions.get(user.id)?.map((tx) => (
                                  <div
                                    key={tx.id}
                                    className="flex items-center justify-between py-2 px-4 bg-gray-800/50 rounded"
                                  >
                                    <div>
                                      <span
                                        className={`text-sm font-medium ${
                                          tx.transactionType === 'grant'
                                            ? 'text-green-400'
                                            : 'text-red-400'
                                        }`}
                                      >
                                        {tx.transactionType === 'grant' ? '+' : '-'}
                                        {tx.amount} credits
                                      </span>
                                      <span className="text-sm text-gray-400 ml-4">
                                        {tx.reason}
                                      </span>
                                      {tx.adminUser && (
                                        <span className="text-xs text-gray-500 ml-2">
                                          by {tx.adminUser.email}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {formatDate(tx.createdAt)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'channels' && (
          <div className="space-y-6">
            {/* Channel Transfer Form */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <ArrowRightLeft className="w-6 h-6 text-blue-400" />
                Transfer Channel Ownership
              </h2>

              <form onSubmit={handleTransferChannel} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Channel</label>
                    <select
                      value={transferChannelId}
                      onChange={(e) => setTransferChannelId(e.target.value)}
                      required
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="">Select a channel...</option>
                      {channels.map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          {channel.name} (owned by {channel.user.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      New Owner Email
                    </label>
                    <input
                      type="email"
                      value={transferTargetEmail}
                      onChange={(e) => setTransferTargetEmail(e.target.value)}
                      required
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="newowner@example.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={transferLoading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                >
                  {transferLoading ? 'Transferring...' : 'Transfer Channel'}
                </button>
              </form>

              {transferSuccess && (
                <div className="mt-4 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400">
                  {transferSuccess}
                </div>
              )}
              {transferError && (
                <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
                  {transferError}
                </div>
              )}
            </div>

            {/* Channel Search */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={channelSearchTerm}
                  onChange={(e) => setChannelSearchTerm(e.target.value)}
                  placeholder="Search channels by name or owner..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-white"
                />
              </div>
            </div>

            {/* Channels Table */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Channel Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Owner
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Archetypes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Jobs
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredChannels.map((channel) => (
                      <tr key={channel.id} className="hover:bg-gray-900/30">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{channel.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">{channel.user.email}</div>
                          {channel.user.name && (
                            <div className="text-xs text-gray-400">{channel.user.name}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {channel._count.archetypes}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {channel._count.generationJobs}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {formatDate(channel.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="space-y-6">
            {/* Job Filters */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-400">Filter:</span>
                </div>
                <select
                  value={jobStatusFilter}
                  onChange={(e) => setJobStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="processing">Processing</option>
                </select>
                <select
                  value={jobUserFilter}
                  onChange={(e) => setJobUserFilter(e.target.value)}
                  className="px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-sm"
                >
                  <option value="all">All Users</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Jobs Table */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Video Topic
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Channel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Archetype
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-gray-900/30">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(job.status)}
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(
                                job.status
                              )}`}
                            >
                              {job.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">{job.user.email}</div>
                          <span
                            className={`text-xs ${
                              job.user.role === 'ADMIN'
                                ? 'text-purple-400'
                                : 'text-gray-500'
                            }`}
                          >
                            {job.user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-white max-w-xs truncate">
                            {job.videoTopic}
                          </div>
                          {job.thumbnailText && (
                            <div className="text-xs text-gray-400 max-w-xs truncate">
                              "{job.thumbnailText}"
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {job.channel?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {job.archetype?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {formatDate(job.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {job.outputUrl && (
                            <a
                              href={job.outputUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
