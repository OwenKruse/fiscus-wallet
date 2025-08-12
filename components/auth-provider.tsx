"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/use-api';
import { AuthResponse, AuthSignInRequest, AuthSignUpRequest } from '../types';
import { errorUtils } from '../lib/error-handling';

// Authentication context interface
interface AuthContextType {
  user: AuthResponse['user'] | null;
  subscription: {
    id: string;
    tier: string;
    status: string;
    billingCycle: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (credentials: AuthSignInRequest) => Promise<void>;
  signUp: (userData: AuthSignUpRequest) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  refreshSubscription: () => Promise<void>;
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
  const [subscription, setSubscription] = useState<AuthContextType['subscription']>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  // Clear error function
  const clearError = () => setError(null);

  // Fetch user subscription
  const fetchSubscription = async () => {
    if (!user || !isAuthenticated) {
      setSubscription(null);
      return;
    }

    try {
      setSubscriptionLoading(true);
      const response = await fetch('/api/subscriptions', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSubscription({
            id: data.data.id,
            tier: data.data.tier,
            status: data.data.status,
            billingCycle: data.data.billingCycle,
            currentPeriodEnd: data.data.currentPeriodEnd,
            cancelAtPeriodEnd: data.data.cancelAtPeriodEnd,
          });
        } else {
          // User doesn't have a subscription yet, set to null
          setSubscription(null);
        }
      } else {
        console.error('Failed to fetch subscription:', response.status);
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription(null);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // Refresh subscription function
  const refreshSubscription = async () => {
    await fetchSubscription();
  };

  // Fetch subscription when user changes
  useEffect(() => {
    fetchSubscription();
  }, [user, isAuthenticated]);

  // Handle sign in with error handling
  const handleSignIn = async (credentials: AuthSignInRequest) => {
    try {
      setError(null);
      await signIn(credentials);
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
    subscription,
    isAuthenticated,
    isLoading: isLoading || subscriptionLoading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    error,
    clearError,
    refreshSubscription,
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