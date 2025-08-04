// Prisma-based Authentication Service

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import {
  NileAuthService,
  NileUser,
  NileUserCreateRequest,
  NileUserSignInRequest,
  NileAuthResponse,
  JWTPayload
} from '../../types/nile';

export class PrismaAuthService implements NileAuthService {
  private prisma: PrismaClient;
  private jwtSecret: string;
  private jwtExpiresIn: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  }

  async signUp(userData: NileUserCreateRequest): Promise<NileAuthResponse> {
    try {
      console.log('Starting sign up process for email:', userData.email);

      // Check if user already exists
      const existingUser = await this.prisma.users.findFirst({
        where: { email: userData.email }
      });

      if (existingUser) {
        console.log('User already exists:', existingUser.email);
        return {
          success: false,
          error: 'User with this email already exists'
        };
      }

      console.log('User does not exist, proceeding with creation');

      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);
      console.log('Password hashed successfully');

      // Generate tenant ID (using UUID for multi-tenancy)
      const tenantId = crypto.randomUUID();
      console.log('Generated tenant ID:', tenantId);

      // Create user in database
      console.log('Creating user in database with data:', {
        email: userData.email,
        name: userData.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : null,
        given_name: userData.firstName || null,
        family_name: userData.lastName || null,
        password_hash: '[HIDDEN]'
      });

      const user = await this.prisma.users.create({
        data: {
          email: userData.email,
          name: userData.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : null,
          given_name: userData.firstName || null,
          family_name: userData.lastName || null,
          password_hash: hashedPassword,
        }
      });

      console.log('User created successfully:', { id: user.id, email: user.email });

      // Convert to NileUser format
      const nileUser: NileUser = {
        id: user.id,
        email: user.email || '',
        firstName: user.given_name || undefined,
        lastName: user.family_name || undefined,
        phone: undefined, // Not available in current schema
        company: undefined, // Not available in current schema
        tenantId: tenantId,
        createdAt: user.created,
        updatedAt: user.updated
      };

      console.log('Converted to NileUser format:', nileUser);

      // Generate JWT token
      const token = this.generateToken(nileUser);
      console.log('JWT token generated');

      // Create session
      await this.createSession(user.id, tenantId, token);
      console.log('Session created');

      const response = {
        success: true,
        user: nileUser,
        token
      };

      console.log('Sign up completed successfully, returning response with user:', response.user);
      return response;

    } catch (error) {
      console.error('Sign up error:', error);
      return {
        success: false,
        error: 'Internal server error during sign up'
      };
    }
  }

  async signIn(credentials: NileUserSignInRequest): Promise<NileAuthResponse> {
    try {
      console.log('Starting sign in process for email:', credentials.email);

      // Find user by email
      const user = await this.prisma.users.findFirst({
        where: { email: credentials.email }
      });

      if (!user) {
        console.log('User not found for email:', credentials.email);
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      console.log('User found:', { id: user.id, email: user.email });

      // Verify password
      const isValidPassword = await this.verifyPassword(credentials.password, user.password_hash || '');
      if (!isValidPassword) {
        console.log('Invalid password for user:', user.email);
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      console.log('Password verified successfully');

      // Get or create tenant ID for the user
      let userTenantId = '';

      // For now, we'll use the user ID as tenant ID for single-tenant per user setup
      // In a true multi-tenant system, you'd query a tenant_users table
      userTenantId = user.id;

      // Convert to NileUser format
      const nileUser: NileUser = {
        id: user.id,
        email: user.email || '',
        firstName: user.given_name || undefined,
        lastName: user.family_name || undefined,
        phone: undefined, // Not available in current schema
        company: undefined, // Not available in current schema
        tenantId: userTenantId,
        createdAt: user.created,
        updatedAt: user.updated
      };

      console.log('Converted to NileUser format:', nileUser);

      // Generate JWT token
      const token = this.generateToken(nileUser);
      console.log('JWT token generated');

      // Create session
      await this.createSession(user.id, userTenantId, token);
      console.log('Session created');

      const response = {
        success: true,
        user: nileUser,
        token
      };

      console.log('Sign in completed successfully, returning response with user:', response.user);
      return response;

    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: 'Internal server error during sign in'
      };
    }
  }

  async signOut(token: string): Promise<void> {
    try {
      // For now, we'll just verify the token is valid
      // In a production environment, you'd want to store sessions in a database
      const payload = this.verifyToken(token);
      if (!payload) {
        console.log('Invalid token during sign out');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      // Don't throw error for sign out - just log it
    }
  }

  async getCurrentUser(token: string): Promise<NileUser | null> {
    try {
      // Verify token and get user
      const payload = this.verifyToken(token);
      if (!payload) {
        return null;
      }

      // Get user from database
      const user = await this.prisma.users.findFirst({
        where: { id: payload.userId }
      });

      if (!user) {
        return null;
      }

      // Get tenant ID for the user (using user ID as tenant ID for single-tenant per user setup)
      const userTenantId = user.id;

      // Convert to NileUser format
      const nileUser: NileUser = {
        id: user.id,
        email: user.email || '',
        firstName: user.given_name || undefined,
        lastName: user.family_name || undefined,
        phone: undefined, // Not available in current schema
        company: undefined, // Not available in current schema
        tenantId: userTenantId,
        createdAt: user.created,
        updatedAt: user.updated
      };

      return nileUser;

    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async validateSession(token: string): Promise<boolean> {
    try {
      // Verify JWT token
      const payload = this.verifyToken(token);
      if (!payload) {
        return false;
      }

      // Check if user exists in database
      const user = await this.prisma.users.findFirst({
        where: { id: payload.userId }
      });

      return !!user;

    } catch (error) {
      console.error('Validate session error:', error);
      return false;
    }
  }

  async refreshToken(token: string): Promise<string> {
    try {
      // Verify current token
      const payload = this.verifyToken(token);
      if (!payload) {
        throw new Error('Invalid token');
      }

      // Get user
      const user = await this.getCurrentUser(token);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new token
      const newToken = this.generateToken(user);

      // For now, we'll just return the new token without updating a session table
      // In a production environment, you'd want to store sessions in a database

      return newToken;

    } catch (error) {
      console.error('Refresh token error:', error);
      throw new Error('Failed to refresh token');
    }
  }

  // Private helper methods
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private generateToken(user: NileUser): string {
    const payload: JWTPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.parseExpiresIn(this.jwtExpiresIn)
    };

    return jwt.sign(payload, this.jwtSecret);
  }

  private verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, this.jwtSecret) as JWTPayload;
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  private parseExpiresIn(expiresIn: string): number {
    // Parse expressions like '7d', '24h', '60m', '3600s'
    const match = expiresIn.match(/^(\d+)([dhms])$/);
    if (!match) {
      return 7 * 24 * 60 * 60; // Default to 7 days
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'd': return value * 24 * 60 * 60;
      case 'h': return value * 60 * 60;
      case 'm': return value * 60;
      case 's': return value;
      default: return 7 * 24 * 60 * 60;
    }
  }

  private getTokenExpiration(): Date {
    const expirationSeconds = this.parseExpiresIn(this.jwtExpiresIn);
    return new Date(Date.now() + expirationSeconds * 1000);
  }

  private async createSession(userId: string, tenantId: string, token: string): Promise<void> {
    try {
      // For now, we'll just log the session creation
      // In a production environment, you'd want to store sessions in a database
      console.log('Session created for user:', userId, 'with token:', token.substring(0, 20) + '...');
    } catch (error) {
      console.error('Create session error:', error);
      // Don't throw error for session creation - just log it
    }
  }
}

// Singleton instance
let authServiceInstance: PrismaAuthService | null = null;

export function getNileAuthService(): PrismaAuthService {
  if (!authServiceInstance) {
    authServiceInstance = new PrismaAuthService();
  }
  return authServiceInstance;
}