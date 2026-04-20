import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function AdminPanel() {
  const session = await auth();

  // Check if user is admin
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    redirect('/dashboard');
  }

  // Fetch system stats
  const [
    totalUsers,
    totalChannels,
    totalArchetypes,
    totalJobs,
    recentJobs,
    allChannels,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.channel.count(),
    prisma.archetype.count(),
    prisma.generationJob.count(),
    prisma.generationJob.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        channel: { select: { name: true } },
        archetype: { select: { name: true } },
      },
    }),
    prisma.channel.findMany({
      include: {
        user: { select: { email: true, name: true } },
        _count: { select: { archetypes: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const completedJobs = await prisma.generationJob.count({
    where: { status: 'completed' },
  });

  const failedJobs = await prisma.generationJob.count({
    where: { status: 'failed' },
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#f8fafc', marginBottom: '0.5rem' }}>
          Admin Panel
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1.125rem' }}>
          System administration and monitoring
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '1.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f8fafc' }}>{totalUsers}</div>
          <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Total Users</div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '1.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f8fafc' }}>{totalChannels}</div>
          <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Total Channels</div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '1.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f8fafc' }}>{totalArchetypes}</div>
          <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Total Archetypes</div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '1.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f8fafc' }}>{completedJobs}</div>
          <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Completed Jobs</div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '1.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f8fafc' }}>{failedJobs}</div>
          <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Failed Jobs</div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '1.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f8fafc' }}>{totalJobs}</div>
          <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Total Jobs</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f8fafc', marginBottom: '1rem' }}>
          Quick Actions
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <Link href="/bulk" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1.25rem', color: '#f8fafc', textDecoration: 'none', fontWeight: '500' }}>
            📝 Bulk Generation
          </Link>
          <Link href="/dashboard" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1.25rem', color: '#f8fafc', textDecoration: 'none', fontWeight: '500' }}>
            📺 Manage Channels
          </Link>
          <Link href="/dashboard" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1.25rem', color: '#f8fafc', textDecoration: 'none', fontWeight: '500' }}>
            🎨 Manage Archetypes
          </Link>
          <Link href="/dashboard" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1.25rem', color: '#f8fafc', textDecoration: 'none', fontWeight: '500' }}>
            📊 View History
          </Link>
        </div>
      </div>

      {/* All Channels */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f8fafc', marginBottom: '1rem' }}>
          All Channels ({totalChannels})
        </h2>
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
              <tr>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#94a3b8' }}>Channel</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#94a3b8' }}>Owner</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#94a3b8' }}>Archetypes</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#94a3b8' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {allChannels.map((channel) => (
                <tr key={channel.id}>
                  <td style={{ padding: '1rem', color: '#f8fafc', fontWeight: '600' }}>{channel.name}</td>
                  <td style={{ padding: '1rem', color: '#e2e8f0' }}>{channel.user?.email || 'N/A'}</td>
                  <td style={{ padding: '1rem', color: '#e2e8f0' }}>{channel._count.archetypes}</td>
                  <td style={{ padding: '1rem', color: '#e2e8f0' }}>{new Date(channel.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
