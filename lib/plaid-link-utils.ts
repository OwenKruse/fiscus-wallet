import { useCallback, useState } from 'react';
import { usePlaid } from '../hooks/use-api';
import { PlaidLinkTokenResponse, PlaidExchangeTokenRequest } from '../types';

// Plaid Link configuration
export interface PlaidLinkConfig {
  token: string;
  onSuccess: (publicToken: string, metadata: any) => void;
  onExit?: (error: any, metadata: any) => void;
  onLoad?: () => void;
  onEvent?: (eventName: string, metadata: any) => void;
}

// Hook for managing Plaid Link integration
export function usePlaidLink() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLinkReady, setIsLinkReady] = useState(false);
  const { createLinkToken, exchangeToken, createLinkTokenState, exchangeTokenState } = usePlaid();

  // Initialize Plaid Link
  const initializeLink = useCallback(async () => {
    try {
      const response = await createLinkToken();
      setLinkToken(response.linkToken);
      setIsLinkReady(true);
      return response;
    } catch (error) {
      setIsLinkReady(false);
      throw error;
    }
  }, [createLinkToken]);

  // Handle successful account connection
  const handleSuccess = useCallback(async (publicToken: string, metadata: any) => {
    try {
      const request: PlaidExchangeTokenRequest = {
        publicToken,
        userId: metadata.user_id || '',
      };
      
      const result = await exchangeToken(request);
      return result;
    } catch (error) {
      throw error;
    }
  }, [exchangeToken]);

  // Handle Plaid Link exit
  const handleExit = useCallback((error: any, metadata: any) => {
    if (error) {
      console.error('Plaid Link exit with error:', error);
    }
    setIsLinkReady(false);
    setLinkToken(null);
  }, []);

  return {
    linkToken,
    isLinkReady,
    initializeLink,
    handleSuccess,
    handleExit,
    loading: createLinkTokenState.loading,
    error: createLinkTokenState.error,
    isIdle: createLinkTokenState.isIdle,
    isLoading: createLinkTokenState.isLoading,
    isSuccess: createLinkTokenState.isSuccess,
    isError: createLinkTokenState.isError,
  };
}

// Utility functions for Plaid Link integration
export const plaidLinkUtils = {
  // Create Plaid Link configuration
  createLinkConfig(
    token: string,
    onSuccess: (publicToken: string, metadata: any) => void,
    onExit?: (error: any, metadata: any) => void
  ): PlaidLinkConfig {
    return {
      token,
      onSuccess,
      onExit,
      onLoad: () => console.log('Plaid Link loaded'),
      onEvent: (eventName, metadata) => {
        console.log('Plaid Link event:', eventName, metadata);
      },
    };
  },

  // Validate Plaid Link token
  validateLinkToken(token: string): boolean {
    return typeof token === 'string' && token.length > 0;
  },

  // Format institution name for display
  formatInstitutionName(name: string): string {
    if (!name) return 'Unknown Institution';
    return name.replace(/\s+/g, ' ').trim();
  },

  // Get account type display name
  getAccountTypeDisplay(type: string, subtype?: string): string {
    const typeMap: Record<string, string> = {
      'depository': 'Bank Account',
      'credit': 'Credit Card',
      'loan': 'Loan',
      'investment': 'Investment',
      'other': 'Other',
    };

    const displayType = typeMap[type] || type;
    
    if (subtype) {
      const subtypeMap: Record<string, string> = {
        'checking': 'Checking',
        'savings': 'Savings',
        'credit card': 'Credit Card',
        'mortgage': 'Mortgage',
        'auto': 'Auto Loan',
        'student': 'Student Loan',
        'personal': 'Personal Loan',
      };
      
      const displaySubtype = subtypeMap[subtype] || subtype;
      return `${displayType} - ${displaySubtype}`;
    }

    return displayType;
  },

  // Format account balance
  formatBalance(balance: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(balance / 100); // Plaid returns amounts in cents
  },

  // Get account status color
  getAccountStatusColor(status: string): string {
    const statusColors: Record<string, string> = {
      'active': 'text-green-600',
      'pending': 'text-yellow-600',
      'error': 'text-red-600',
      'disconnected': 'text-gray-600',
    };
    
    return statusColors[status] || 'text-gray-600';
  },
};

// Error handling utilities for Plaid Link
export const plaidErrorUtils = {
  // Get user-friendly error message for Plaid errors
  getErrorMessage(error: any): string {
    if (!error) return 'An unknown error occurred';

    // Handle Plaid-specific error codes
    switch (error.error_code) {
      case 'INVALID_LINK_TOKEN':
        return 'Invalid link token. Please try again.';
      case 'INVALID_PUBLIC_TOKEN':
        return 'Invalid public token. Please try again.';
      case 'ITEM_LOGIN_REQUIRED':
        return 'Please log in to your bank account again.';
      case 'ITEM_ERROR':
        return 'There was an error with your bank account. Please try again.';
      case 'INSTITUTION_DOWN':
        return 'Your bank is currently unavailable. Please try again later.';
      case 'RATE_LIMIT_EXCEEDED':
        return 'Too many requests. Please try again later.';
      default:
        return error.display_message || error.error_message || 'An error occurred while connecting your account.';
    }
  },

  // Check if error is retryable
  isRetryableError(error: any): boolean {
    const retryableCodes = [
      'INSTITUTION_DOWN',
      'RATE_LIMIT_EXCEEDED',
      'ITEM_ERROR',
    ];
    
    return retryableCodes.includes(error.error_code);
  },

  // Get retry delay based on error
  getRetryDelay(error: any): number {
    switch (error.error_code) {
      case 'RATE_LIMIT_EXCEEDED':
        return 60000; // 1 minute
      case 'INSTITUTION_DOWN':
        return 300000; // 5 minutes
      default:
        return 5000; // 5 seconds
    }
  },
}; 