import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redisConnection } from '@/lib/queue/connection';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const health: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {},
  };

  // Check PostgreSQL Database
  try {
    const result = await prisma.$queryRaw`SELECT 1`;
    health.checks.database = {
      status: 'ok',
      responseTime: `${Date.now() - startTime}ms`,
    };
  } catch (error: any) {
    health.status = 'degraded';
    health.checks.database = {
      status: 'error',
      error: error.message,
    };
  }

  // Check Redis
  try {
    const redisHealthCheck = await redisConnection.ping();
    if (redisHealthCheck === 'PONG') {
      health.checks.redis = {
        status: 'ok',
        responseTime: `${Date.now() - startTime}ms`,
      };
    } else {
      throw new Error('Unexpected ping response');
    }
  } catch (error: any) {
    health.status = 'degraded';
    health.checks.redis = {
      status: 'error',
      error: error.message,
    };
  }

  // Check Node.js
  health.checks.nodejs = {
    status: 'ok',
    version: process.version,
    memory: {
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
    },
  };

  const statusCode = health.status === 'healthy' ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
