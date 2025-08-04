import { getNileAuthService } from '../lib/auth/nile-auth-service';

async function testSignUp() {
  const authService = getNileAuthService();
  
  try {
    console.log('Testing sign-up functionality...');
    
    const userData = {
      email: 'test@example.com',
      password: 'TestPassword123',
      firstName: 'Test',
      lastName: 'User'
    };
    
    console.log('Attempting sign-up with:', { email: userData.email, firstName: userData.firstName });
    
    const result = await authService.signUp(userData);
    
    console.log('Sign-up result:', {
      success: result.success,
      error: result.error,
      user: result.user ? { id: result.user.id, email: result.user.email } : null
    });
    
  } catch (error) {
    console.error('Sign-up test failed:', error);
  }
}

testSignUp(); 