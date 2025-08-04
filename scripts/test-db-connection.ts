import { PrismaClient } from '@prisma/client';
import { getNileAuthService } from '../lib/auth/nile-auth-service';

async function testDatabaseConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Database connection successful:', result);
    
    // Test users table
    const users = await prisma.users.findMany({ take: 5 });
    console.log('Users table accessible, found', users.length, 'users');
    
    // Test auth service
    const authService = getNileAuthService();
    console.log('Auth service initialized successfully');
    
    // Test password hashing
    const testPassword = 'TestPassword123';
    const hashedPassword = await authService['hashPassword'](testPassword);
    console.log('Password hashing works, hash length:', hashedPassword.length);
    
    // Test password verification
    const isValid = await authService['verifyPassword'](testPassword, hashedPassword);
    console.log('Password verification works:', isValid);
    
  } catch (error) {
    console.error('Database connection test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection(); 