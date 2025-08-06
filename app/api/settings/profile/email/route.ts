import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/auth/api-middleware';
import type { ChangeEmailRequest } from '@/types';

/**
 * PUT /api/settings/profile/email
 * Change user email address
 */
export const PUT = withApiAuth(async (request: NextRequest, context) => {
  try {
    const { user } = context;
    const emailData: ChangeEmailRequest = await request.json();

    // Basic validation
    if (!emailData.newEmail || !emailData.password) {
      return NextResponse.json(
        { success: false, error: 'New email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.newEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // TODO: In a real implementation, you would:
    // 1. Verify the current password
    // 2. Check if the new email is already in use
    // 3. Send a verification email to the new address
    // 4. Store the pending email change in the database
    // 5. Update the email only after verification

    console.log(`Email change requested for user ${user.id} from ${user.email} to ${emailData.newEmail}`);

    // Simulate email verification process
    return NextResponse.json({
      success: true,
      message: 'Verification email sent to new address',
      pendingEmail: emailData.newEmail,
    });

  } catch (error) {
    console.error('Email change error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initiate email change' },
      { status: 500 }
    );
  }
});