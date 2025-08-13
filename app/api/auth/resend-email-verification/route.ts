import { NextRequest, NextResponse } from 'next/server';
import { getNileAuthService } from '@/lib/auth/nile-auth-service';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_EMAIL',
            message: 'Email is required',
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      );
    }

    const authService = getNileAuthService();
    await authService.resendEmailVerification(email);

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully'
    });

  } catch (error) {
    console.error('Resend email verification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to resend verification email',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}