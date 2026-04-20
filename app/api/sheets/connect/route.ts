/**
 * Google Sheets OAuth Initiation Endpoint
 * Initiates the OAuth 2.0 flow for Google Sheets access
 *
 * GET /api/sheets/connect
 * Redirects to Google OAuth consent screen
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { google } from 'googleapis';
import { authOptions } from '@/lib/auth';

// OAuth scopes required for Google Sheets
const SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly', // Read Google Sheets
  'https://www.googleapis.com/auth/drive.readonly', // Read Google Drive for file access
];

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in first' },
        { status: 401 }
      );
    }

    const userId = session.user.id as string;

    // Validate environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('Missing Google OAuth environment variables');
      return NextResponse.json(
        { error: 'OAuth configuration is missing' },
        { status: 500 }
      );
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request refresh token for offline access
      scope: SHEETS_SCOPES,
      prompt: 'consent', // Force consent screen to get refresh token
      state: Buffer.from(JSON.stringify({ userId })).toString('base64'), // Store user ID in state
    });

    console.log(`✓ OAuth redirect initiated for user: ${userId}`);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
