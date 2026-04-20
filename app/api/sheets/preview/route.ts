/**
 * Google Sheets Preview Endpoint
 * Lists pending rows from a connected Google Sheet that can be synced
 *
 * GET /api/sheets/preview?sheetId=...&sheetName=...
 * Returns: { rows: ThumbnailRow[], totalRows: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { decodeAndDecrypt, getEncryptionKeyFromEnv } from '@/lib/crypto';
import { authOptions } from '@/lib/auth';

export interface ThumbnailRow {
  rowIndex: number;
  channelId: string;
  archetypeId: string;
  videoTopic: string;
  thumbnailText: string;
  customPrompt?: string;
}

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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const sheetId = searchParams.get('sheetId');
    const sheetName = searchParams.get('sheetName');

    if (!sheetId || !sheetName) {
      return NextResponse.json(
        { error: 'Missing sheetId or sheetName' },
        { status: 400 }
      );
    }

    // Find Google Sheets connection
    const connection = await prisma.googleSheetsConnection.findUnique({
      where: { userId },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Google Sheets not connected' },
        { status: 401 }
      );
    }

    // Decrypt access token
    const encryptionKey = getEncryptionKeyFromEnv();
    const accessToken = decodeAndDecrypt(connection.accessToken, encryptionKey);

    // Create Sheets API client
    const sheets = google.sheets({ version: 'v4' });
    const authClient = new google.auth.OAuth2();
    authClient.setCredentials({ access_token: accessToken });

    console.log(`📊 Fetching preview from sheet: ${sheetId} (${sheetName})`);

    // Read sheet data
    const response = await sheets.spreadsheets.values.get({
      auth: authClient,
      spreadsheetId: sheetId,
      range: `${sheetName}!A:F`, // Read columns A-F
    });

    const rows = response.data.values || [];

    if (rows.length === 0) {
      return NextResponse.json({
        rows: [],
        totalRows: 0,
        message: 'No data found in sheet',
      });
    }

    // Parse rows (skip header if present)
    const headerRow = rows[0];
    const isHeaderRow =
      headerRow &&
      headerRow[0] &&
      ['Channel', 'channelId', 'channel'].includes(headerRow[0]);

    const dataRows = isHeaderRow ? rows.slice(1) : rows;

    // Map rows to ThumbnailRow format
    const thumbnailRows: ThumbnailRow[] = dataRows
      .map((row, index) => {
        const actualIndex = isHeaderRow ? index + 2 : index + 1; // Row number in sheet

        // Skip empty rows
        if (!row || !row[0] || row.every((cell: string) => !cell || cell.trim() === '')) {
          return null;
        }

        return {
          rowIndex: actualIndex,
          channelId: row[0]?.trim() || '',
          archetypeId: row[1]?.trim() || '',
          videoTopic: row[2]?.trim() || '',
          thumbnailText: row[3]?.trim() || '',
          customPrompt: row[4]?.trim() || undefined,
        };
      })
      .filter((row): row is ThumbnailRow => row !== null);

    console.log(`✓ Preview loaded: ${thumbnailRows.length} rows from sheet`);

    return NextResponse.json({
      rows: thumbnailRows,
      totalRows: thumbnailRows.length,
      sheetId,
      sheetName,
    });
  } catch (error) {
    console.error('Sheet preview error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    // Check for token expiration
    if (errorMsg.includes('invalid_grant') || errorMsg.includes('Token has been revoked')) {
      return NextResponse.json(
        { error: 'Google Sheets token expired. Please reconnect.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: `Failed to preview sheet: ${errorMsg}` },
      { status: 500 }
    );
  }
}
