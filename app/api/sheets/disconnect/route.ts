/**
 * Google Sheets Disconnect Endpoint
 * Revokes OAuth connection and removes stored tokens
 *
 * POST /api/sheets/disconnect
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { decrypt, decodeAndDecrypt, getEncryptionKeyFromEnv } from '@/lib/crypto';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in first' },
        { status: 401 }
      );
    }

    const userId = session.user.id as string;

    // Find existing connection
    const connection = await prisma.google_sheets_connections.findUnique({
      where: { userId },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'No Google Sheets connection found' },
        { status: 404 }
      );
    }

    // Decrypt access token to revoke it
    try {
      const encryptionKey = getEncryptionKeyFromEnv();
      const accessToken = decodeAndDecrypt(connection.accessToken, encryptionKey);

      // Create OAuth2 client
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (clientId && clientSecret) {
        const oauth2Client = new google.auth.OAuth2(
          clientId,
          clientSecret
        );

        // Revoke the token
        try {
          await oauth2Client.revokeToken(accessToken);
          console.log(`✓ Google OAuth token revoked for user: ${userId}`);
        } catch (revokeError) {
          // Token may already be invalid, continue with deletion
          console.warn(`Token revocation failed (may already be invalid): ${revokeError instanceof Error ? revokeError.message : String(revokeError)}`);
        }
      }
    } catch (decryptError) {
      console.warn(`Failed to decrypt and revoke token: ${decryptError instanceof Error ? decryptError.message : String(decryptError)}`);
    }

    // Delete connection record from database
    await prisma.google_sheets_connections.delete({
      where: { userId },
    });

    console.log(`✓ Google Sheets connection deleted for user: ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Google Sheets connection removed',
    });
  } catch (error) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Google Sheets' },
      { status: 500 }
    );
  }
}
