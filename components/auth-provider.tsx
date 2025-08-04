"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/use-api';
import { AuthResponse, AuthSignInRequest, AuthSignUpRequest } from '../types';
import { errorUtils } from '../lib/error-handling';

// Authentication context interface
interface AuthContextType {
  user: AuthResponse['user'] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (credentials: AuthSignInRequest) => Promise<void>;
  signUp: (userData: AuthSignUpRequest) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  signInState: {
    loading: string;
    error: string | null;
    isLoading: boolean;
    isSuccess: boolean;
  };
  signUpState: {
    loading: string;
    error: string | null;
    isLoading: boolean;
    isSuccess: boolean;
  };
}

// Create authentication context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Authentication provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, signIn, signUp, signOut, signInState, signUpState } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Clear error function
  const clearError = () => setError(null);

  // Handle sign in with error handling
  const handleSignIn = async (credentials: AuthSignInRequest) => {
    try {
      setError(null);
      console.log('Attempting sign in with email:', credentials.email);
      await signIn(credentials);
      console.log('Sign in successful');
      router.push('/'); // Redirect to dashboard after successful sign in
    } catch (err) {
      console.error('Sign in error details:', err);
      
      // Handle specific error cases
      let errorMessage = 'An error occurred during sign in. Please try again.';
      
      if (err instanceof Error) {
        if (err.message.includes('Invalid email or password')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (err.message.includes('validation')) {
          errorMessage = 'Please check your input and try again.';
        } else if (err.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = errorUtils.handler.getErrorMessage(err);
        }
      } else {
        errorMessage = errorUtils.handler.getErrorMessage(err);
      }
      
      setError(errorMessage);
      errorUtils.logger.logError(err, { operation: 'signIn', credentials: { email: credentials.email } });
      throw err;
    }
  };

  // Handle sign up with error handling
  const handleSignUp = async (userData: AuthSignUpRequest) => {
    try {
      setError(null);
      console.log('Attempting sign up with data:', { email: userData.email, firstName: userData.firstName });
      await signUp(userData);
      console.log('Sign up successful');
      router.push('/'); // Redirect to dashboard after successful sign up
    } catch (err) {
      console.error('Sign up error details:', err);
      
      // Handle specific error cases
      let errorMessage = 'An error occurred during sign up. Please try again.';
      
      if (err instanceof Error) {
        if (err.message.includes('already exists')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (err.message.includes('validation')) {
          errorMessage = 'Please check your input and try again.';
        } else if (err.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = errorUtils.handler.getErrorMessage(err);
        }
      } else {
        errorMessage = errorUtils.handler.getErrorMessage(err);
      }
      
      setError(errorMessage);
      errorUtils.logger.logError(err, { operation: 'signUp', userData: { email: userData.email } });
      throw err;
    }
  };

  // Handle sign out with error handling
  const handleSignOut = async () => {
    try {
      setError(null);
      await signOut();
      router.push('/auth/signin'); // Redirect to sign in page after sign out
    } catch (err) {
      const errorMessage = errorUtils.handler.getErrorMessage(err);
      setError(errorMessage);
      errorUtils.logger.logError(err, { operation: 'signOut' });
      // Even if sign out fails, redirect to sign in page
      router.push('/auth/signin');
    }
  };

  // Context value
  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    error,
    clearError,
    signInState,
    signUpState,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use authentication context
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
} 