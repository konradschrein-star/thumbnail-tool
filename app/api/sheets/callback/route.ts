/**
 * Google Sheets OAuth Callback Endpoint
 * Handles OAuth callback from Google, exchanges code for tokens
 * Encrypts and stores tokens in database
 *
 * GET /api/sheets/callback?code=...&state=...
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { encrypt, getEncryptionKeyFromEnv } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  try {
    // Extract authorization code and state
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      const errorDescription = searchParams.get('error_description') || 'Unknown error';
      console.error(`OAuth error: ${error} - ${errorDescription}`);
      return NextResponse.redirect(`/dashboard/sheets?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      console.error('Missing authorization code or state');
      return NextResponse.redirect('/dashboard/sheets?error=invalid_callback');
    }

    // Decode state to get userId
    let userId: string;
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
      userId = decodedState.userId;
    } catch {
      console.error('Invalid state parameter');
      return NextResponse.redirect('/dashboard/sheets?error=invalid_state');
    }

    // Validate environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('Missing Google OAuth environment variables');
      return NextResponse.redirect('/dashboard/sheets?error=missing_config');
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Exchange authorization code for tokens
    console.log(`🔄 Exchanging OAuth code for user: ${userId}`);

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error('No access token received from Google');
    }

    // Decrypt user password for encryption key derivation
    // Note: In production, you may want to derive key from user ID + secret
    const encryptionKey = getEncryptionKeyFromEnv();

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokens.access_token, encryptionKey);
    const encryptedRefreshToken = tokens.refresh_token
      ? encrypt(tokens.refresh_token, encryptionKey)
      : null;

    // Calculate token expiration
    const expiresIn = tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600 * 1000);

    // Store connection in database (upsert to handle reconnection)
    await prisma.google_sheets_connections.upsert({
      where: { userId },
      create: {
        userId,
        accessToken: JSON.stringify(encryptedAccessToken),
        refreshToken: encryptedRefreshToken ? JSON.stringify(encryptedRefreshToken) : '',
        expiresAt: expiresIn,
      },
      update: {
        accessToken: JSON.stringify(encryptedAccessToken),
        refreshToken: encryptedRefreshToken ? JSON.stringify(encryptedRefreshToken) : '',
        expiresAt: expiresIn,
        updatedAt: new Date(),
      },
    });

    console.log(`✓ Google Sheets connection established for user: ${userId}`);

    // Redirect to sheets management page with success
    return NextResponse.redirect('/dashboard/sheets?connected=true');
  } catch (error) {
    console.error('OAuth callback error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.redirect(`/dashboard/sheets?error=${encodeURIComponent(errorMsg)}`);
  }
}
