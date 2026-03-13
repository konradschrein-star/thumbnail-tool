import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiAuth } from '@/lib/api-auth';

interface CustomLanguage {
  code: string;
  label: string;
}

interface UserPreferences {
  customLanguages?: CustomLanguage[];
}

/**
 * GET /api/user/preferences
 *
 * Fetches the authenticated user's preferences (custom languages, etc.)
 */
export async function GET(request: NextRequest) {
  const authResult = await getApiAuth(request as any);

  if (authResult.error || !authResult.user?.id) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: authResult.status || 401 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.id },
      select: { preferences: true }
    });

    // Return default empty preferences if none exist
    const preferences: UserPreferences = (user?.preferences as UserPreferences) || {
      customLanguages: []
    };

    return NextResponse.json({ preferences }, { status: 200 });
  } catch (error: any) {
    console.error('Failed to fetch user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/preferences
 *
 * Updates the authenticated user's preferences
 *
 * Request body:
 * {
 *   "customLanguages": [{ "code": "Klingon", "label": "Klingon" }]
 * }
 */
export async function PATCH(request: NextRequest) {
  const authResult = await getApiAuth(request as any);

  if (authResult.error || !authResult.user?.id) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: authResult.status || 401 }
    );
  }

  try {
    const body = await request.json();
    const { customLanguages } = body;

    // Validation: customLanguages must be an array
    if (customLanguages !== undefined && !Array.isArray(customLanguages)) {
      return NextResponse.json(
        { error: 'customLanguages must be an array' },
        { status: 400 }
      );
    }

    // Validate each language object
    if (customLanguages) {
      for (const lang of customLanguages) {
        // Must have code and label
        if (!lang.code || !lang.label) {
          return NextResponse.json(
            { error: 'Each language must have "code" and "label" fields' },
            { status: 400 }
          );
        }

        // Must be strings
        if (typeof lang.code !== 'string' || typeof lang.label !== 'string') {
          return NextResponse.json(
            { error: 'Language code and label must be strings' },
            { status: 400 }
          );
        }

        // Length limits
        if (lang.code.length > 50 || lang.label.length > 50) {
          return NextResponse.json(
            { error: 'Language code/label must be 50 characters or less' },
            { status: 400 }
          );
        }

        // No empty strings after trim
        if (lang.code.trim().length === 0 || lang.label.trim().length === 0) {
          return NextResponse.json(
            { error: 'Language code and label cannot be empty' },
            { status: 400 }
          );
        }
      }

      // Limit total custom languages
      if (customLanguages.length > 20) {
        return NextResponse.json(
          { error: 'Maximum 20 custom languages allowed per user' },
          { status: 400 }
        );
      }

      // Check for duplicates
      const codes = customLanguages.map((l: CustomLanguage) => l.code.toLowerCase());
      const uniqueCodes = new Set(codes);
      if (codes.length !== uniqueCodes.size) {
        return NextResponse.json(
          { error: 'Duplicate language codes are not allowed' },
          { status: 400 }
        );
      }
    }

    // Build new preferences object
    const newPreferences: UserPreferences = {
      customLanguages: customLanguages || []
    };

    // Update user preferences
    const updatedUser = await prisma.user.update({
      where: { id: authResult.user.id },
      data: { preferences: newPreferences as any }
    });

    return NextResponse.json(
      { preferences: updatedUser.preferences },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Failed to update user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
