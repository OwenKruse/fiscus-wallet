import { NextRequest } from 'next/server';
import { signUpHandler } from '../app/api/auth/signup/route';

async function testSignUpRoute() {
  try {
    console.log('Testing sign-up route handler directly...');
    
    // Create a mock request
    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test2@example.com',
        password: 'TestPassword123',
        firstName: 'Test',
        lastName: 'User'
      })
    });
    
    console.log('Calling sign-up handler...');
    const response = await signUpHandler(request);
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseBody = await response.json();
    console.log('Response body:', responseBody);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSignUpRoute(); 