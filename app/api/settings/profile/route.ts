import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/auth/api-middleware';
import type { ProfileSettings, UpdateProfileSettingsRequest } from '@/types';

/**
 * GET /api/settings/profile
 * Get user profile settings
 */
export const GET = withApiAuth(async (request: NextRequest, context) => {
  try {
    const { user } = context;

    // TODO: Implement actual profile settings retrieval
    // For now, return mock data
    const profileSettings: ProfileSettings = {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email,
      phone: undefined,
      profilePictureUrl: undefined,
      emailVerified: true,
    };

    return NextResponse.json({
      success: true,
      data: profileSettings,
    });

  } catch (error) {
    console.error('Profile settings fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile settings' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/settings/profile
 * Update user profile settings
 */
export const PUT = withApiAuth(async (request: NextRequest, context) => {
  try {
    const { user } = context;
    const updates: UpdateProfileSettingsRequest = await request.json();

    // TODO: Implement actual profile settings update
    // For now, return the updated data
    const updatedProfile: ProfileSettings = {
      firstName: updates.firstName ?? user.firstName ?? '',
      lastName: updates.lastName ?? user.lastName ?? '',
      email: user.email,
      phone: updates.phone,
      profilePictureUrl: updates.profilePictureUrl,
      emailVerified: true,
    };

    console.log(`Profile updated for user ${user.id}:`, updates);

    return NextResponse.json({
      success: true,
      data: updatedProfile,
    });

  } catch (error) {
    console.error('Profile settings update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile settings' },
      { status: 500 }
    );
  }
});